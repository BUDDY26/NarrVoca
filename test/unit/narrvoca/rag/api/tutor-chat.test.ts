import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/tutor-chat';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockRetrieveChunks = jest.fn();
const mockCreate = jest.fn();    // openai.chat.completions.create
const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/narrvoca/rag', () => ({
  retrieveChunks: (...args: unknown[]) => mockRetrieveChunks(...args),
}));

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: (...args: unknown[]) => mockCreate(...args) } },
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
  {
    embedding_id: 1,
    source_type: 'node_text',
    source_id: 3,
    language_code: 'es',
    content_text: '¿Cuánto cuesta una manzana?',
    similarity: 0.93,
  },
];

const VALID_BODY = {
  uid: 'uid-abc',
  story_id: 1,
  node_id: 10,
  question: '¿Qué significa "cuesta"?',
  target_language: 'es',
};

// Wire Supabase chains for creating a new session (no session_id provided)
function setupNewSession() {
  // Reset any accumulated mockReturnValueOnce items from prior tests
  mockFrom.mockReset();

  const mockSingleCreate = jest.fn().mockResolvedValue({ data: { session_id: 99 }, error: null });
  const mockSelectCreate = jest.fn().mockReturnValue({ single: mockSingleCreate });
  const mockInsert = jest.fn().mockReturnValue({ select: mockSelectCreate });

  const mockEqUpdate = jest.fn().mockResolvedValue({ error: null });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqUpdate });

  mockFrom
    .mockReturnValueOnce({ insert: mockInsert })  // first from() — session create
    .mockReturnValue({ update: mockUpdate });      // subsequent from() — session update
}

// Wire Supabase chains for fetching an existing session (session_id provided)
function setupExistingSession(
  existingMessages: Array<{ role: string; content: string }> = []
) {
  // Reset any accumulated mockReturnValueOnce items from prior setups
  mockFrom.mockReset();

  const mockSingleFetch = jest.fn().mockResolvedValue({
    data: { session_id: 42, messages: existingMessages },
    error: null,
  });
  const mockEqFetch = jest.fn().mockReturnValue({ single: mockSingleFetch });
  const mockSelectFetch = jest.fn().mockReturnValue({ eq: mockEqFetch });

  const mockEqUpdate = jest.fn().mockResolvedValue({ error: null });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqUpdate });

  mockFrom
    .mockReturnValueOnce({ select: mockSelectFetch })  // first from() — session fetch
    .mockReturnValue({ update: mockUpdate });           // subsequent from() — session update
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-uid' } } });
  mockRetrieveChunks.mockResolvedValue(SAMPLE_CHUNKS);
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: 'La palabra "cuesta" significa "costs" en inglés.' } }],
  });
  setupNewSession(); // default: new session flow
});

// ---------------------------------------------------------------------------

describe('POST /api/narrvoca/tutor-chat', () => {
  it('returns 405 for non-POST methods', async () => {
    const req = makeReq('GET', undefined, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 401 when no authorization token is provided', async () => {
    const req = makeReq('POST', VALID_BODY, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when the token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when uid is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { uid: _uid, ...body } = VALID_BODY;
    const req = makeReq('POST', body);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when question is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { question: _q, ...body } = VALID_BODY;
    const req = makeReq('POST', body);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when story_id is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { story_id: _s, ...body } = VALID_BODY;
    const req = makeReq('POST', body);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when target_language is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { target_language: _tl, ...body } = VALID_BODY;
    const req = makeReq('POST', body);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('calls retrieveChunks with the user question and topN: 5', async () => {
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(mockRetrieveChunks).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      VALID_BODY.question,
      expect.objectContaining({ topN: 5 })
    );
  });

  it('calls gpt-4o-mini with the correct model', async () => {
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini' })
    );
  });

  it('returns 200 with reply and session_id on success (new session)', async () => {
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ reply: expect.any(String), session_id: 99 })
    );
  });

  it('includes user and assistant messages in the response', async () => {
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    const { messages } = (res.json as jest.Mock).mock.calls[0][0] as {
      messages: Array<{ role: string }>;
    };
    const roles = messages.map((m) => m.role);
    expect(roles).toContain('user');
    expect(roles).toContain('assistant');
  });

  it('fetches existing session and returns session_id 42 when session_id is provided', async () => {
    // Override the beforeEach setupNewSession with the existing-session chain
    setupExistingSession([{ role: 'user', content: 'Previous question' }]);

    const req = makeReq('POST', { ...VALID_BODY, session_id: 42 });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: 42 })
    );
  });

  it('returns 500 when OpenAI throws', async () => {
    mockCreate.mockRejectedValue(new Error('OpenAI timeout'));
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
