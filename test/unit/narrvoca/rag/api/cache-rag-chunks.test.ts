import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/cache-rag-chunks';

// ---------------------------------------------------------------------------
// Mock supabase — chain: from().insert() (no .select().single())
// ---------------------------------------------------------------------------
const mockInsert = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ insert: mockInsert }),
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

const SAMPLE_CHUNKS = [
  { embedding_id: 1, source_type: 'node_text',  source_id: 3,  language_code: 'es', content_text: '¿Cuánto cuesta una manzana?', similarity: 0.93 },
  { embedding_id: 2, source_type: 'vocabulary', source_id: 10, language_code: 'es', content_text: 'mercado — market',            similarity: 0.88 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-uid' } } });
  mockInsert.mockResolvedValue({ error: null });
});

// ---------------------------------------------------------------------------

describe('POST /api/narrvoca/cache-rag-chunks', () => {
  const validBody = { query_id: 77, chunks: SAMPLE_CHUNKS };

  it('returns 405 for non-POST methods', async () => {
    const req = makeReq('GET', undefined, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 401 when no authorization token is provided', async () => {
    const req = makeReq('POST', validBody, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when the token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when query_id is missing', async () => {
    const req = makeReq('POST', { chunks: SAMPLE_CHUNKS });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when chunks is missing', async () => {
    const req = makeReq('POST', { query_id: 1 });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when chunks is an empty array', async () => {
    const req = makeReq('POST', { query_id: 1, chunks: [] });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with inserted count on success', async () => {
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ inserted: 2 });
  });

  it('inserts rows with rank (1-indexed) and similarity_score from chunk.similarity', async () => {
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    const [insertedRows] = mockInsert.mock.calls[0] as [Record<string, unknown>[]];
    expect(insertedRows[0].rank).toBe(1);
    expect(insertedRows[1].rank).toBe(2);
    expect(insertedRows[0].similarity_score).toBe(0.93);
    expect(insertedRows[1].similarity_score).toBe(0.88);
  });

  it('inserts rows with query_id and embedding_id from each chunk', async () => {
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    const [insertedRows] = mockInsert.mock.calls[0] as [Record<string, unknown>[]];
    expect(insertedRows[0].query_id).toBe(77);
    expect(insertedRows[0].embedding_id).toBe(1);
    expect(insertedRows[1].embedding_id).toBe(2);
  });

  it('returns 500 on DB insert error', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'FK violation' } });
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
