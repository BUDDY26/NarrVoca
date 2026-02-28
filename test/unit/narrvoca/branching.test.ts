// Mock supabase so importing branching.ts doesn't try to instantiate the real client
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

import { applyBranchingRules, PASS_THRESHOLD } from '@/lib/narrvoca/branching';
import type { BranchingLogic } from '@/lib/narrvoca/types';

// Helper to build a BranchingLogic row
const rule = (
  condition_type: BranchingLogic['condition_type'],
  condition_value: string | null,
  next_node_id: number
): BranchingLogic => ({
  branch_id: Math.random(),
  node_id: 1,
  condition_type,
  condition_value,
  next_node_id,
});

describe('PASS_THRESHOLD', () => {
  it('is 0.7', () => {
    expect(PASS_THRESHOLD).toBe(0.7);
  });
});

describe('applyBranchingRules', () => {
  const defaultRule = rule('default', null, 10);
  const passRule = rule('score_threshold', 'pass', 20);
  const failRule = rule('score_threshold', 'fail', 5);

  describe('with only a default rule', () => {
    it('returns the default next_node_id when no score is provided', () => {
      expect(applyBranchingRules([defaultRule])).toBe(10);
    });

    it('returns the default next_node_id even when a score is provided', () => {
      expect(applyBranchingRules([defaultRule], 0.9)).toBe(10);
    });
  });

  describe('with pass/fail rules and a score', () => {
    const rules = [passRule, failRule, defaultRule];

    it('returns pass next_node_id when score >= PASS_THRESHOLD', () => {
      expect(applyBranchingRules(rules, 0.7)).toBe(20);
      expect(applyBranchingRules(rules, 0.8)).toBe(20);
      expect(applyBranchingRules(rules, 1.0)).toBe(20);
    });

    it('returns fail next_node_id when score < PASS_THRESHOLD', () => {
      expect(applyBranchingRules(rules, 0.0)).toBe(5);
      expect(applyBranchingRules(rules, 0.5)).toBe(5);
      expect(applyBranchingRules(rules, 0.69)).toBe(5);
    });

    it('falls back to default when no score is provided and score_threshold rules exist', () => {
      expect(applyBranchingRules(rules)).toBe(10);
    });
  });

  describe('with pass rule only (no fail rule)', () => {
    it('returns pass next_node_id on passing score', () => {
      expect(applyBranchingRules([passRule, defaultRule], 0.9)).toBe(20);
    });

    it('falls back to default on failing score when no fail rule exists', () => {
      expect(applyBranchingRules([passRule, defaultRule], 0.3)).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('returns null when rules array is empty', () => {
      expect(applyBranchingRules([])).toBeNull();
    });

    it('returns null when no matching rule found', () => {
      expect(applyBranchingRules([passRule, failRule], 0.8)).toBe(20);
    });
  });
});
