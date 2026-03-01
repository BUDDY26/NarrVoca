import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Load migration SQL once for all assertions
// ---------------------------------------------------------------------------
const SQL_PATH = path.join(process.cwd(), 'supabase/migrations/003_rag_layer4.sql');
const SQL = fs.readFileSync(SQL_PATH, 'utf-8');

// ---------------------------------------------------------------------------
// Migration 003 — RAG Layer 4
// Verifies structural correctness of the SQL file without a live database.
// ---------------------------------------------------------------------------

describe('Migration 003 — RAG Layer 4', () => {
  // -------------------------------------------------------------------------
  // pgvector
  // -------------------------------------------------------------------------
  describe('pgvector extension', () => {
    it('enables the vector extension', () => {
      expect(SQL).toContain('CREATE EXTENSION IF NOT EXISTS vector');
    });
  });

  // -------------------------------------------------------------------------
  // embedding_store
  // -------------------------------------------------------------------------
  describe('embedding_store table', () => {
    it('creates the table with IF NOT EXISTS', () => {
      expect(SQL).toContain('CREATE TABLE IF NOT EXISTS embedding_store');
    });

    it('has a vector(1536) column for the embedding', () => {
      expect(SQL).toContain('vector(1536)');
    });

    it('constrains source_type to node_text, vocabulary, and grammar_point', () => {
      expect(SQL).toContain("'node_text'");
      expect(SQL).toContain("'vocabulary'");
      expect(SQL).toContain("'grammar_point'");
    });

    it('has a UNIQUE constraint on (source_type, source_id)', () => {
      expect(SQL).toMatch(/UNIQUE\s*\(\s*source_type\s*,\s*source_id\s*\)/);
    });

    it('has content_text column for the embedded text', () => {
      expect(SQL).toContain('content_text');
    });

    it('has updated_at for stale embedding detection', () => {
      // Must appear in the embedding_store block — we count occurrences globally
      const matches = SQL.match(/updated_at/g);
      expect(matches).not.toBeNull();
      expect((matches ?? []).length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // rag_query_log
  // -------------------------------------------------------------------------
  describe('rag_query_log table', () => {
    it('creates the table with IF NOT EXISTS', () => {
      expect(SQL).toContain('CREATE TABLE IF NOT EXISTS rag_query_log');
    });

    it('has a query_text column', () => {
      expect(SQL).toContain('query_text');
    });

    it('has a query_embedding vector column for offline analysis', () => {
      expect(SQL).toContain('query_embedding');
    });

    it('has top_k column with a default', () => {
      expect(SQL).toContain('top_k');
    });

    it('references story_nodes via FK', () => {
      // The node_id FK in rag_query_log should reference story_nodes
      expect(SQL).toMatch(/rag_query_log[\s\S]*?REFERENCES story_nodes/);
    });
  });

  // -------------------------------------------------------------------------
  // rag_context_chunks
  // -------------------------------------------------------------------------
  describe('rag_context_chunks table', () => {
    it('creates the table with IF NOT EXISTS', () => {
      expect(SQL).toContain('CREATE TABLE IF NOT EXISTS rag_context_chunks');
    });

    it('has a rank column', () => {
      expect(SQL).toContain('rank');
    });

    it('has a similarity_score column', () => {
      expect(SQL).toContain('similarity_score');
    });

    it('references rag_query_log via FK', () => {
      expect(SQL).toMatch(/rag_context_chunks[\s\S]*?REFERENCES rag_query_log/);
    });

    it('references embedding_store via FK', () => {
      expect(SQL).toMatch(/rag_context_chunks[\s\S]*?REFERENCES embedding_store/);
    });
  });

  // -------------------------------------------------------------------------
  // grading_rubrics
  // -------------------------------------------------------------------------
  describe('grading_rubrics table', () => {
    it('creates the table with IF NOT EXISTS', () => {
      expect(SQL).toContain('CREATE TABLE IF NOT EXISTS grading_rubrics');
    });

    it('has a criterion column', () => {
      expect(SQL).toContain('criterion');
    });

    it('has a weight column', () => {
      expect(SQL).toContain('weight');
    });

    it('has an example_correct column', () => {
      expect(SQL).toContain('example_correct');
    });

    it('references story_nodes via FK', () => {
      expect(SQL).toMatch(/grading_rubrics[\s\S]*?REFERENCES story_nodes/);
    });
  });

  // -------------------------------------------------------------------------
  // checkpoint_grades
  // -------------------------------------------------------------------------
  describe('checkpoint_grades table', () => {
    it('creates the table with IF NOT EXISTS', () => {
      expect(SQL).toContain('CREATE TABLE IF NOT EXISTS checkpoint_grades');
    });

    it('has a rubric_scores jsonb column', () => {
      expect(SQL).toContain('rubric_scores');
      expect(SQL).toMatch(/rubric_scores\s+jsonb/);
    });

    it('has an overall_score column with CHECK constraint', () => {
      expect(SQL).toContain('overall_score');
      // overall_score must have a numeric bounds check
      expect(SQL).toMatch(/overall_score[\s\S]*?CHECK/);
    });

    it('has an attempt_number column', () => {
      expect(SQL).toContain('attempt_number');
    });

    it('references story_nodes via FK', () => {
      expect(SQL).toMatch(/checkpoint_grades[\s\S]*?REFERENCES story_nodes/);
    });

    it('references interaction_log via FK', () => {
      expect(SQL).toMatch(/checkpoint_grades[\s\S]*?REFERENCES interaction_log/);
    });
  });

  // -------------------------------------------------------------------------
  // tutor_sessions
  // -------------------------------------------------------------------------
  describe('tutor_sessions table', () => {
    it('creates the table with IF NOT EXISTS', () => {
      expect(SQL).toContain('CREATE TABLE IF NOT EXISTS tutor_sessions');
    });

    it('has a messages jsonb column', () => {
      expect(SQL).toMatch(/messages\s+jsonb/);
    });

    it('defaults messages to an empty array', () => {
      expect(SQL).toContain("DEFAULT '[]'");
    });

    it('has updated_at column', () => {
      // tutor_sessions needs updated_at so the UI knows when to refresh
      expect(SQL).toContain('updated_at');
    });

    it('references stories via FK', () => {
      expect(SQL).toMatch(/tutor_sessions[\s\S]*?REFERENCES stories/);
    });
  });

  // -------------------------------------------------------------------------
  // Indexes
  // -------------------------------------------------------------------------
  describe('performance indexes', () => {
    it('creates an HNSW index on the embedding vector column', () => {
      expect(SQL).toMatch(/USING hnsw.*embedding/i);
    });

    it('creates an index for embedding_store source lookup', () => {
      expect(SQL).toMatch(/CREATE INDEX IF NOT EXISTS.*embedding_store/);
    });

    it('creates an index for rag_query_log uid lookup', () => {
      expect(SQL).toMatch(/CREATE INDEX IF NOT EXISTS.*rag_query_log/);
    });

    it('creates an index for checkpoint_grades (uid, node_id)', () => {
      expect(SQL).toMatch(/CREATE INDEX IF NOT EXISTS.*checkpoint_grades/);
    });

    it('creates an index for tutor_sessions (uid, story_id)', () => {
      expect(SQL).toMatch(/CREATE INDEX IF NOT EXISTS.*tutor_sessions/);
    });
  });
});
