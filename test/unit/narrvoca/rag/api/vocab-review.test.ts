import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/vocab-review';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockRetrieveChunks = jest.fn();
const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/narrvoca/rag', () => ({
  retrieveChunks: (...args: unknown[]) => mockRetrieveChunks(...args),
}));

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    embeddings: { create: jest.fn() },
  }))
);

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeReq(
  method: string,
  query: Record<string, string> = {},
  withAuth = true
): Partial<NextApiRequest> {
  return {
    method,
    query,
    headers: withAuth ? { authorization: 'Bearer test-token' } : {},
  };
}

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MASTERY_ROWS = [
  { vocab_id: 1, mastery_score: 0.4, next_review_at: '2026-01-01T00:00:00Z' },
  { vocab_id: 2, mastery_score: 0.7, next_review_at: '2026-01-01T00:00:00Z' },
];

const VOCAB_ROWS = [
  { vocab_id: 1, term: 'manzana', translation_en: 'apple', language_code: 'es' },
  { vocab_id: 2, term: 'plátano', translation_en: 'banana', language_code: 'es' },
];

const SAMPLE_CHUNKS = [
  { embedding_id: 1, source_type: 'node_text', source_id: 1, language_code: 'es',
    content_text: '¿Cuánto cuesta una manzana?', similarity: 0.93 },
];

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

/**
 * Two from() calls:
 *   1. user_vocab_mastery → select.eq.lte
 *   2. vocabulary         → select.in.eq
 */
function setupHappyPath(
  masteryData = MASTERY_ROWS,
  vocabData = VOCAB_ROWS
) {
  mockFrom.mockReset();

  // First from() — user_vocab_mastery: select(...).eq('uid',uid).lte('next_review_at',now)
  const mockLte = jest.fn().mockResolvedValue({ data: masteryData, error: null });
  const mockEqMastery = jest.fn().mockReturnValue({ lte: mockLte });
  const mockSelectMastery = jest.fn().mockReturnValue({ eq: mockEqMastery });

  // Second from() — vocabulary: select(...).in('vocab_id', ids).eq('language_code', lang)
  const mockEqVocab = jest.fn().mockResolvedValue({ data: vocabData, error: null });
  const mockIn = jest.fn().mockReturnValue({ eq: mockEqVocab });
  const mockSelectVocab = jest.fn().mockReturnValue({ in: mockIn });

  mockFrom
    .mockReturnValueOnce({ select: mockSelectMastery })
    .mockReturnValue({ select: mockSelectVocab });
}

function setupMasteryError() {
  mockFrom.mockReset();
  const mockLte = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
  const mockEq = jest.fn().mockReturnValue({ lte: mockLte });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
}

// ---------------------------------------------------------------------------

const VALID_QUERY = { uid: 'uid-123', target_language: 'es' };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-uid' } } });
  mockRetrieveChunks.mockResolvedValue(SAMPLE_CHUNKS);
  setupHappyPath();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/narrvoca/vocab-review', () => {
  it('returns 405 for non-GET methods', async () => {
    const req = makeReq('POST', VALID_QUERY, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 401 when no authorization header is present', async () => {
    const req = makeReq('GET', VALID_QUERY, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when the token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeReq('GET', VALID_QUERY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when uid is missing', async () => {
    const req = makeReq('GET', { target_language: 'es' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when target_language is missing', async () => {
    const req = makeReq('GET', { uid: 'uid-123' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with empty due_words when no words are due', async () => {
    setupHappyPath([], []);
    const req = makeReq('GET', VALID_QUERY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ due_words: [] });
  });

  it('returns 200 with due_words array when words are due', async () => {
    const req = makeReq('GET', VALID_QUERY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as jest.Mock).mock.calls[0][0] as { due_words: unknown[] };
    expect(payload.due_words).toHaveLength(2);
  });

  it('each due word includes vocab_id, term, translation_en, mastery_score, next_review_at', async () => {
    const req = makeReq('GET', VALID_QUERY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    const payload = (res.json as jest.Mock).mock.calls[0][0] as {
      due_words: Array<Record<string, unknown>>;
    };
    const word = payload.due_words[0];
    expect(word).toMatchObject({
      vocab_id: 1,
      term: 'manzana',
      translation_en: 'apple',
      mastery_score: 0.4,
    });
    expect(word.next_review_at).toBeDefined();
  });

  it('each due word includes context_chunks from RAG retrieval', async () => {
    const req = makeReq('GET', VALID_QUERY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    const payload = (res.json as jest.Mock).mock.calls[0][0] as {
      due_words: Array<{ context_chunks: string[] }>;
    };
    expect(payload.due_words[0].context_chunks).toContain('¿Cuánto cuesta una manzana?');
  });

  it('calls retrieveChunks once per due word', async () => {
    const req = makeReq('GET', VALID_QUERY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(mockRetrieveChunks).toHaveBeenCalledTimes(2);
  });

  it('calls retrieveChunks with the vocab term as the query', async () => {
    const req = makeReq('GET', VALID_QUERY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(mockRetrieveChunks).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'manzana',
      expect.objectContaining({ sourceType: 'node_text' })
    );
  });

  it('returns empty context_chunks when RAG retrieval throws', async () => {
    mockRetrieveChunks.mockRejectedValue(new Error('pgvector down'));
    const req = makeReq('GET', VALID_QUERY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as jest.Mock).mock.calls[0][0] as {
      due_words: Array<{ context_chunks: string[] }>;
    };
    // All words should still be returned with empty context
    expect(payload.due_words.every((w) => Array.isArray(w.context_chunks))).toBe(true);
  });

  it('returns 500 on mastery DB error', async () => {
    setupMasteryError();
    const req = makeReq('GET', VALID_QUERY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
