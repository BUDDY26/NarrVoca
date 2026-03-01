-- =============================================================================
-- NarrVoca RAG — Migration 004
-- Creates the match_embeddings SQL function for pgvector cosine similarity search.
-- Must be run AFTER Migration 003 (which creates embedding_store + enables vector).
--
-- Called from the application via:
--   supabase.rpc('match_embeddings', { query_embedding, match_count, filter_source_type })
--
-- Returns rows ordered by cosine similarity descending (most similar first).
-- filter_source_type = NULL returns all source types.
-- =============================================================================

CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding    vector(1536),
  match_count        int     DEFAULT 5,
  filter_source_type text    DEFAULT NULL
)
RETURNS TABLE (
  embedding_id  bigint,
  source_type   text,
  source_id     bigint,
  language_code text,
  content_text  text,
  similarity    float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.embedding_id,
    e.source_type,
    e.source_id,
    e.language_code,
    e.content_text,
    (1 - (e.embedding <=> query_embedding))::float AS similarity
  FROM embedding_store e
  WHERE
    filter_source_type IS NULL
    OR e.source_type = filter_source_type
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
