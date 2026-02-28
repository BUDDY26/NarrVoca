import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/log-interaction';

// ---------------------------------------------------------------------------
// Mock supabase
// ---------------------------------------------------------------------------
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: mockInsert,
    }),
  },
}));

// Chain: insert().select().single()
function setupChain(data: unknown, error: unknown = null) {
  mockSingle.mockResolvedValue({ data, error });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
}

// ---------------------------------------------------------------------------
// Request / Response helpers
// ---------------------------------------------------------------------------
function makeReq(method: string, body?: object): Partial<NextApiRequest> {
  return { method, body };
}

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse;
  return res;
}

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------

describe('POST /api/narrvoca/log-interaction', () => {
  const validBody = {
    uid: 'user-uuid',
    node_id: 1,
    user_input: 'Hola',
    accuracy_score: 0.9,
  };

  it('returns 201 with interaction_id on success', async () => {
    setupChain({ interaction_id: 42 });
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ interaction_id: 42 });
  });

  it('accepts optional llm_feedback field', async () => {
    setupChain({ interaction_id: 7 });
    const req = makeReq('POST', { ...validBody, llm_feedback: 'Good job!' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = makeReq('POST', { uid: 'user-uuid' }); // missing node_id, user_input, accuracy_score
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 405 for non-POST methods', async () => {
    const req = makeReq('GET');
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 500 on DB error', async () => {
    setupChain(null, { message: 'insert failed' });
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
