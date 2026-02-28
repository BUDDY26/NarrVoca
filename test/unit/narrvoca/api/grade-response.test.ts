import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/grade-response';

// ---------------------------------------------------------------------------
// Mock supabase
// ---------------------------------------------------------------------------
const mockLimit = jest.fn();
const mockEq2 = jest.fn();
const mockEq1 = jest.fn();
const mockSelect = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: mockSelect }),
    auth: { getUser: (...args) => mockGetUser(...args) },
  },
}));

// ---------------------------------------------------------------------------
// Mock OpenAI
// ---------------------------------------------------------------------------
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: (...args: unknown[]) => mockCreate(...args) } },
  }));
});

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

function setupDbChain(data: unknown, error: unknown = null) {
  mockLimit.mockResolvedValue({ data, error });
  mockEq2.mockReturnValue({ limit: mockLimit });
  mockEq1.mockReturnValue({ eq: mockEq2 });
  mockSelect.mockReturnValue({ eq: mockEq1 });
}

function setupOpenAI(score: number, feedback: string) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ accuracy_score: score, feedback }) } }],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-uid' } } });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/narrvoca/grade-response', () => {
  it('returns 405 for non-POST methods', async () => {
    const req = makeReq('GET', undefined, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 401 when no authorization token is provided', async () => {
    const req = makeReq('POST', { node_id: 1, user_input: 'Hola', target_language: 'es' }, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = makeReq('POST', { node_id: 1, user_input: 'Hola' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when all fields are missing', async () => {
    const req = makeReq('POST', {});
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on DB error', async () => {
    setupDbChain(null, { message: 'db error' });
    const req = makeReq('POST', { node_id: 1, user_input: 'Hola', target_language: 'es' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 200 with accuracy_score and feedback on success', async () => {
    setupDbChain([{ text_content: '¿Cómo te llamas?' }]);
    setupOpenAI(0.9, 'Great job! Watch your accent marks.');
    const req = makeReq('POST', { node_id: 1, user_input: 'Me llamo Juan', target_language: 'es' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      accuracy_score: 0.9,
      feedback: 'Great job! Watch your accent marks.',
    });
  });

  it('works without a prompt context (no matching node_text row)', async () => {
    setupDbChain([]);
    setupOpenAI(0.7, 'Good effort!');
    const req = makeReq('POST', { node_id: 2, user_input: 'Hola', target_language: 'es' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ accuracy_score: 0.7, feedback: 'Good effort!' });
  });

  it('clamps accuracy_score to [0, 1] range', async () => {
    setupDbChain([{ text_content: 'prompt' }]);
    setupOpenAI(1.5, 'Excellent!');
    const req = makeReq('POST', { node_id: 1, user_input: 'test', target_language: 'es' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy_score: 1 })
    );
  });

  it('returns 500 when OpenAI throws', async () => {
    setupDbChain([{ text_content: 'prompt' }]);
    mockCreate.mockRejectedValue(new Error('OpenAI down'));
    const req = makeReq('POST', { node_id: 1, user_input: 'test', target_language: 'es' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
