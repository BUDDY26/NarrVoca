import {
  embedSingleRecord,
  EMBED_MODEL,
  type EmbedSupabaseClient,
  type EmbedOpenAIClient,
  type EmbedRecord,
} from '@/lib/narrvoca/embed';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const FAKE_EMBEDDING = Array.from({ length: 1536 }, (_, i) => i / 1536);

const RECORD: EmbedRecord = {
  source_type: 'node_text',
  source_id: 7,
  content_text: '¿Cuánto cuesta una manzana?',
  language_code: 'es',
};

// ---------------------------------------------------------------------------
// Mock factory helpers
// ---------------------------------------------------------------------------
function buildMockSupabase(overrides: {
  upsertData?: unknown;
  upsertError?: { message: string } | null;
} = {}): {
  supabase: EmbedSupabaseClient;
  mocks: {
    mockFrom: jest.Mock;
    mockUpsert: jest.Mock;
    mockSelectAfterUpsert: jest.Mock;
    mockSingle: jest.Mock;
  };
} {
  const mockSingle = jest.fn().mockResolvedValue({
    data: overrides.upsertData ?? { embedding_id: 42 },
    error: overrides.upsertError ?? null,
  });
  const mockSelectAfterUpsert = jest.fn().mockReturnValue({ single: mockSingle });
  const mockUpsert = jest.fn().mockReturnValue({ select: mockSelectAfterUpsert });
  const mockFrom = jest.fn().mockReturnValue({ upsert: mockUpsert });

  const supabase: EmbedSupabaseClient = { from: mockFrom };
  return { supabase, mocks: { mockFrom, mockUpsert, mockSelectAfterUpsert, mockSingle } };
}

function buildMockOpenAI(embedding: number[] = FAKE_EMBEDDING): {
  openai: EmbedOpenAIClient;
  mockCreate: jest.Mock;
} {
  const mockCreate = jest.fn().mockResolvedValue({
    data: [{ embedding }],
  });
  return {
    openai: { embeddings: { create: mockCreate } },
    mockCreate,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EMBED_MODEL constant', () => {
  it('is text-embedding-3-small', () => {
    expect(EMBED_MODEL).toBe('text-embedding-3-small');
  });
});

describe('embedSingleRecord', () => {
  it('calls openai.embeddings.create with text-embedding-3-small', async () => {
    const { supabase } = buildMockSupabase();
    const { openai, mockCreate } = buildMockOpenAI();
    await embedSingleRecord(supabase, openai, RECORD);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'text-embedding-3-small' })
    );
  });

  it('passes content_text as the embedding input', async () => {
    const { supabase } = buildMockSupabase();
    const { openai, mockCreate } = buildMockOpenAI();
    await embedSingleRecord(supabase, openai, RECORD);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ input: [RECORD.content_text] })
    );
  });

  it('upserts to the embedding_store table', async () => {
    const { supabase, mocks } = buildMockSupabase();
    const { openai } = buildMockOpenAI();
    await embedSingleRecord(supabase, openai, RECORD);
    expect(mocks.mockFrom).toHaveBeenCalledWith('embedding_store');
    expect(mocks.mockUpsert).toHaveBeenCalled();
  });

  it('upserts with onConflict: source_type,source_id', async () => {
    const { supabase, mocks } = buildMockSupabase();
    const { openai } = buildMockOpenAI();
    await embedSingleRecord(supabase, openai, RECORD);
    expect(mocks.mockUpsert).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ onConflict: 'source_type,source_id' })
    );
  });

  it('includes source_type, source_id, content_text in the upserted row', async () => {
    const { supabase, mocks } = buildMockSupabase();
    const { openai } = buildMockOpenAI();
    await embedSingleRecord(supabase, openai, RECORD);
    const [rows] = mocks.mockUpsert.mock.calls[0] as [Record<string, unknown>[]];
    expect(rows[0].source_type).toBe('node_text');
    expect(rows[0].source_id).toBe(7);
    expect(rows[0].content_text).toBe(RECORD.content_text);
  });

  it('includes the embedding vector in the upserted row', async () => {
    const { supabase, mocks } = buildMockSupabase();
    const { openai } = buildMockOpenAI();
    await embedSingleRecord(supabase, openai, RECORD);
    const [rows] = mocks.mockUpsert.mock.calls[0] as [Record<string, unknown>[]];
    expect(rows[0].embedding).toEqual(FAKE_EMBEDDING);
  });

  it('includes language_code in the upserted row', async () => {
    const { supabase, mocks } = buildMockSupabase();
    const { openai } = buildMockOpenAI();
    await embedSingleRecord(supabase, openai, RECORD);
    const [rows] = mocks.mockUpsert.mock.calls[0] as [Record<string, unknown>[]];
    expect(rows[0].language_code).toBe('es');
  });

  it('uses null for language_code when omitted', async () => {
    const { supabase, mocks } = buildMockSupabase();
    const { openai } = buildMockOpenAI();
    const record: EmbedRecord = { source_type: 'vocabulary', source_id: 1, content_text: 'hello' };
    await embedSingleRecord(supabase, openai, record);
    const [rows] = mocks.mockUpsert.mock.calls[0] as [Record<string, unknown>[]];
    expect(rows[0].language_code).toBeNull();
  });

  it('calls select("embedding_id").single() to retrieve the new id', async () => {
    const { supabase, mocks } = buildMockSupabase();
    const { openai } = buildMockOpenAI();
    await embedSingleRecord(supabase, openai, RECORD);
    expect(mocks.mockSelectAfterUpsert).toHaveBeenCalledWith('embedding_id');
    expect(mocks.mockSingle).toHaveBeenCalled();
  });

  it('returns the embedding_id from the upserted row', async () => {
    const { supabase } = buildMockSupabase({ upsertData: { embedding_id: 99 } });
    const { openai } = buildMockOpenAI();
    const result = await embedSingleRecord(supabase, openai, RECORD);
    expect(result.embedding_id).toBe(99);
  });

  it('throws when OpenAI embeddings.create fails', async () => {
    const { supabase } = buildMockSupabase();
    const mockCreate = jest.fn().mockRejectedValue(new Error('OpenAI down'));
    const openai: EmbedOpenAIClient = { embeddings: { create: mockCreate } };
    await expect(embedSingleRecord(supabase, openai, RECORD)).rejects.toThrow('OpenAI down');
  });

  it('throws when upsert returns a DB error', async () => {
    const { supabase } = buildMockSupabase({
      upsertData: null,
      upsertError: { message: 'vector dimension mismatch' },
    });
    const { openai } = buildMockOpenAI();
    await expect(embedSingleRecord(supabase, openai, RECORD)).rejects.toThrow(
      'embed failed: vector dimension mismatch'
    );
  });

  it('works for all three source_type values', async () => {
    const types: Array<EmbedRecord['source_type']> = [
      'node_text', 'vocabulary', 'grammar_point',
    ];
    for (const source_type of types) {
      const { supabase, mocks } = buildMockSupabase();
      const { openai } = buildMockOpenAI();
      await embedSingleRecord(supabase, openai, { ...RECORD, source_type });
      const [rows] = mocks.mockUpsert.mock.calls[0] as [Record<string, unknown>[]];
      expect(rows[0].source_type).toBe(source_type);
    }
  });
});
