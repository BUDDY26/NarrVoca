import fs from 'fs';
import path from 'path';

const SQL = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/004_match_embeddings_fn.sql'),
  'utf-8'
);

// ---------------------------------------------------------------------------
// Migration 004 — match_embeddings SQL function
// Verifies the SQL file is structurally correct without a live database.
// ---------------------------------------------------------------------------

describe('Migration 004 — match_embeddings SQL function', () => {
  it('creates or replaces the match_embeddings function', () => {
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION match_embeddings');
  });

  it('accepts query_embedding as vector(1536)', () => {
    expect(SQL).toMatch(/query_embedding\s+vector\(1536\)/);
  });

  it('accepts match_count parameter with a default', () => {
    expect(SQL).toMatch(/match_count\s+int.*DEFAULT\s+\d+/);
  });

  it('accepts filter_source_type parameter defaulting to NULL', () => {
    expect(SQL).toMatch(/filter_source_type\s+text.*DEFAULT\s+NULL/);
  });

  it('returns an embedding_id column', () => {
    expect(SQL).toContain('embedding_id');
  });

  it('returns a similarity column', () => {
    expect(SQL).toContain('similarity');
  });

  it('queries the embedding_store table', () => {
    expect(SQL).toContain('embedding_store');
  });

  it('computes similarity using the cosine distance operator (1 - <=>)', () => {
    expect(SQL).toContain('<=>');
    // Cosine SIMILARITY = 1 minus cosine DISTANCE
    expect(SQL).toMatch(/1\s*-\s*\(.*<=>/);
  });

  it('orders results by cosine distance ascending so most similar comes first', () => {
    expect(SQL).toMatch(/ORDER BY.*<=>/);
  });

  it('limits results to match_count', () => {
    expect(SQL).toContain('LIMIT match_count');
  });

  it('applies filter_source_type when it is not NULL', () => {
    // The WHERE clause must handle the optional filter
    expect(SQL).toMatch(/filter_source_type IS NULL\s+OR/);
  });

  it('is declared STABLE (read-only, repeatable within a transaction)', () => {
    expect(SQL).toContain('STABLE');
  });
});
