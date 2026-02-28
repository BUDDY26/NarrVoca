import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/update-progress';

// ---------------------------------------------------------------------------
// Mock supabase — upsert chain
// ---------------------------------------------------------------------------
const mockUpsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ upsert: mockUpsert }),
  },
}));

function setupChain(data: unknown, error: unknown = null) {
  mockSingle.mockResolvedValue({ data, error });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockUpsert.mockReturnValue({ select: mockSelect });
}

function makeReq(method: string, body?: object): Partial<NextApiRequest> {
  return { method, body };
}

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse;
}

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------

describe('POST /api/narrvoca/update-progress', () => {
  const validBody = {
    uid: 'user-uuid',
    node_id: 1,
    status: 'completed',
    accuracy_score: 0.85,
  };

  const dbRow = {
    uid: 'user-uuid',
    node_id: 1,
    status: 'completed',
    best_score: 0.85,
    completed_at: '2026-02-27T00:00:00Z',
  };

  it('returns 200 with progress row on success', async () => {
    setupChain(dbRow);
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(dbRow);
  });

  it('works without accuracy_score (optional)', async () => {
    const rowNoScore = { ...dbRow, best_score: null, completed_at: null };
    setupChain(rowNoScore);
    const req = makeReq('POST', { uid: 'user-uuid', node_id: 1, status: 'in_progress' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = makeReq('POST', { uid: 'user-uuid' }); // missing node_id and status
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
    setupChain(null, { message: 'upsert failed' });
    const req = makeReq('POST', validBody);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
