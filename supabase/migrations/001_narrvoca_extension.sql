-- =============================================================================
-- NarrVoca Extension Schema — Migration 001
-- Course:  CSCI 6333 — Database Systems
-- Project: NarrVoca (Based on Vocora)
-- Date:    2026-02-27
--
-- Creates the 11 new NarrVoca tables on top of the existing 5 Vocora tables.
-- Run this in the Supabase SQL Editor (or via psql).
-- Safe to run on a fresh schema — all tables are created with IF NOT EXISTS.
--
-- Dependency order (FK chain):
--   stories
--   vocabulary
--   grammar_points
--   story_nodes          → stories
--   node_text            → story_nodes
--   branching_logic      → story_nodes (×2)
--   node_vocabulary      → story_nodes, vocabulary
--   node_grammar         → story_nodes, grammar_points
--   user_node_progress   → story_nodes
--   user_vocab_mastery   → vocabulary
--   interaction_log      → story_nodes
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. stories
--    Master record for each structured narrative story.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stories (
  story_id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title            text        NOT NULL,
  target_language  text        NOT NULL CHECK (target_language IN ('es', 'zh')),
  difficulty_level text        CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  genre            text,
  created_at       timestamptz DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- 2. vocabulary
--    Shared master vocabulary dictionary, reusable across all stories.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vocabulary (
  vocab_id        bigint   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  language_code   text     NOT NULL CHECK (language_code IN ('es', 'zh')),
  term            text     NOT NULL,
  translation_en  text,
  pinyin          text,                        -- Romanization for zh only; NULL for es
  difficulty_score numeric CHECK (difficulty_score >= 0.0 AND difficulty_score <= 1.0)
);


-- -----------------------------------------------------------------------------
-- 3. grammar_points
--    Grammar rules linked to story nodes for tutoring and evaluation.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grammar_points (
  grammar_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  language_code   text   NOT NULL CHECK (language_code IN ('es', 'zh')),
  rule_name       text   NOT NULL,
  explanation_en  text,
  example_target  text                         -- Example sentence in target language
);


-- -----------------------------------------------------------------------------
-- 4. story_nodes
--    Scene-level decomposition of a story. Each node is one interactive moment.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_nodes (
  node_id             bigint   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  story_id            bigint   NOT NULL REFERENCES stories(story_id) ON DELETE RESTRICT,
  sequence_order      integer,
  context_description text,
  is_checkpoint       boolean  DEFAULT false   -- TRUE = node triggers a practice assessment
);


-- -----------------------------------------------------------------------------
-- 5. node_text
--    Stores the actual text content of a node in one or more languages.
--    One node can have rows for 'en', 'es', and/or 'zh'.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS node_text (
  node_text_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  node_id       bigint NOT NULL REFERENCES story_nodes(node_id) ON DELETE RESTRICT,
  language_code text   NOT NULL CHECK (language_code IN ('en', 'es', 'zh')),
  speaker       text,                          -- Character name or 'narrator'
  text_type     text   CHECK (text_type IN ('narration', 'dialogue', 'prompt')),
  text_content  text,
  pinyin        text                           -- Romanization for zh rows; NULL otherwise
);


-- -----------------------------------------------------------------------------
-- 6. branching_logic
--    Defines outgoing transitions from a node.
--    condition_type: 'score_threshold' | 'choice' | 'default'
--    condition_value: e.g., '0.7' (pass threshold), 'A' (user choice label)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branching_logic (
  branch_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  node_id          bigint NOT NULL REFERENCES story_nodes(node_id) ON DELETE RESTRICT,
  condition_type   text   CHECK (condition_type IN ('score_threshold', 'choice', 'default')),
  condition_value  text,
  next_node_id     bigint NOT NULL REFERENCES story_nodes(node_id)
);


-- -----------------------------------------------------------------------------
-- 7. node_vocabulary  (Associative — M:N between story_nodes and vocabulary)
--    is_target = TRUE means this word is a key learning target for the node.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS node_vocabulary (
  node_id    bigint  NOT NULL REFERENCES story_nodes(node_id) ON DELETE RESTRICT,
  vocab_id   bigint  NOT NULL REFERENCES vocabulary(vocab_id) ON DELETE RESTRICT,
  is_target  boolean DEFAULT false,
  PRIMARY KEY (node_id, vocab_id)
);


-- -----------------------------------------------------------------------------
-- 8. node_grammar  (Associative — M:N between story_nodes and grammar_points)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS node_grammar (
  node_id     bigint NOT NULL REFERENCES story_nodes(node_id)     ON DELETE RESTRICT,
  grammar_id  bigint NOT NULL REFERENCES grammar_points(grammar_id) ON DELETE RESTRICT,
  PRIMARY KEY (node_id, grammar_id)
);


-- -----------------------------------------------------------------------------
-- 9. user_node_progress  (Associative — M:N between auth.users and story_nodes)
--    Tracks each user's status and best score for every node they touch.
--    uid is managed by Supabase Auth — no FK to auth.users needed.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_node_progress (
  uid           uuid    NOT NULL,
  node_id       bigint  NOT NULL REFERENCES story_nodes(node_id) ON DELETE RESTRICT,
  status        text    DEFAULT 'not_started'
                        CHECK (status IN ('not_started', 'in_progress', 'completed')),
  best_score    numeric CHECK (best_score >= 0.0 AND best_score <= 1.0),
  completed_at  timestamptz,                   -- NULL until node is completed
  PRIMARY KEY (uid, node_id)
);


-- -----------------------------------------------------------------------------
-- 10. user_vocab_mastery  (Associative — M:N between auth.users and vocabulary)
--     Tracks per-user mastery and supports spaced repetition scheduling.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_vocab_mastery (
  uid             uuid    NOT NULL,
  vocab_id        bigint  NOT NULL REFERENCES vocabulary(vocab_id) ON DELETE RESTRICT,
  mastery_score   numeric DEFAULT 0.0
                          CHECK (mastery_score >= 0.0 AND mastery_score <= 1.0),
  next_review_at  timestamptz,                 -- Spaced repetition next review date
  PRIMARY KEY (uid, vocab_id)
);


-- -----------------------------------------------------------------------------
-- 11. interaction_log
--     Logs every learner response at a node: input, AI feedback, accuracy score.
--     Used for adaptive branching decisions and performance analytics.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interaction_log (
  interaction_id  bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uid             uuid        NOT NULL,
  node_id         bigint      NOT NULL REFERENCES story_nodes(node_id) ON DELETE RESTRICT,
  user_input      text,
  llm_feedback    text,
  accuracy_score  numeric     CHECK (accuracy_score >= 0.0 AND accuracy_score <= 1.0),
  created_at      timestamptz DEFAULT now()
);


-- =============================================================================
-- Indexes for common query patterns
-- (These are optional performance improvements — safe to skip if not needed yet)
-- =============================================================================

-- Look up all nodes for a story (used by narrative reader)
CREATE INDEX IF NOT EXISTS idx_story_nodes_story_id
  ON story_nodes(story_id);

-- Look up all text for a node (used by narrative reader per language)
CREATE INDEX IF NOT EXISTS idx_node_text_node_id
  ON node_text(node_id);

-- Look up branches leaving a node (used by branching resolver)
CREATE INDEX IF NOT EXISTS idx_branching_logic_node_id
  ON branching_logic(node_id);

-- Look up a user's progress across all nodes
CREATE INDEX IF NOT EXISTS idx_user_node_progress_uid
  ON user_node_progress(uid);

-- Look up a user's vocab mastery (spaced repetition queue)
CREATE INDEX IF NOT EXISTS idx_user_vocab_mastery_uid_review
  ON user_vocab_mastery(uid, next_review_at);

-- Look up all interactions by a user (analytics / history)
CREATE INDEX IF NOT EXISTS idx_interaction_log_uid
  ON interaction_log(uid);
