import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/log-rag-query';

// ---------------------------------------------------------------------------
// Mock supabase — chain: from().insert().select().single()
// ---------------------------------------------------------------------------
const mockSingle = jest.fn();
const mockSelectAfterInsert = jest.fn().mockReturnValue({ single: mockSingle });
const mockInsert = jest.fn().mockReturnValue({ select: mockSelectAfterInsert });
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ insert: mockInsert }),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  },
}));

function setupChain(data: unknown, error: unknown = null) {
  mockSingle.mockResolvedValue({ data, error });
  mockSelectAfterInsert.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelectAfterInsert });
}

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

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-uid' } } });
});

// ---------------------------------------------------------------------------

describe('POST /api/narrvoca/log-rag-query', () => {
  const validBody = {
    uid: 'user-uuid',
    node_id: 3,
    query_text: 'How do I ask the price of an apple?',
  };

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

  it('returns 401 when the token is invalid (user is null)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when uid is missing', async () => {
    const req = makeReq('POST', { node_id: 1, query_text: 'test' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when query_text is missing', async () => {
    const req = makeReq('POST', { uid: 'user-uuid', node_id: 1 });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with query_id on success', async () => {
    setupChain({ query_id: 77 });
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ query_id: 77 });
  });

  it('accepts optional top_k and source_type_filter fields', async () => {
    setupChain({ query_id: 88 });
    const req = makeReq('POST', {
      ...validBody,
      top_k: 10,
      source_type_filter: 'vocabulary',
    });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('node_id is optional — succeeds without it', async () => {
    setupChain({ query_id: 99 });
    const req = makeReq('POST', { uid: 'user-uuid', query_text: 'test query' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 500 on DB insert error', async () => {
    setupChain(null, { message: 'insert failed' });
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
