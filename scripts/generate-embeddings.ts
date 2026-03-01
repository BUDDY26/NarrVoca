// =============================================================================
// NarrVoca 2.0 — Embedding Generation Script
// Generates OpenAI text-embedding-3-small vectors for all existing story
// content (node_text, vocabulary, grammar_points) and upserts them into
// the embedding_store table.
//
// Usage (run from project root):
//   npx tsx scripts/generate-embeddings.ts
//
// Required env vars:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   ← service role key (bypasses RLS)
//   OPENAI_API_KEY
// =============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const DEFAULT_BATCH_SIZE = 20;

// ---------------------------------------------------------------------------
// Minimal client interfaces — used for dependency injection in tests
// ---------------------------------------------------------------------------
export interface MinimalSupabaseClient {
  from: (table: string) => {
    select: (columns: string) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
    upsert: (rows: Record<string, unknown>[], options?: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
}

export interface MinimalOpenAI {
  embeddings: {
    create: (params: { model: string; input: string[] }) => Promise<{
      data: Array<{ embedding: number[] }>;
    }>;
  };
}

// ---------------------------------------------------------------------------
// EmbeddingSourceRecord — a single content item ready to embed
// ---------------------------------------------------------------------------
export interface EmbeddingSourceRecord {
  source_type: 'node_text' | 'vocabulary' | 'grammar_point';
  source_id: number;
  language_code: string | null;
  content_text: string;
}

// ---------------------------------------------------------------------------
// fetchSourceRecords
// Fetches all embeddable content from the three source tables.
// Returns an array of EmbeddingSourceRecord, one per content row.
// ---------------------------------------------------------------------------
export async function fetchSourceRecords(
  supabase: MinimalSupabaseClient
): Promise<EmbeddingSourceRecord[]> {
  const records: EmbeddingSourceRecord[] = [];

  // --- node_text ---
  const { data: nodeTexts, error: ntError } = await supabase
    .from('node_text')
    .select('node_text_id, language_code, text_content');
  if (ntError) throw new Error(`node_text fetch failed: ${ntError.message}`);

  for (const row of nodeTexts ?? []) {
    if (row.text_content) {
      records.push({
        source_type: 'node_text',
        source_id: row.node_text_id as number,
        language_code: row.language_code as string | null,
        content_text: row.text_content as string,
      });
    }
  }

  // --- vocabulary ---
  const { data: vocab, error: vError } = await supabase
    .from('vocabulary')
    .select('vocab_id, language_code, term, translation_en, pinyin');
  if (vError) throw new Error(`vocabulary fetch failed: ${vError.message}`);

  for (const row of vocab ?? []) {
    const parts = [row.term, row.translation_en, row.pinyin].filter(Boolean);
    records.push({
      source_type: 'vocabulary',
      source_id: row.vocab_id as number,
      language_code: row.language_code as string | null,
      content_text: parts.join(' — '),
    });
  }

  // --- grammar_points ---
  const { data: grammar, error: gError } = await supabase
    .from('grammar_points')
    .select('grammar_id, language_code, rule_name, explanation_en, example_target');
  if (gError) throw new Error(`grammar_points fetch failed: ${gError.message}`);

  for (const row of grammar ?? []) {
    const parts = [row.rule_name, row.explanation_en, row.example_target].filter(Boolean);
    records.push({
      source_type: 'grammar_point',
      source_id: row.grammar_id as number,
      language_code: row.language_code as string | null,
      content_text: parts.join(' — '),
    });
  }

  return records;
}

// ---------------------------------------------------------------------------
// generateEmbeddings
// Calls OpenAI embeddings.create for a batch of texts.
// Returns a number[][] — one embedding vector per input text.
// ---------------------------------------------------------------------------
export async function generateEmbeddings(
  openai: MinimalOpenAI,
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  return response.data.map((item: { embedding: number[] }) => item.embedding);
}

// ---------------------------------------------------------------------------
// upsertEmbeddings
// Upserts embedding rows into embedding_store.
// ON CONFLICT (source_type, source_id) — updates the existing vector.
// Embedding is passed as a number[] — Supabase casts it to vector(1536).
// ---------------------------------------------------------------------------
export async function upsertEmbeddings(
  supabase: MinimalSupabaseClient,
  records: EmbeddingSourceRecord[],
  embeddings: number[][]
): Promise<void> {
  const rows = records.map((rec, i) => ({
    source_type: rec.source_type,
    source_id: rec.source_id,
    language_code: rec.language_code,
    content_text: rec.content_text,
    embedding: embeddings[i],          // number[] — Supabase handles vector cast
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('embedding_store')
    .upsert(rows as Record<string, unknown>[], { onConflict: 'source_type,source_id' } as Record<string, unknown>);

  if (error) throw new Error(`upsert failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// runEmbeddingGeneration
// Orchestrates the full pipeline: fetch → batch → embed → upsert.
// Returns a summary of records processed and batches executed.
// ---------------------------------------------------------------------------
export async function runEmbeddingGeneration(
  supabase: MinimalSupabaseClient,
  openai: MinimalOpenAI,
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<{ processed: number; batches: number }> {
  const records = await fetchSourceRecords(supabase);
  let processed = 0;
  let batches = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const texts = batch.map((r) => r.content_text);
    const embeddings = await generateEmbeddings(openai, texts);
    await upsertEmbeddings(supabase, batch, embeddings);
    processed += batch.length;
    batches += 1;
  }

  return { processed, batches };
}

// ---------------------------------------------------------------------------
// Main — only runs when executed directly via tsx / ts-node
// ---------------------------------------------------------------------------
if (typeof require !== 'undefined' && require.main === module) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey || !openaiKey) {
    console.error(
      'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY'
    );
    process.exit(1);
  }

  console.log('Supabase URL:', supabaseUrl);

  const supabase = createClient(supabaseUrl, supabaseKey) as unknown as MinimalSupabaseClient;
  const openai = new OpenAI({ apiKey: openaiKey }) as unknown as MinimalOpenAI;

  console.log(`Starting embedding generation (model: ${EMBEDDING_MODEL}, batch size: ${DEFAULT_BATCH_SIZE})...`);

  runEmbeddingGeneration(supabase, openai)
    .then(({ processed, batches }) => {
      console.log(`Done. ${processed} embeddings generated in ${batches} batch(es).`);
    })
    .catch((err: Error) => {
      console.error('Embedding generation failed:\n', err.stack ?? err.message);
      process.exit(1);
    });
}
