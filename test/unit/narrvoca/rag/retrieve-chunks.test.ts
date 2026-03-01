import {
  retrieveChunks,
  DEFAULT_TOP_N,
  RETRIEVAL_MODEL,
  type RagSupabaseClient,
  type RagOpenAIClient,
  type RetrievedChunk,
} from '@/lib/narrvoca/rag';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const FAKE_EMBEDDING = Array.from({ length: 1536 }, (_, i) => i / 1536);

const MOCK_CHUNKS: RetrievedChunk[] = [
  { embedding_id: 1, source_type: 'node_text',     source_id: 3,  language_code: 'es', content_text: '¿Cuánto cuesta una manzana?',          similarity: 0.93 },
  { embedding_id: 2, source_type: 'vocabulary',    source_id: 10, language_code: 'es', content_text: 'mercado — market',                      similarity: 0.88 },
  { embedding_id: 3, source_type: 'vocabulary',    source_id: 12, language_code: 'es', content_text: 'cuánto — how much',                     similarity: 0.82 },
  { embedding_id: 4, source_type: 'grammar_point', source_id: 20, language_code: 'es', content_text: '¿Cuánto cuesta...? — Price Questions',  similarity: 0.54 },
  { embedding_id: 5, source_type: 'node_text',     source_id: 1,  language_code: 'en', content_text: 'It is a sunny morning.',                 similarity: 0.31 },
];

// ---------------------------------------------------------------------------
// Mock factory helpers — dependency injection (no jest.mock needed)
// ---------------------------------------------------------------------------
function buildMockOpenAI(): RagOpenAIClient {
  return {
    embeddings: {
      create: jest.fn().mockResolvedValue({ data: [{ embedding: FAKE_EMBEDDING }] }),
    },
  };
}

function buildMockSupabase(
  chunks: RetrievedChunk[] = MOCK_CHUNKS,
  error: { message: string } | null = null
): RagSupabaseClient {
  return {
    rpc: jest.fn().mockResolvedValue({ data: chunks, error }),
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('constants', () => {
  it('DEFAULT_TOP_N is a positive integer', () => {
    expect(DEFAULT_TOP_N).toBeGreaterThan(0);
    expect(Number.isInteger(DEFAULT_TOP_N)).toBe(true);
  });

  it('RETRIEVAL_MODEL is text-embedding-3-small', () => {
    expect(RETRIEVAL_MODEL).toBe('text-embedding-3-small');
  });
});

// ---------------------------------------------------------------------------
// Embedding generation for the query
// ---------------------------------------------------------------------------
describe('retrieveChunks — query embedding', () => {
  it('calls openai.embeddings.create with model text-embedding-3-small', async () => {
    const openai = buildMockOpenAI();
    await retrieveChunks(buildMockSupabase(), openai, 'market shopping');
    expect(openai.embeddings.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'text-embedding-3-small' })
    );
  });

  it('passes the query string as a single-item input array', async () => {
    const openai = buildMockOpenAI();
    await retrieveChunks(buildMockSupabase(), openai, 'how to greet a vendor');
    expect(openai.embeddings.create).toHaveBeenCalledWith(
      expect.objectContaining({ input: ['how to greet a vendor'] })
    );
  });

  it('throws when the OpenAI embedding call fails', async () => {
    const openai: RagOpenAIClient = {
      embeddings: { create: jest.fn().mockRejectedValue(new Error('OpenAI 429')) },
    };
    await expect(retrieveChunks(buildMockSupabase(), openai, 'query')).rejects.toThrow('OpenAI 429');
  });
});

// ---------------------------------------------------------------------------
// pgvector RPC call
// ---------------------------------------------------------------------------
describe('retrieveChunks — RPC call', () => {
  it('calls supabase.rpc with match_embeddings and the generated embedding', async () => {
    const supabase = buildMockSupabase();
    const openai = buildMockOpenAI();
    await retrieveChunks(supabase, openai, 'query');
    expect(supabase.rpc).toHaveBeenCalledWith(
      'match_embeddings',
      expect.objectContaining({ query_embedding: FAKE_EMBEDDING })
    );
  });

  it('passes DEFAULT_TOP_N as match_count when no topN option is given', async () => {
    const supabase = buildMockSupabase();
    await retrieveChunks(supabase, buildMockOpenAI(), 'query');
    expect(supabase.rpc).toHaveBeenCalledWith(
      'match_embeddings',
      expect.objectContaining({ match_count: DEFAULT_TOP_N })
    );
  });

  it('passes a custom topN as match_count', async () => {
    const supabase = buildMockSupabase();
    await retrieveChunks(supabase, buildMockOpenAI(), 'query', { topN: 10 });
    expect(supabase.rpc).toHaveBeenCalledWith(
      'match_embeddings',
      expect.objectContaining({ match_count: 10 })
    );
  });

  it('passes filter_source_type as null by default', async () => {
    const supabase = buildMockSupabase();
    await retrieveChunks(supabase, buildMockOpenAI(), 'query');
    expect(supabase.rpc).toHaveBeenCalledWith(
      'match_embeddings',
      expect.objectContaining({ filter_source_type: null })
    );
  });

  it('passes the sourceType filter when provided', async () => {
    const supabase = buildMockSupabase();
    await retrieveChunks(supabase, buildMockOpenAI(), 'query', { sourceType: 'vocabulary' });
    expect(supabase.rpc).toHaveBeenCalledWith(
      'match_embeddings',
      expect.objectContaining({ filter_source_type: 'vocabulary' })
    );
  });

  it('throws when the RPC returns an error', async () => {
    const supabase = buildMockSupabase([], { message: 'function does not exist' });
    await expect(
      retrieveChunks(supabase, buildMockOpenAI(), 'query')
    ).rejects.toThrow('retrieval failed: function does not exist');
  });
});

// ---------------------------------------------------------------------------
// Result processing
// ---------------------------------------------------------------------------
describe('retrieveChunks — result processing', () => {
  it('returns chunks in the order provided by the RPC (similarity descending)', async () => {
    const result = await retrieveChunks(buildMockSupabase(), buildMockOpenAI(), 'query');
    expect(result[0].similarity).toBeGreaterThanOrEqual(result[1].similarity);
    expect(result[1].similarity).toBeGreaterThanOrEqual(result[2].similarity);
  });

  it('returns all chunks when minSimilarity is 0 (default)', async () => {
    const result = await retrieveChunks(buildMockSupabase(), buildMockOpenAI(), 'query');
    expect(result).toHaveLength(MOCK_CHUNKS.length);
  });

  it('filters out chunks below the minSimilarity threshold', async () => {
    const result = await retrieveChunks(
      buildMockSupabase(),
      buildMockOpenAI(),
      'query',
      { minSimilarity: 0.8 }
    );
    // MOCK_CHUNKS has 3 chunks with similarity >= 0.8 (0.93, 0.88, 0.82)
    expect(result).toHaveLength(3);
    result.forEach((c) => expect(c.similarity).toBeGreaterThanOrEqual(0.8));
  });

  it('returns empty array when RPC returns no results', async () => {
    const result = await retrieveChunks(
      buildMockSupabase([]),
      buildMockOpenAI(),
      'query'
    );
    expect(result).toEqual([]);
  });

  it('returns empty array when all chunks are below minSimilarity', async () => {
    const result = await retrieveChunks(
      buildMockSupabase(),
      buildMockOpenAI(),
      'query',
      { minSimilarity: 0.99 }
    );
    expect(result).toEqual([]);
  });

  it('preserves all chunk fields in the returned records', async () => {
    const result = await retrieveChunks(buildMockSupabase(), buildMockOpenAI(), 'query');
    const first = result[0];
    expect(first).toHaveProperty('embedding_id');
    expect(first).toHaveProperty('source_type');
    expect(first).toHaveProperty('source_id');
    expect(first).toHaveProperty('language_code');
    expect(first).toHaveProperty('content_text');
    expect(first).toHaveProperty('similarity');
  });
});
