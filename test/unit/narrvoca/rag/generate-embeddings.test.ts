import {
  fetchSourceRecords,
  generateEmbeddings,
  upsertEmbeddings,
  runEmbeddingGeneration,
  EMBEDDING_MODEL,
  DEFAULT_BATCH_SIZE,
  type EmbeddingSourceRecord,
  type MinimalSupabaseClient,
  type MinimalOpenAI,
} from '@/scripts/generate-embeddings';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const FAKE_EMBEDDING = Array.from({ length: 1536 }, (_, i) => i / 1536);

const NODE_TEXT_ROWS = [
  { node_text_id: 1, language_code: 'es', text_content: '¿Cómo te llamas?' },
  { node_text_id: 2, language_code: 'en', text_content: 'What is your name?' },
];

const VOCAB_ROWS = [
  { vocab_id: 10, language_code: 'es', term: 'mercado', translation_en: 'market', pinyin: null },
  { vocab_id: 11, language_code: 'zh', term: '市场', translation_en: 'market', pinyin: 'shìchǎng' },
];

const GRAMMAR_ROWS = [
  {
    grammar_id: 20,
    language_code: 'es',
    rule_name: 'ser vs. estar',
    explanation_en: 'Use ser for permanent states, estar for temporary.',
    example_target: 'Soy estudiante. Estoy cansado.',
  },
];

// ---------------------------------------------------------------------------
// Mock factory helpers
// ---------------------------------------------------------------------------
function makeMockSelect(resolveWith: { data: Record<string, unknown>[] | null; error: { message: string } | null }) {
  return jest.fn().mockResolvedValue(resolveWith);
}

/** Builds a mock supabase client where each table has its own select/upsert mock */
function buildMockSupabase(overrides: {
  nodeTextResult?: { data: Record<string, unknown>[] | null; error: { message: string } | null };
  vocabResult?: { data: Record<string, unknown>[] | null; error: { message: string } | null };
  grammarResult?: { data: Record<string, unknown>[] | null; error: { message: string } | null };
  upsertResult?: { error: { message: string } | null };
} = {}): { supabase: MinimalSupabaseClient; mocks: Record<string, jest.Mock> } {
  const mockNodeTextSelect = makeMockSelect(
    overrides.nodeTextResult ?? { data: NODE_TEXT_ROWS as unknown as Record<string, unknown>[], error: null }
  );
  const mockVocabSelect = makeMockSelect(
    overrides.vocabResult ?? { data: VOCAB_ROWS as unknown as Record<string, unknown>[], error: null }
  );
  const mockGrammarSelect = makeMockSelect(
    overrides.grammarResult ?? { data: GRAMMAR_ROWS as unknown as Record<string, unknown>[], error: null }
  );
  const mockUpsert = jest.fn().mockResolvedValue(
    overrides.upsertResult ?? { error: null }
  );

  const supabase: MinimalSupabaseClient = {
    from: jest.fn((table: string) => {
      switch (table) {
        case 'node_text':      return { select: mockNodeTextSelect, upsert: jest.fn() };
        case 'vocabulary':     return { select: mockVocabSelect,    upsert: jest.fn() };
        case 'grammar_points': return { select: mockGrammarSelect,  upsert: jest.fn() };
        case 'embedding_store': return { select: jest.fn(), upsert: mockUpsert };
        default: return { select: jest.fn().mockResolvedValue({ data: [], error: null }), upsert: jest.fn() };
      }
    }),
  };

  return {
    supabase,
    mocks: { mockNodeTextSelect, mockVocabSelect, mockGrammarSelect, mockUpsert },
  };
}

function buildMockOpenAI(embeddings: number[][] = [FAKE_EMBEDDING]): MinimalOpenAI {
  return {
    embeddings: {
      create: jest.fn().mockResolvedValue({ data: embeddings.map((e) => ({ embedding: e })) }),
    },
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('EMBEDDING_MODEL is text-embedding-3-small', () => {
    expect(EMBEDDING_MODEL).toBe('text-embedding-3-small');
  });

  it('DEFAULT_BATCH_SIZE is a positive integer', () => {
    expect(DEFAULT_BATCH_SIZE).toBeGreaterThan(0);
    expect(Number.isInteger(DEFAULT_BATCH_SIZE)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fetchSourceRecords
// ---------------------------------------------------------------------------

describe('fetchSourceRecords', () => {
  it('queries node_text table with correct columns', async () => {
    const { supabase, mocks } = buildMockSupabase();
    await fetchSourceRecords(supabase);
    expect(supabase.from).toHaveBeenCalledWith('node_text');
    expect(mocks.mockNodeTextSelect).toHaveBeenCalledWith(
      'node_text_id, language_code, text_content'
    );
  });

  it('queries vocabulary table with correct columns', async () => {
    const { supabase, mocks } = buildMockSupabase();
    await fetchSourceRecords(supabase);
    expect(supabase.from).toHaveBeenCalledWith('vocabulary');
    expect(mocks.mockVocabSelect).toHaveBeenCalledWith(
      'vocab_id, language_code, term, translation_en, pinyin'
    );
  });

  it('queries grammar_points table with correct columns', async () => {
    const { supabase, mocks } = buildMockSupabase();
    await fetchSourceRecords(supabase);
    expect(supabase.from).toHaveBeenCalledWith('grammar_points');
    expect(mocks.mockGrammarSelect).toHaveBeenCalledWith(
      'grammar_id, language_code, rule_name, explanation_en, example_target'
    );
  });

  it('returns node_text records with correct source_type and source_id', async () => {
    const { supabase } = buildMockSupabase();
    const records = await fetchSourceRecords(supabase);
    const nodeTextRecords = records.filter((r) => r.source_type === 'node_text');
    expect(nodeTextRecords).toHaveLength(2);
    expect(nodeTextRecords[0].source_id).toBe(1);
    expect(nodeTextRecords[0].content_text).toBe('¿Cómo te llamas?');
  });

  it('returns vocabulary records with term — translation_en content_text', async () => {
    const { supabase } = buildMockSupabase();
    const records = await fetchSourceRecords(supabase);
    const vocabRecords = records.filter((r) => r.source_type === 'vocabulary');
    expect(vocabRecords).toHaveLength(2);
    expect(vocabRecords[0].content_text).toContain('mercado');
    expect(vocabRecords[0].content_text).toContain('market');
  });

  it('includes pinyin in vocabulary content_text for zh entries', async () => {
    const { supabase } = buildMockSupabase();
    const records = await fetchSourceRecords(supabase);
    const zhVocab = records.find((r) => r.source_type === 'vocabulary' && r.language_code === 'zh');
    expect(zhVocab?.content_text).toContain('shìchǎng');
  });

  it('returns grammar_point records combining rule_name, explanation, and example', async () => {
    const { supabase } = buildMockSupabase();
    const records = await fetchSourceRecords(supabase);
    const grammarRecords = records.filter((r) => r.source_type === 'grammar_point');
    expect(grammarRecords).toHaveLength(1);
    expect(grammarRecords[0].source_id).toBe(20);
    expect(grammarRecords[0].content_text).toContain('ser vs. estar');
    expect(grammarRecords[0].content_text).toContain('permanent');
    expect(grammarRecords[0].content_text).toContain('Soy estudiante');
  });

  it('skips node_text rows with null or empty text_content', async () => {
    const { supabase } = buildMockSupabase({
      nodeTextResult: {
        data: [
          { node_text_id: 1, language_code: 'es', text_content: 'Hola' },
          { node_text_id: 2, language_code: 'es', text_content: null },
          { node_text_id: 3, language_code: 'es', text_content: '' },
        ] as unknown as Record<string, unknown>[],
        error: null,
      },
    });
    const records = await fetchSourceRecords(supabase);
    const nodeTextRecords = records.filter((r) => r.source_type === 'node_text');
    expect(nodeTextRecords).toHaveLength(1);
    expect(nodeTextRecords[0].source_id).toBe(1);
  });

  it('throws when node_text query returns a DB error', async () => {
    const { supabase } = buildMockSupabase({
      nodeTextResult: { data: null, error: { message: 'connection refused' } },
    });
    await expect(fetchSourceRecords(supabase)).rejects.toThrow('node_text fetch failed: connection refused');
  });

  it('throws when vocabulary query returns a DB error', async () => {
    const { supabase } = buildMockSupabase({
      vocabResult: { data: null, error: { message: 'timeout' } },
    });
    await expect(fetchSourceRecords(supabase)).rejects.toThrow('vocabulary fetch failed: timeout');
  });

  it('throws when grammar_points query returns a DB error', async () => {
    const { supabase } = buildMockSupabase({
      grammarResult: { data: null, error: { message: 'schema error' } },
    });
    await expect(fetchSourceRecords(supabase)).rejects.toThrow('grammar_points fetch failed: schema error');
  });

  it('returns an empty array when all tables are empty', async () => {
    const { supabase } = buildMockSupabase({
      nodeTextResult: { data: [], error: null },
      vocabResult: { data: [], error: null },
      grammarResult: { data: [], error: null },
    });
    const records = await fetchSourceRecords(supabase);
    expect(records).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateEmbeddings
// ---------------------------------------------------------------------------

describe('generateEmbeddings', () => {
  it('calls openai.embeddings.create with the correct model', async () => {
    const openai = buildMockOpenAI([FAKE_EMBEDDING]);
    await generateEmbeddings(openai, ['Hola mundo']);
    expect(openai.embeddings.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'text-embedding-3-small' })
    );
  });

  it('passes all input texts to the API call', async () => {
    const texts = ['Hola', 'mundo', '¿Cómo estás?'];
    const embeddings = [FAKE_EMBEDDING, FAKE_EMBEDDING, FAKE_EMBEDDING];
    const openai = buildMockOpenAI(embeddings);
    await generateEmbeddings(openai, texts);
    expect(openai.embeddings.create).toHaveBeenCalledWith(
      expect.objectContaining({ input: texts })
    );
  });

  it('returns one embedding vector per input text', async () => {
    const embeddings = [FAKE_EMBEDDING, FAKE_EMBEDDING];
    const openai = buildMockOpenAI(embeddings);
    const result = await generateEmbeddings(openai, ['text1', 'text2']);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(FAKE_EMBEDDING);
  });

  it('returns an empty array without calling the API when input is empty', async () => {
    const openai = buildMockOpenAI();
    const result = await generateEmbeddings(openai, []);
    expect(result).toEqual([]);
    expect(openai.embeddings.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// upsertEmbeddings
// ---------------------------------------------------------------------------

describe('upsertEmbeddings', () => {
  const records: EmbeddingSourceRecord[] = [
    { source_type: 'node_text', source_id: 1, language_code: 'es', content_text: 'Hola' },
    { source_type: 'vocabulary', source_id: 10, language_code: 'es', content_text: 'mercado — market' },
  ];
  const embeddings = [FAKE_EMBEDDING, FAKE_EMBEDDING];

  it('upserts to the embedding_store table', async () => {
    const { supabase, mocks } = buildMockSupabase();
    await upsertEmbeddings(supabase, records, embeddings);
    expect(supabase.from).toHaveBeenCalledWith('embedding_store');
    expect(mocks.mockUpsert).toHaveBeenCalled();
  });

  it('upserts with onConflict: source_type,source_id', async () => {
    const { supabase, mocks } = buildMockSupabase();
    await upsertEmbeddings(supabase, records, embeddings);
    expect(mocks.mockUpsert).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ onConflict: 'source_type,source_id' })
    );
  });

  it('includes embedding vector in each upserted row', async () => {
    const { supabase, mocks } = buildMockSupabase();
    await upsertEmbeddings(supabase, records, embeddings);
    const [rows] = mocks.mockUpsert.mock.calls[0] as [Record<string, unknown>[]];
    expect(rows[0].embedding).toEqual(FAKE_EMBEDDING);
  });

  it('throws when upsert returns a DB error', async () => {
    const { supabase } = buildMockSupabase({
      upsertResult: { error: { message: 'vector dimension mismatch' } },
    });
    await expect(upsertEmbeddings(supabase, records, embeddings)).rejects.toThrow(
      'upsert failed: vector dimension mismatch'
    );
  });
});

// ---------------------------------------------------------------------------
// runEmbeddingGeneration
// ---------------------------------------------------------------------------

describe('runEmbeddingGeneration', () => {
  it('returns the total number of records processed', async () => {
    const { supabase } = buildMockSupabase();
    // 2 node_text + 2 vocab + 1 grammar = 5 records
    const openai = buildMockOpenAI(Array.from({ length: 5 }, () => FAKE_EMBEDDING));
    // Mock create to return appropriate embeddings per batch call
    (openai.embeddings.create as jest.Mock).mockResolvedValue({
      data: Array.from({ length: 5 }, () => ({ embedding: FAKE_EMBEDDING })),
    });
    const result = await runEmbeddingGeneration(supabase, openai, 20);
    expect(result.processed).toBe(5);
  });

  it('processes records in batches and counts them correctly', async () => {
    const { supabase } = buildMockSupabase();
    const openai = buildMockOpenAI();
    (openai.embeddings.create as jest.Mock)
      .mockResolvedValueOnce({ data: [{ embedding: FAKE_EMBEDDING }, { embedding: FAKE_EMBEDDING }] })
      .mockResolvedValueOnce({ data: [{ embedding: FAKE_EMBEDDING }, { embedding: FAKE_EMBEDDING }] })
      .mockResolvedValueOnce({ data: [{ embedding: FAKE_EMBEDDING }] });

    // batchSize=2, 5 records → 3 batches
    const result = await runEmbeddingGeneration(supabase, openai, 2);
    expect(result.batches).toBe(3);
    expect(result.processed).toBe(5);
  });

  it('returns { processed: 0, batches: 0 } when all tables are empty', async () => {
    const { supabase } = buildMockSupabase({
      nodeTextResult: { data: [], error: null },
      vocabResult: { data: [], error: null },
      grammarResult: { data: [], error: null },
    });
    const openai = buildMockOpenAI();
    const result = await runEmbeddingGeneration(supabase, openai);
    expect(result.processed).toBe(0);
    expect(result.batches).toBe(0);
    expect(openai.embeddings.create).not.toHaveBeenCalled();
  });

  it('propagates errors from fetchSourceRecords', async () => {
    const { supabase } = buildMockSupabase({
      nodeTextResult: { data: null, error: { message: 'DB down' } },
    });
    const openai = buildMockOpenAI();
    await expect(runEmbeddingGeneration(supabase, openai)).rejects.toThrow('DB down');
  });

  it('propagates errors from upsertEmbeddings', async () => {
    const { supabase } = buildMockSupabase({
      upsertResult: { error: { message: 'write failed' } },
    });
    const openai = buildMockOpenAI();
    (openai.embeddings.create as jest.Mock).mockResolvedValue({
      data: Array.from({ length: 5 }, () => ({ embedding: FAKE_EMBEDDING })),
    });
    await expect(runEmbeddingGeneration(supabase, openai)).rejects.toThrow('write failed');
  });
});
