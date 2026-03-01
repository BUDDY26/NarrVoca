// =============================================================================
// NarrVoca 2.0 — RAG Retrieval Library
// Core retrieval function: embeds a query string and returns the top-N most
// similar chunks from embedding_store via pgvector cosine similarity.
// =============================================================================

// Model must match the one used in scripts/generate-embeddings.ts
export const RETRIEVAL_MODEL = 'text-embedding-3-small';
export const DEFAULT_TOP_N = 5;

// ---------------------------------------------------------------------------
// Minimal client interfaces — enable dependency injection for unit tests
// ---------------------------------------------------------------------------
export interface RagSupabaseClient {
  rpc: (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}

export interface RagOpenAIClient {
  embeddings: {
    create: (params: { model: string; input: string[] }) => Promise<{
      data: Array<{ embedding: number[] }>;
    }>;
  };
}

// ---------------------------------------------------------------------------
// RetrievedChunk — one result row from match_embeddings RPC
// ---------------------------------------------------------------------------
export interface RetrievedChunk {
  embedding_id: number;
  source_type: 'node_text' | 'vocabulary' | 'grammar_point';
  source_id: number;
  language_code: string | null;
  content_text: string;
  similarity: number;                // cosine similarity score [0, 1]
}

// ---------------------------------------------------------------------------
// RetrieveOptions
// ---------------------------------------------------------------------------
export interface RetrieveOptions {
  topN?: number;                     // max chunks to return (default: DEFAULT_TOP_N)
  sourceType?: 'node_text' | 'vocabulary' | 'grammar_point' | null;
  minSimilarity?: number;            // client-side threshold, default 0 (no filtering)
}

// ---------------------------------------------------------------------------
// retrieveChunks
// 1. Generates a query embedding via OpenAI text-embedding-3-small
// 2. Calls the match_embeddings RPC (pgvector cosine search)
// 3. Applies optional client-side minSimilarity filter
// Returns chunks ordered by similarity descending.
// ---------------------------------------------------------------------------
export async function retrieveChunks(
  supabase: RagSupabaseClient,
  openai: RagOpenAIClient,
  query: string,
  options: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const { topN = DEFAULT_TOP_N, sourceType = null, minSimilarity = 0 } = options;

  // Step 1 — embed the query
  const embeddingResponse = await openai.embeddings.create({
    model: RETRIEVAL_MODEL,
    input: [query],
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Step 2 — pgvector cosine similarity search
  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_count: topN,
    filter_source_type: sourceType,
  });

  if (error) throw new Error(`retrieval failed: ${error.message}`);

  const chunks = (data as RetrievedChunk[]) ?? [];

  // Step 3 — apply client-side similarity threshold
  return chunks.filter((c) => c.similarity >= minSimilarity);
}
