// =============================================================================
// NarrVoca 2.0 — Single-record embedding library
// Embeds one content record and upserts it into embedding_store.
// Used by the embed-content API route for auto-embedding on content creation.
// =============================================================================

export const EMBED_MODEL = 'text-embedding-3-small';

export type SourceType = 'node_text' | 'vocabulary' | 'grammar_point';

// ---------------------------------------------------------------------------
// DI interfaces — enables unit testing without jest.mock
// ---------------------------------------------------------------------------
export interface EmbedSupabaseClient {
  from: (table: string) => {
    upsert: (
      rows: unknown[],
      options?: { onConflict?: string }
    ) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: { embedding_id: number } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

export interface EmbedOpenAIClient {
  embeddings: {
    create: (params: {
      model: string;
      input: string[];
    }) => Promise<{
      data: Array<{ embedding: number[] }>;
    }>;
  };
}

export interface EmbedRecord {
  source_type: SourceType;
  source_id: number;
  content_text: string;
  language_code?: string | null;
}

// ---------------------------------------------------------------------------
// embedSingleRecord
// 1. Generates an embedding for the record's content_text via OpenAI
// 2. Upserts the embedding into embedding_store (idempotent — updates on conflict)
// 3. Returns { embedding_id } of the inserted/updated row
// ---------------------------------------------------------------------------
export async function embedSingleRecord(
  supabase: EmbedSupabaseClient,
  openai: EmbedOpenAIClient,
  record: EmbedRecord
): Promise<{ embedding_id: number }> {
  // Step 1 — generate embedding vector
  const response = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: [record.content_text],
  });
  const embedding = response.data[0].embedding;

  // Step 2 — upsert into embedding_store
  const { data, error } = await supabase
    .from('embedding_store')
    .upsert(
      [
        {
          source_type: record.source_type,
          source_id: record.source_id,
          language_code: record.language_code ?? null,
          content_text: record.content_text,
          embedding,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'source_type,source_id' }
    )
    .select('embedding_id')
    .single();

  if (error) throw new Error(`embed failed: ${error.message}`);

  return { embedding_id: (data as { embedding_id: number }).embedding_id };
}
