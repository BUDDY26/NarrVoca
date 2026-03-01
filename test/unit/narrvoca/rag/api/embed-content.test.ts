import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/src/pages/api/narrvoca/embed-content';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockEmbedSingleRecord = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/narrvoca/embed', () => ({
  embedSingleRecord: (...args: unknown[]) => mockEmbedSingleRecord(...args),
  EMBED_MODEL: 'text-embedding-3-small',
}));

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    embeddings: { create: jest.fn() },
  }))
);

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeReq(
  method: string,
  body?: object,
  withAuth = true
): Partial<NextApiRequest> {
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

const VALID_BODY = {
  source_type: 'node_text',
  source_id: 7,
  content_text: '¿Cuánto cuesta una manzana?',
  language_code: 'es',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'test-uid' } } });
  mockEmbedSingleRecord.mockResolvedValue({ embedding_id: 42 });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/narrvoca/embed-content', () => {
  it('returns 405 for non-POST methods', async () => {
    const req = makeReq('GET', undefined, false);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 401 when no authorization header is present', async () => {
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

  it('returns 400 when source_type is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { source_type: _st, ...body } = VALID_BODY;
    const req = makeReq('POST', body);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when source_id is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { source_id: _si, ...body } = VALID_BODY;
    const req = makeReq('POST', body);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when content_text is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { content_text: _ct, ...body } = VALID_BODY;
    const req = makeReq('POST', body);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when source_type is not a valid type', async () => {
    const req = makeReq('POST', { ...VALID_BODY, source_type: 'invalid_type' });
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with embedding_id on success', async () => {
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ embedding_id: 42 });
  });

  it('accepts optional language_code and passes it through', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { language_code: _lc, ...bodyWithoutLang } = VALID_BODY;
    const req = makeReq('POST', bodyWithoutLang);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockEmbedSingleRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ language_code: null })
    );
  });

  it('returns 500 when embedSingleRecord throws', async () => {
    mockEmbedSingleRecord.mockRejectedValue(new Error('OpenAI down'));
    const req = makeReq('POST', VALID_BODY);
    const res = makeRes();
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
