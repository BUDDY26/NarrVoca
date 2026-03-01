-- =============================================================================
-- NarrVoca RAG Layer 4 Migration — Migration 003
-- Course:  CSCI 6333 — Database Systems
-- Project: NarrVoca 2.0
-- Date:    2026-02-28
--
-- Adds 6 RAG tables on top of the existing 16-table NarrVoca schema.
-- pgvector is enabled in this migration.
--
-- Dependency order (FK chain):
--   vector extension          (no deps — must be first)
--   embedding_store           (standalone — no FK deps)
--   rag_query_log             → story_nodes
--   rag_context_chunks        → rag_query_log, embedding_store
--   grading_rubrics           → story_nodes
--   checkpoint_grades         → story_nodes, interaction_log
--   tutor_sessions            → stories
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Enable pgvector — required before any vector(1536) columns can be created
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;


-- -----------------------------------------------------------------------------
-- 1. embedding_store
--    Central vector store for story nodes, vocabulary, and grammar points.
--    source_type + source_id uniquely identify the embedded content record.
--    HNSW index enables fast approximate nearest-neighbour retrieval.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS embedding_store (
  embedding_id  bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_type   text         NOT NULL
                             CHECK (source_type IN ('node_text', 'vocabulary', 'grammar_point')),
  source_id     bigint       NOT NULL,
  language_code text,
  content_text  text,                            -- text that was embedded (audit / debugging)
  embedding     vector(1536) NOT NULL,           -- OpenAI text-embedding-3-small output
  created_at    timestamptz  DEFAULT now(),
  updated_at    timestamptz  DEFAULT now(),
  UNIQUE (source_type, source_id)                -- one embedding per source record
);


-- -----------------------------------------------------------------------------
-- 2. rag_query_log
--    Audit log of every retrieval query issued by the application.
--    Captures the raw query text and optional embedding for offline analysis.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rag_query_log (
  query_id            bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uid                 uuid         NOT NULL,
  node_id             bigint       REFERENCES story_nodes(node_id) ON DELETE RESTRICT,
  query_text          text         NOT NULL,
  query_embedding     vector(1536),              -- stored for similarity analysis (nullable)
  source_type_filter  text,                      -- filter applied during retrieval (nullable)
  top_k               integer      DEFAULT 5,
  created_at          timestamptz  DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- 3. rag_context_chunks
--    Caches the top-k retrieved chunks for each query.
--    rank = 1 is the most similar chunk.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rag_context_chunks (
  chunk_id          bigint   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  query_id          bigint   NOT NULL REFERENCES rag_query_log(query_id)    ON DELETE RESTRICT,
  embedding_id      bigint   NOT NULL REFERENCES embedding_store(embedding_id) ON DELETE RESTRICT,
  rank              integer  NOT NULL,
  similarity_score  numeric  CHECK (similarity_score >= 0.0 AND similarity_score <= 1.0),
  chunk_text        text                          -- snapshot of text at retrieval time
);


-- -----------------------------------------------------------------------------
-- 4. grading_rubrics
--    Defines correct-answer criteria for checkpoint nodes.
--    Multiple rubric rows per node — each criterion has an independent weight.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grading_rubrics (
  rubric_id        bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  node_id          bigint      NOT NULL REFERENCES story_nodes(node_id) ON DELETE RESTRICT,
  criterion        text        NOT NULL,
  weight           numeric     DEFAULT 1.0 CHECK (weight >= 0.0 AND weight <= 1.0),
  example_correct  text,                         -- optional example of a correct response
  created_at       timestamptz DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- 5. checkpoint_grades
--    Stores AI grades per user per checkpoint attempt.
--    rubric_scores: JSONB map { "rubric_id": score } — one score per criterion.
--    overall_score: weighted aggregate across all rubric criteria.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checkpoint_grades (
  grade_id        bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uid             uuid        NOT NULL,
  node_id         bigint      NOT NULL REFERENCES story_nodes(node_id)         ON DELETE RESTRICT,
  interaction_id  bigint               REFERENCES interaction_log(interaction_id) ON DELETE RESTRICT,
  rubric_scores   jsonb,                         -- { "rubric_id": 0.85, ... }
  overall_score   numeric     NOT NULL CHECK (overall_score >= 0.0 AND overall_score <= 1.0),
  feedback        text,
  attempt_number  integer     DEFAULT 1,
  created_at      timestamptz DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- 6. tutor_sessions
--    Stores full tutor conversation history per user per story.
--    messages: JSONB array of { role: 'user'|'assistant', content: string }.
--    updated_at advances on every message append so the UI can poll freshness.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutor_sessions (
  session_id  bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uid         uuid        NOT NULL,
  story_id    bigint      NOT NULL REFERENCES stories(story_id) ON DELETE RESTRICT,
  messages    jsonb       NOT NULL DEFAULT '[]',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);


-- =============================================================================
-- Indexes
-- =============================================================================

-- HNSW vector index on embedding_store — cosine similarity for RAG retrieval
-- pgvector >= 0.5 required (Supabase provides 0.7+)
CREATE INDEX IF NOT EXISTS idx_embedding_store_hnsw
  ON embedding_store USING hnsw (embedding vector_cosine_ops);

-- B-tree index for fast source lookup (used when re-generating embeddings)
CREATE INDEX IF NOT EXISTS idx_embedding_store_source
  ON embedding_store(source_type, source_id);

-- rag_query_log — look up all queries by user or by node
CREATE INDEX IF NOT EXISTS idx_rag_query_log_uid
  ON rag_query_log(uid);

CREATE INDEX IF NOT EXISTS idx_rag_query_log_node_id
  ON rag_query_log(node_id);

-- rag_context_chunks — look up all chunks returned for a specific query
CREATE INDEX IF NOT EXISTS idx_rag_context_chunks_query_id
  ON rag_context_chunks(query_id);

-- grading_rubrics — look up criteria for a checkpoint node
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_node_id
  ON grading_rubrics(node_id);

-- checkpoint_grades — look up a user's attempt history at a specific node
CREATE INDEX IF NOT EXISTS idx_checkpoint_grades_uid_node
  ON checkpoint_grades(uid, node_id);

-- tutor_sessions — look up a user's active session for a story
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_uid_story
  ON tutor_sessions(uid, story_id);
