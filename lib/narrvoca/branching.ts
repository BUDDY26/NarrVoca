import type { BranchingLogic } from '@/lib/narrvoca/types';
import { supabase } from '@/lib/supabase';

export const PASS_THRESHOLD = 0.7;

/**
 * Pure function — resolves the next node ID from a set of branching rules.
 * No DB calls; safe to unit-test without mocking.
 *
 * Priority order:
 *  1. score_threshold rules (pass/fail) — only evaluated when a score is supplied
 *  2. default rule — fallback
 *
 * Returns null if no matching rule exists.
 */
export function applyBranchingRules(
  rules: BranchingLogic[],
  score?: number
): number | null {
  if (rules.length === 0) return null;

  // Evaluate score_threshold rules only when a score is provided
  if (score !== undefined) {
    const isPassing = score >= PASS_THRESHOLD;
    const target = isPassing ? 'pass' : 'fail';
    const match = rules.find(
      (r) => r.condition_type === 'score_threshold' && r.condition_value === target
    );
    if (match) return match.next_node_id;
  }

  // Fall back to default
  const defaultRule = rules.find((r) => r.condition_type === 'default');
  return defaultRule ? defaultRule.next_node_id : null;
}

/**
 * DB-backed wrapper — fetches branching rules for a node then applies them.
 */
export async function resolveBranch(
  nodeId: number,
  score?: number
): Promise<number | null> {
  const { data, error } = await supabase
    .from('branching_logic')
    .select('*')
    .eq('node_id', nodeId);

  if (error) throw new Error(`resolveBranch: ${error.message}`);
  return applyBranchingRules((data as BranchingLogic[]) ?? [], score);
}
