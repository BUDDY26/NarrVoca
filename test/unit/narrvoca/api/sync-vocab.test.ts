import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/sync-vocab';

// ---------------------------------------------------------------------------
// Supabase mock
// Each table gets its own "from" chain so we can configure results per table.
// The mock factory references these via arrow functions (no TDZ).
// ---------------------------------------------------------------------------
const mockGetUser = jest.fn();

// node_vocabulary chain: .select().eq().eq() → awaitable
const mockNVEq2 = jest.fn();
const mockNVEq1 = jest.fn();
const mockNVSelect = jest.fn();

// vocabulary chain: .select().in().eq() → awaitable
const mockVocabEq = jest.fn();
const mockVocabIn = jest.fn();
const mockVocabSelect = jest.fn();

// vocab_words select chain: .select().eq().eq() → awaitable
const mockVWSelectEq2 = jest.fn();
const mockVWSelectEq1 = jest.fn();
const mockVWSelect = jest.fn();

// vocab_words insert chain: .insert() → awaitable
const mockVWInsert = jest.fn();

// Track how many times vocab_words.from() is called so we can return
// the select chain on call #1 and the insert chain on call #2.
let vwCallCount = 0;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'node_vocabulary') return { select: mockNVSelect };
      if (table === 'vocabulary') return { select: mockVocabSelect };
      // vocab_words — alternates between select and insert
      vwCallCount += 1;
      if (vwCallCount === 1) return { select: mockVWSelect };
      return { insert: mockVWInsert };
    },
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeReq(method: string, body?: object, withAuth = true): Partial<NextApiRequest> {
  return {
    method,
    body,
    headers: withAuth ? { authorization: 'Bearer test-token' } : {},
  };
}

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse;
}

/** Wire the happy-path chains end-to-end */
function setupHappyPath(
  vocabIds: number[],
  terms: string[],
  existingWords: string[],
) {
  // node_vocabulary: .select().eq().eq() → { data: [{vocab_id}...], error:null }
  mockNVEq2.mockResolvedValue({ data: vocabIds.map((v) => ({ vocab_id: v })), error: null });
  mockNVEq1.mockReturnValue({ eq: mockNVEq2 });
  mockNVSelect.mockReturnValue({ eq: mockNVEq1 });

  // vocabulary: .select().in().eq() → { data: [{term}...], error:null }
  mockVocabEq.mockResolvedValue({ data: terms.map((t) => ({ term: t })), error: null });
  mockVocabIn.mockReturnValue({ eq: mockVocabEq });
  mockVocabSelect.mockReturnValue({ in: mockVocabIn });

  // vocab_words SELECT: .select().eq().eq() → { data: [{word}...], error:null }
  mockVWSelectEq2.mockResolvedValue({ data: existingWords.map((w) => ({ word: w })), error: null });
  mockVWSelectEq1.mockReturnValue({ eq: mockVWSelectEq2 });
  mockVWSelect.mockReturnValue({ eq: mockVWSelectEq1 });

  // vocab_words INSERT: .insert([...]) → { error: null }
  mockVWInsert.mockResolvedValue({ error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  vwCallCount = 0;
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-uid' } } });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/narrvoca/sync-vocab', () => {
  const validBody = { uid: 'user-uuid', node_id: 11, target_language: 'es' };

  it('returns 405 for non-POST methods', async () => {
    const req = makeReq('GET', undefined, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 401 when no authorization token', async () => {
    const req = makeReq('POST', validBody, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = makeReq('POST', { uid: 'user-uuid' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with empty added/skipped when node has no target vocab', async () => {
    setupHappyPath([], [], []);
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ added: [], skipped: [] });
  });

  it('adds new words that are not in the user vocab list', async () => {
    setupHappyPath([5, 6], ['mercado', 'precio'], []);
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ added: ['mercado', 'precio'], skipped: [] });
  });

  it('skips words already in the user vocab list', async () => {
    setupHappyPath([5], ['mercado'], ['mercado']);
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ added: [], skipped: ['mercado'] });
  });

  it('adds new words and skips existing words in the same call', async () => {
    setupHappyPath([5, 6, 7], ['mercado', 'precio', 'dinero'], ['precio']);
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      added: expect.arrayContaining(['mercado', 'dinero']),
      skipped: ['precio'],
    });
    expect((res.json as jest.Mock).mock.calls[0][0].added).toHaveLength(2);
  });

  it('returns 500 when node_vocabulary query fails', async () => {
    mockNVEq2.mockResolvedValue({ data: null, error: { message: 'db error' } });
    mockNVEq1.mockReturnValue({ eq: mockNVEq2 });
    mockNVSelect.mockReturnValue({ eq: mockNVEq1 });
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 500 when vocab_words insert fails', async () => {
    setupHappyPath([5], ['mercado'], []);
    mockVWInsert.mockResolvedValue({ error: { message: 'insert error' } });
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
