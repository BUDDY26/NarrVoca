import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/update-mastery';

// ---------------------------------------------------------------------------
// Mock supabase
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
// next_review_at interval rules:
//   score < 0.3  → 1 day
//   score < 0.6  → 3 days
//   score < 0.8  → 7 days
//   score >= 0.8 → 14 days
// ---------------------------------------------------------------------------

describe('POST /api/narrvoca/update-mastery', () => {
  it('returns 405 for non-POST methods', async () => {
    const req = makeReq('GET');
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = makeReq('POST', { uid: 'user-uuid' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on DB error', async () => {
    setupChain(null, { message: 'upsert failed' });
    const req = makeReq('POST', { uid: 'user-uuid', vocab_id: 1, mastery_score: 0.5 });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 200 with result row on success', async () => {
    const dbRow = {
      uid: 'user-uuid',
      vocab_id: 1,
      mastery_score: 0.5,
      next_review_at: '2026-03-01T00:00:00.000Z',
    };
    setupChain(dbRow);
    const req = makeReq('POST', { uid: 'user-uuid', vocab_id: 1, mastery_score: 0.5 });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(dbRow);
  });

  describe('next_review_at intervals', () => {
    // We intercept the upsert payload to check the next_review_at value
    // by inspecting what was passed to mockUpsert.
    function getUpsertPayload() {
      return mockUpsert.mock.calls[0][0] as Record<string, unknown>;
    }

    beforeEach(() => {
      const dbRow = { uid: 'u', vocab_id: 1, mastery_score: 0, next_review_at: 'x' };
      setupChain(dbRow);
    });

    function daysFromNow(days: number): Date {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d;
    }

    async function run(score: number) {
      const req = makeReq('POST', { uid: 'u', vocab_id: 1, mastery_score: score });
      const res = makeRes();
      await handler(req as NextApiRequest, res as NextApiResponse);
    }

    it('schedules 1 day for score < 0.3', async () => {
      await run(0.2);
      const payload = getUpsertPayload();
      const diff = Math.round(
        (new Date(payload.next_review_at as string).getTime() - Date.now()) / 86400000
      );
      expect(diff).toBe(1);
    });

    it('schedules 3 days for score 0.3–0.59', async () => {
      await run(0.5);
      const payload = getUpsertPayload();
      const diff = Math.round(
        (new Date(payload.next_review_at as string).getTime() - Date.now()) / 86400000
      );
      expect(diff).toBe(3);
    });

    it('schedules 7 days for score 0.6–0.79', async () => {
      await run(0.7);
      const payload = getUpsertPayload();
      const diff = Math.round(
        (new Date(payload.next_review_at as string).getTime() - Date.now()) / 86400000
      );
      expect(diff).toBe(7);
    });

    it('schedules 14 days for score >= 0.8', async () => {
      await run(0.9);
      const payload = getUpsertPayload();
      const diff = Math.round(
        (new Date(payload.next_review_at as string).getTime() - Date.now()) / 86400000
      );
      expect(diff).toBe(14);
    });
  });
});
