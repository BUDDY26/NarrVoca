/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNarrativeReader } from '@/hooks/narrvoca/useNarrativeReader';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
  },
}));

jest.mock('@/lib/narrvoca/queries', () => ({
  getStories: jest.fn(),
  getFullStory: jest.fn(),
  getNodeVocab: jest.fn(),
}));

jest.mock('@/lib/narrvoca/branching', () => ({
  resolveBranch: jest.fn(),
}));

import { supabase } from '@/lib/supabase';
import { getStories, getFullStory, getNodeVocab } from '@/lib/narrvoca/queries';
import { resolveBranch } from '@/lib/narrvoca/branching';

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockGetStories = getStories as jest.Mock;
const mockGetFullStory = getFullStory as jest.Mock;
const mockGetNodeVocab = getNodeVocab as jest.Mock;
const mockResolveBranch = resolveBranch as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const SESSION = { user: { id: 'uid-123' }, access_token: 'test-access-token' };

const STORIES = [
  { story_id: 1, title: 'En el Mercado', target_language: 'es', difficulty_level: 'beginner', genre: null, created_at: '' },
];

const FULL_STORY = {
  story: STORIES[0],
  nodes: [
    { node_id: 10, story_id: 1, sequence_order: 1, is_checkpoint: false, context_description: null, texts: [] },
    { node_id: 11, story_id: 1, sequence_order: 2, is_checkpoint: true,  context_description: null, texts: [] },
    { node_id: 12, story_id: 1, sequence_order: 3, is_checkpoint: false, context_description: null, texts: [] },
  ],
};

// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: SESSION } });
  mockGetStories.mockResolvedValue(STORIES);
  mockGetFullStory.mockResolvedValue(FULL_STORY);
  mockGetNodeVocab.mockResolvedValue([]);
  mockResolveBranch.mockResolvedValue(11);
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ accuracy_score: 0.8, feedback: 'Good work!' }),
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function mountAndWait() {
  const { result } = renderHook(() => useNarrativeReader());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

async function mountWithStory() {
  const result = await mountAndWait();
  await act(async () => { await result.current.selectStory(1); });
  return result;
}

async function mountAtCheckpoint() {
  // Loads story, advances to checkpoint (node index 1, is_checkpoint=true)
  const result = await mountWithStory();
  mockResolveBranch.mockResolvedValue(11); // node_id 11 → index 1
  await act(async () => { await result.current.handleContinue(); });
  act(() => { result.current.setUserInput('Hola mundo'); });
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('initialisation', () => {
  it('redirects to /login when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderHook(() => useNarrativeReader());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'));
  });

  it('loads stories, sets uid, and clears loading when session exists', async () => {
    const result = await mountAndWait();
    expect(result.current.uid).toBe('uid-123');
    expect(result.current.stories).toEqual(STORIES);
    expect(result.current.isLoading).toBe(false);
  });

  it('starts with no fullStory and nodeIndex 0', async () => {
    const result = await mountAndWait();
    expect(result.current.fullStory).toBeNull();
    expect(result.current.nodeIndex).toBe(0);
  });
});

describe('selectStory', () => {
  it('loads the full story and resets to node 0', async () => {
    const result = await mountWithStory();
    expect(mockGetFullStory).toHaveBeenCalledWith(1);
    expect(result.current.fullStory).toEqual(FULL_STORY);
    expect(result.current.nodeIndex).toBe(0);
  });

  it('sets currentNode to first node after selection', async () => {
    const result = await mountWithStory();
    expect(result.current.currentNode).toEqual(FULL_STORY.nodes[0]);
  });

  it('sets isCheckpoint correctly for first node (non-checkpoint)', async () => {
    const result = await mountWithStory();
    expect(result.current.isCheckpoint).toBe(false);
  });

  it('clears isComplete on new story selection', async () => {
    const result = await mountWithStory();
    // Force complete
    mockResolveBranch.mockResolvedValue(null);
    await act(async () => { await result.current.handleContinue(); });
    expect(result.current.isComplete).toBe(true);
    // Select a new story — should reset
    mockGetFullStory.mockResolvedValue(FULL_STORY);
    await act(async () => { await result.current.selectStory(1); });
    expect(result.current.isComplete).toBe(false);
  });
});

describe('handleContinue', () => {
  it('calls update-progress API with correct body', async () => {
    const result = await mountWithStory();
    await act(async () => { await result.current.handleContinue(); });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/narrvoca/update-progress',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"node_id":10'),
      })
    );
  });

  it('advances to the node returned by resolveBranch', async () => {
    mockResolveBranch.mockResolvedValue(11); // node_id 11 is at index 1
    const result = await mountWithStory();
    await act(async () => { await result.current.handleContinue(); });
    expect(result.current.nodeIndex).toBe(1);
  });

  it('sets isComplete when resolveBranch returns null', async () => {
    mockResolveBranch.mockResolvedValue(null);
    const result = await mountWithStory();
    await act(async () => { await result.current.handleContinue(); });
    expect(result.current.isComplete).toBe(true);
  });

  it('sets isComplete when resolveBranch returns an unknown node_id', async () => {
    mockResolveBranch.mockResolvedValue(999);
    const result = await mountWithStory();
    await act(async () => { await result.current.handleContinue(); });
    expect(result.current.isComplete).toBe(true);
  });
});

describe('handleSubmit', () => {
  it('calls log-interaction API', async () => {
    const result = await mountAtCheckpoint();
    mockResolveBranch.mockResolvedValue(12);
    await act(async () => { await result.current.handleSubmit(); });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/narrvoca/log-interaction',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('calls update-progress API', async () => {
    const result = await mountAtCheckpoint();
    mockResolveBranch.mockResolvedValue(12);
    await act(async () => { await result.current.handleSubmit(); });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/narrvoca/update-progress',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('advances to next node after submit', async () => {
    const result = await mountAtCheckpoint();
    mockResolveBranch.mockResolvedValue(12); // node_id 12 is at index 2 — set AFTER mountAtCheckpoint
    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.nodeIndex).toBe(2);
  });

  it('clears userInput after a successful submit', async () => {
    const result = await mountAtCheckpoint();
    mockResolveBranch.mockResolvedValue(12);
    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.userInput).toBe('');
  });

  it('sets isComplete when resolveBranch returns null', async () => {
    const result = await mountAtCheckpoint();
    mockResolveBranch.mockResolvedValue(null); // set AFTER mountAtCheckpoint
    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.isComplete).toBe(true);
  });

  it('does nothing when userInput is empty', async () => {
    const result = await mountWithStory();
    // nodeIndex is 0, is_checkpoint is false — but we still guard on empty input
    act(() => { result.current.setUserInput(''); });
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;
    await act(async () => { await result.current.handleSubmit(); });
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsBefore);
  });

  it('calls grade-response API before logging the interaction', async () => {
    const result = await mountAtCheckpoint();
    mockResolveBranch.mockResolvedValue(12);
    await act(async () => { await result.current.handleSubmit(); });
    const calls = (global.fetch as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
    const gradeIdx = calls.findIndex((url: unknown) => url === '/api/narrvoca/grade-response');
    const logIdx = calls.findIndex((url: unknown) => url === '/api/narrvoca/log-interaction');
    expect(gradeIdx).toBeGreaterThanOrEqual(0);
    expect(gradeIdx).toBeLessThan(logIdx);
  });

  it('exposes feedback from the LLM response', async () => {
    const result = await mountAtCheckpoint();
    mockResolveBranch.mockResolvedValue(12);
    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.feedback).toBe('Good work!');
  });

  it('clears feedback when advancing to the next node', async () => {
    const result = await mountAtCheckpoint();
    mockResolveBranch.mockResolvedValue(12);
    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.feedback).toBe('Good work!');
    // Now advance past this checkpoint node
    mockResolveBranch.mockResolvedValue(null);
    await act(async () => { await result.current.handleContinue(); });
    expect(result.current.feedback).toBeNull();
  });

  it('calls sync-vocab API after checkpoint submit', async () => {
    const result = await mountAtCheckpoint();
    mockResolveBranch.mockResolvedValue(12);
    await act(async () => { await result.current.handleSubmit(); });
    const syncCalls = (global.fetch as jest.Mock).mock.calls.filter(
      (c: unknown[]) => c[0] === '/api/narrvoca/sync-vocab'
    );
    expect(syncCalls).toHaveLength(1);
  });

  it('calls update-mastery for each vocab word associated with the node', async () => {
    mockGetNodeVocab.mockResolvedValue([
      { node_id: 11, vocab_id: 5, is_target: true },
      { node_id: 11, vocab_id: 6, is_target: false },
    ]);
    const result = await mountAtCheckpoint();
    mockResolveBranch.mockResolvedValue(12);
    await act(async () => { await result.current.handleSubmit(); });
    const masteryCallUrls = (global.fetch as jest.Mock).mock.calls
      .filter((c: unknown[]) => c[0] === '/api/narrvoca/update-mastery');
    expect(masteryCallUrls).toHaveLength(2);
  });
});

describe('resetStory', () => {
  it('clears fullStory, resets nodeIndex, clears userInput, clears isComplete', async () => {
    const result = await mountWithStory();
    act(() => { result.current.setUserInput('some text'); });
    act(() => { result.current.resetStory(); });
    expect(result.current.fullStory).toBeNull();
    expect(result.current.nodeIndex).toBe(0);
    expect(result.current.userInput).toBe('');
    expect(result.current.isComplete).toBe(false);
  });
});
