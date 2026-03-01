/**
 * Sample Query Tests — V2.2 Retrieval
 *
 * Uses the actual "En el Mercado" seed story content as mock RPC fixtures.
 * Demonstrates the retrieval pipeline against realistic Spanish-language data
 * that matches what is live in embedding_store after running generate-embeddings.
 *
 * Queries are representative of what a learner or the grading subsystem would ask.
 */

import {
  retrieveChunks,
  type RagSupabaseClient,
  type RagOpenAIClient,
  type RetrievedChunk,
} from '@/lib/narrvoca/rag';

// ---------------------------------------------------------------------------
// En el Mercado — Seed story embedding fixtures
// Similarity scores approximate what cosine distance produces for each query.
// Arranged in similarity-descending order (as pgvector returns them).
// ---------------------------------------------------------------------------

// Fixture set A — "price of an item in Spanish"
const PRICE_CHUNKS: RetrievedChunk[] = [
  { embedding_id: 7,  source_type: 'node_text',     source_id: 5, language_code: 'es', content_text: '¿Cuánto cuesta una manzana?',                                       similarity: 0.94 },
  { embedding_id: 10, source_type: 'node_text',     source_id: 6, language_code: 'es', content_text: 'Una manzana cuesta dos pesos.',                                       similarity: 0.91 },
  { embedding_id: 20, source_type: 'grammar_point', source_id: 1, language_code: 'es', content_text: '¿Cuánto cuesta...? — Price Questions — Use "¿Cuánto cuesta + [noun]?" to ask the price of a single item.', similarity: 0.88 },
  { embedding_id: 3,  source_type: 'vocabulary',    source_id: 3, language_code: 'es', content_text: 'cuánto — how much',                                                   similarity: 0.85 },
  { embedding_id: 4,  source_type: 'vocabulary',    source_id: 4, language_code: 'es', content_text: 'cuesta — costs',                                                      similarity: 0.83 },
];

// Fixture set B — "greeting a shopkeeper in Spanish"
const GREETING_CHUNKS: RetrievedChunk[] = [
  { embedding_id: 5,  source_type: 'node_text',     source_id: 3, language_code: 'es', content_text: '¡Hola! ¡Bienvenida! ¿Qué desea?',                                    similarity: 0.92 },
  { embedding_id: 21, source_type: 'grammar_point', source_id: 2, language_code: 'es', content_text: 'Basic Greetings — Hola / Buenos días / Bienvenida — Use "Hola" (Hello) at any time of day.', similarity: 0.89 },
  { embedding_id: 6,  source_type: 'node_text',     source_id: 4, language_code: 'es', content_text: '¡Buenos días! Busco fruta, por favor.',                               similarity: 0.81 },
  { embedding_id: 8,  source_type: 'vocabulary',    source_id: 7, language_code: 'es', content_text: 'vendedor — vendor',                                                    similarity: 0.74 },
];

// Fixture set C — "paying and saying thank you"
const PAYMENT_CHUNKS: RetrievedChunk[] = [
  { embedding_id: 15, source_type: 'node_text',     source_id: 9,  language_code: 'es', content_text: 'María le da el dinero al vendedor y sonríe.',                       similarity: 0.90 },
  { embedding_id: 6,  source_type: 'vocabulary',    source_id: 6,  language_code: 'es', content_text: 'gracias — thank you',                                                similarity: 0.88 },
  { embedding_id: 8,  source_type: 'vocabulary',    source_id: 8,  language_code: 'es', content_text: 'dinero — money',                                                     similarity: 0.85 },
  { embedding_id: 16, source_type: 'node_text',     source_id: 10, language_code: 'es', content_text: '¡Gracias! ¡Que tenga un buen día!',                                 similarity: 0.83 },
  { embedding_id: 17, source_type: 'node_text',     source_id: 11, language_code: 'es', content_text: '¡Muchas gracias! ¡Adiós!',                                           similarity: 0.79 },
];

const FAKE_EMBEDDING = Array.from({ length: 1536 }, (_, i) => i / 1536);

function buildOpenAI(): RagOpenAIClient {
  return {
    embeddings: {
      create: jest.fn().mockResolvedValue({ data: [{ embedding: FAKE_EMBEDDING }] }),
    },
  };
}

function buildSupabase(chunks: RetrievedChunk[]): RagSupabaseClient {
  return { rpc: jest.fn().mockResolvedValue({ data: chunks, error: null }) };
}

// ---------------------------------------------------------------------------
// Query A — price questions
// ---------------------------------------------------------------------------
describe('sample query: "price of an item in Spanish"', () => {
  it('returns 5 chunks by default, led by ¿Cuánto cuesta? node_text', async () => {
    const result = await retrieveChunks(buildSupabase(PRICE_CHUNKS), buildOpenAI(), 'price of an item in Spanish');
    expect(result).toHaveLength(5);
    expect(result[0].content_text).toContain('¿Cuánto cuesta');
    expect(result[0].similarity).toBeCloseTo(0.94);
  });

  it('top chunk is node_text, third chunk is grammar_point about price questions', async () => {
    const result = await retrieveChunks(buildSupabase(PRICE_CHUNKS), buildOpenAI(), 'price of an item in Spanish');
    expect(result[0].source_type).toBe('node_text');
    expect(result[2].source_type).toBe('grammar_point');
    expect(result[2].content_text).toContain('Price Questions');
  });

  it('topN=3 limits results to the three most relevant chunks', async () => {
    const supabase = buildSupabase(PRICE_CHUNKS.slice(0, 3));
    const result = await retrieveChunks(supabase, buildOpenAI(), 'price of an item', { topN: 3 });
    expect(result).toHaveLength(3);
    expect(supabase.rpc).toHaveBeenCalledWith('match_embeddings', expect.objectContaining({ match_count: 3 }));
  });
});

// ---------------------------------------------------------------------------
// Query B — greetings
// ---------------------------------------------------------------------------
describe('sample query: "greeting a shopkeeper in Spanish"', () => {
  it('top chunk is the vendor greeting dialogue node_text', async () => {
    const result = await retrieveChunks(buildSupabase(GREETING_CHUNKS), buildOpenAI(), 'greeting a shopkeeper in Spanish');
    expect(result[0].source_type).toBe('node_text');
    expect(result[0].content_text).toContain('¡Hola!');
  });

  it('second chunk is the grammar_point about greetings', async () => {
    const result = await retrieveChunks(buildSupabase(GREETING_CHUNKS), buildOpenAI(), 'greeting a shopkeeper');
    expect(result[1].source_type).toBe('grammar_point');
    expect(result[1].content_text).toContain('Basic Greetings');
  });

  it('sourceType=node_text filter is passed to the RPC', async () => {
    const supabase = buildSupabase(GREETING_CHUNKS.filter((c) => c.source_type === 'node_text'));
    await retrieveChunks(supabase, buildOpenAI(), 'greeting shopkeeper', { sourceType: 'node_text' });
    expect(supabase.rpc).toHaveBeenCalledWith('match_embeddings', expect.objectContaining({ filter_source_type: 'node_text' }));
  });
});

// ---------------------------------------------------------------------------
// Query C — payment / closing scene
// ---------------------------------------------------------------------------
describe('sample query: "paying and saying thank you"', () => {
  it('top chunk is the payment narration node_text', async () => {
    const result = await retrieveChunks(buildSupabase(PAYMENT_CHUNKS), buildOpenAI(), 'paying and saying thank you');
    expect(result[0].source_type).toBe('node_text');
    expect(result[0].content_text).toContain('dinero');
  });

  it('includes vocab chunks for gracias and dinero', async () => {
    const result = await retrieveChunks(buildSupabase(PAYMENT_CHUNKS), buildOpenAI(), 'paying saying thank you');
    const vocabChunks = result.filter((c) => c.source_type === 'vocabulary');
    expect(vocabChunks.length).toBeGreaterThanOrEqual(2);
    const terms = vocabChunks.map((c) => c.content_text);
    expect(terms.some((t) => t.includes('gracias'))).toBe(true);
    expect(terms.some((t) => t.includes('dinero'))).toBe(true);
  });

  it('minSimilarity=0.85 excludes the lower-scoring closing dialogue chunks', async () => {
    const result = await retrieveChunks(
      buildSupabase(PAYMENT_CHUNKS),
      buildOpenAI(),
      'paying saying thank you',
      { minSimilarity: 0.85 }
    );
    // Only chunks with similarity >= 0.85: 0.90, 0.88, 0.85 → 3 chunks
    expect(result).toHaveLength(3);
    result.forEach((c) => expect(c.similarity).toBeGreaterThanOrEqual(0.85));
  });
});
