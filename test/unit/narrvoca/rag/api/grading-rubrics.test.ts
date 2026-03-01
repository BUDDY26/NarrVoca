import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/grading-rubrics';

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

// Wire: select('*').eq('node_id', id).order('rubric_id', {...})
function setupGetChain(data: unknown, error: unknown = null) {
  mockFrom.mockReset();
  const mockOrder = jest.fn().mockResolvedValue({ data, error });
  const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
}

// Wire: insert({}).select('rubric_id').single()
function setupInsertChain(data: unknown, error: unknown = null) {
  mockFrom.mockReset();
  const mockSingle = jest.fn().mockResolvedValue({ data, error });
  const mockSelectAfterInsert = jest.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = jest.fn().mockReturnValue({ select: mockSelectAfterInsert });
  mockFrom.mockReturnValue({ insert: mockInsert });
}

const SAMPLE_RUBRICS = [
  { rubric_id: 1, node_id: 3, criterion: 'Uses correct verb conjugation', weight: 1.0, example_correct: 'Quiero una manzana', created_at: '2026-01-01T00:00:00Z' },
  { rubric_id: 2, node_id: 3, criterion: 'Includes price negotiation vocabulary', weight: 0.8, example_correct: '¿Cuánto cuesta?', created_at: '2026-01-01T00:00:00Z' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-uid' } } });
});

// ---------------------------------------------------------------------------

describe('GET /api/narrvoca/grading-rubrics', () => {
  it('returns 401 when no authorization token is provided', async () => {
    const req = makeReq('GET', { query: { node_id: '3' } }, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when node_id is missing', async () => {
    const req = makeReq('GET', {});
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with rubrics array for a valid node_id', async () => {
    setupGetChain(SAMPLE_RUBRICS);
    const req = makeReq('GET', { query: { node_id: '3' } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(SAMPLE_RUBRICS);
  });

  it('returns 200 with empty array when node has no rubrics', async () => {
    setupGetChain([]);
    const req = makeReq('GET', { query: { node_id: '99' } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('returns 500 on DB error', async () => {
    setupGetChain(null, { message: 'DB error' });
    const req = makeReq('GET', { query: { node_id: '3' } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('POST /api/narrvoca/grading-rubrics', () => {
  const validBody = { node_id: 3, criterion: 'Uses correct verb conjugation', weight: 1.0 };

  it('returns 401 when no authorization token is provided', async () => {
    const req = makeReq('POST', { body: validBody }, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when node_id is missing', async () => {
    const req = makeReq('POST', { body: { criterion: 'test', weight: 1.0 } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when criterion is missing', async () => {
    const req = makeReq('POST', { body: { node_id: 3, weight: 1.0 } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when weight is missing', async () => {
    const req = makeReq('POST', { body: { node_id: 3, criterion: 'test' } });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with rubric_id on success', async () => {
    setupInsertChain({ rubric_id: 5 });
    const req = makeReq('POST', { body: validBody });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ rubric_id: 5 });
  });

  it('accepts optional example_correct field', async () => {
    setupInsertChain({ rubric_id: 6 });
    const req = makeReq('POST', {
      body: { ...validBody, example_correct: '¿Cuánto cuesta?' },
    });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 500 on DB insert error', async () => {
    setupInsertChain(null, { message: 'FK violation' });
    const req = makeReq('POST', { body: validBody });
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
