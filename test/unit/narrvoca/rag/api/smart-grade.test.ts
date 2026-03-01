import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/smart-grade';

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

const SAMPLE_RUBRICS = [
  { rubric_id: 1, node_id: 3, criterion: 'Correct verb conjugation', weight: 1.0, example_correct: 'Quiero una manzana', created_at: '' },
  { rubric_id: 2, node_id: 3, criterion: 'Price negotiation vocabulary', weight: 0.8, example_correct: '¿Cuánto cuesta?', created_at: '' },
];

const SAMPLE_CHUNKS = [
  { embedding_id: 1, source_type: 'node_text', source_id: 3, language_code: 'es', content_text: '¿Cuánto cuesta una manzana?', similarity: 0.93 },
];

const VALID_BODY = {
  uid: 'uid-abc',
  node_id: 3,
  user_input: 'Quiero una manzana, ¿cuánto cuesta?',
  target_language: 'es',
};

// Set up two from() calls: rubric fetch + grade insert
function setupHappyPath(rubrics = SAMPLE_RUBRICS) {
  mockFrom.mockReset();

  // First from() — fetch rubrics: select('*').eq('node_id', id)
  const mockEqRubrics = jest.fn().mockResolvedValue({ data: rubrics, error: null });
  const mockSelectRubrics = jest.fn().mockReturnValue({ eq: mockEqRubrics });

  // Second from() — insert grade: insert({}).select('grade_id').single()
  const mockSingle = jest.fn().mockResolvedValue({ data: { grade_id: 77 }, error: null });
  const mockSelectAfterInsert = jest.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = jest.fn().mockReturnValue({ select: mockSelectAfterInsert });

  mockFrom
    .mockReturnValueOnce({ select: mockSelectRubrics })
    .mockReturnValue({ insert: mockInsert });
}

function setupOpenAI(score: number, feedback: string, rubric_scores: Record<string, number> = {}) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ accuracy_score: score, feedback, rubric_scores }) } }],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-uid' } } });
  mockRetrieveChunks.mockResolvedValue(SAMPLE_CHUNKS);
  setupOpenAI(0.88, 'Excellent use of vocabulary and correct conjugation!');
  setupHappyPath();
});

// ---------------------------------------------------------------------------

describe('POST /api/narrvoca/smart-grade', () => {
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

  it('returns 400 when node_id is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { node_id: _n, ...body } = VALID_BODY;
    const req = makeReq('POST', body);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when user_input is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user_input: _u, ...body } = VALID_BODY;
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

  it('fetches rubrics for the given node_id', async () => {
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    // mockFrom was called at least once — first call is the rubric fetch
    expect(mockFrom).toHaveBeenCalledWith('grading_rubrics');
  });

  it('calls retrieveChunks with the user_input as the query', async () => {
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(mockRetrieveChunks).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      VALID_BODY.user_input,
      expect.objectContaining({ sourceType: 'node_text' })
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

  it('stores the grade in checkpoint_grades', async () => {
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(mockFrom).toHaveBeenCalledWith('checkpoint_grades');
  });

  it('returns 200 with accuracy_score, feedback, and grade_id on success', async () => {
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        accuracy_score: 0.88,
        feedback: 'Excellent use of vocabulary and correct conjugation!',
        grade_id: 77,
      })
    );
  });

  it('returns 200 with grade even when node has no rubrics', async () => {
    setupHappyPath([]); // no rubrics
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('clamps accuracy_score to [0, 1]', async () => {
    setupOpenAI(1.5, 'Great job!');
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy_score: 1 })
    );
  });

  it('returns 500 when OpenAI throws', async () => {
    mockCreate.mockRejectedValue(new Error('OpenAI down'));
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
