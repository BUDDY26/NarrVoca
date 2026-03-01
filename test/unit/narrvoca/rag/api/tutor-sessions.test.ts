import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/tutor-sessions';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetUser = jest.fn();
const mockFrom = jest.fn();

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
  { query = {}, body }: { query?: Record<string, string>; body?: object } = {},
  withAuth = true
): Partial<NextApiRequest> {
  return {
    method,
    query,
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

// Wire: select('*').eq('session_id', id).single()
function setupSelectBySessionId(data: unknown, error: unknown = null) {
  const mockSingle = jest.fn().mockResolvedValue({ data, error });
  const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
}

// Wire: select('*').eq('uid').eq('story_id').order().maybeSingle()
function setupSelectByUidStoryId(data: unknown, error: unknown = null) {
  const mockMaybeSingle = jest.fn().mockResolvedValue({ data, error });
  const mockOrder = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
  const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
  const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
  mockFrom.mockReturnValue({ select: mockSelect });
}

// Wire: insert({}).select('session_id').single()
function setupInsert(data: unknown, error: unknown = null) {
  const mockSingle = jest.fn().mockResolvedValue({ data, error });
  const mockSelectAfterInsert = jest.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = jest.fn().mockReturnValue({ select: mockSelectAfterInsert });
  mockFrom.mockReturnValue({ insert: mockInsert });
}

const SAMPLE_SESSION = {
  session_id: 7,
  uid: 'uid-abc',
  story_id: 1,
  messages: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-uid' } } });
});

// ---------------------------------------------------------------------------

describe('GET /api/narrvoca/tutor-sessions', () => {
  it('returns 401 when no authorization token is provided', async () => {
    const req = makeReq('GET', { query: { session_id: '7' } }, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when no query params are provided', async () => {
    const req = makeReq('GET', {});
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with session data when session_id is provided', async () => {
    setupSelectBySessionId(SAMPLE_SESSION);
    const req = makeReq('GET', { query: { session_id: '7' } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(SAMPLE_SESSION);
  });

  it('returns 404 when session not found by session_id', async () => {
    setupSelectBySessionId(null, { message: 'Not found' });
    const req = makeReq('GET', { query: { session_id: '999' } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 with session when querying by uid + story_id', async () => {
    setupSelectByUidStoryId(SAMPLE_SESSION);
    const req = makeReq('GET', { query: { uid: 'uid-abc', story_id: '1' } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(SAMPLE_SESSION);
  });

  it('returns 200 with null when no session exists for uid + story_id', async () => {
    setupSelectByUidStoryId(null);
    const req = makeReq('GET', { query: { uid: 'uid-abc', story_id: '1' } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(null);
  });
});

describe('POST /api/narrvoca/tutor-sessions', () => {
  it('returns 401 when no authorization token is provided', async () => {
    const req = makeReq('POST', { body: { uid: 'uid-abc', story_id: 1 } }, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when uid is missing', async () => {
    const req = makeReq('POST', { body: { story_id: 1 } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when story_id is missing', async () => {
    const req = makeReq('POST', { body: { uid: 'uid-abc' } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with session_id on success', async () => {
    setupInsert({ session_id: 7 });
    const req = makeReq('POST', { body: { uid: 'uid-abc', story_id: 1 } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ session_id: 7 });
  });

  it('returns 500 on DB insert error', async () => {
    setupInsert(null, { message: 'Insert failed' });
    const req = makeReq('POST', { body: { uid: 'uid-abc', story_id: 1 } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('unsupported methods', () => {
  it('returns 405 for PUT requests', async () => {
    const req = makeReq('PUT', {});
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 405 for DELETE requests', async () => {
    const req = makeReq('DELETE', {});
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
