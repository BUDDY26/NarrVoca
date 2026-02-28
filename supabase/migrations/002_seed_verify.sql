-- =============================================================================
-- NarrVoca Seed Verification — run after 002_seed_sample_story.sql
-- Paste each block separately in Supabase SQL Editor to confirm seeding.
-- =============================================================================

-- 1. Confirm 1 story, 4 nodes, 2 grammar rules, 8 vocab words
SELECT 'stories'       AS table_name, COUNT(*) AS rows FROM stories
UNION ALL
SELECT 'story_nodes',               COUNT(*) FROM story_nodes
UNION ALL
SELECT 'node_text',                 COUNT(*) FROM node_text
UNION ALL
SELECT 'branching_logic',           COUNT(*) FROM branching_logic
UNION ALL
SELECT 'vocabulary',                COUNT(*) FROM vocabulary
UNION ALL
SELECT 'grammar_points',            COUNT(*) FROM grammar_points
UNION ALL
SELECT 'node_vocabulary',           COUNT(*) FROM node_vocabulary
UNION ALL
SELECT 'node_grammar',              COUNT(*) FROM node_grammar;

-- Expected output:
--   stories          | 1
--   story_nodes      | 4
--   node_text        | 16    (4 nodes × 2 languages, Node 3 has 3 pairs = 6, others 2 each = 14... see note)
--   branching_logic  | 4
--   vocabulary       | 8
--   grammar_points   | 2
--   node_vocabulary  | 10
--   node_grammar     | 2
--
-- node_text breakdown:
--   Node 1: 2 rows (1 narration × en/es)
--   Node 2: 4 rows (2 dialogue lines × en/es)
--   Node 3: 6 rows (3 lines × en/es: 2 dialogue + 1 prompt)
--   Node 4: 6 rows (3 lines × en/es: 1 narration + 2 dialogue)
--   Total:  18 rows


-- 2. Full story + nodes drill-down
SELECT
  s.story_id,
  s.title,
  s.target_language,
  s.difficulty_level,
  n.node_id,
  n.sequence_order,
  n.is_checkpoint,
  n.context_description
FROM stories     s
JOIN story_nodes n ON n.story_id = s.story_id
WHERE s.title = 'En el Mercado'
ORDER BY n.sequence_order;


-- 3. All text for every node (bilingual view)
SELECT
  n.sequence_order AS node,
  nt.language_code AS lang,
  nt.speaker,
  nt.text_type,
  nt.text_content
FROM stories     s
JOIN story_nodes n  ON n.story_id  = s.story_id
JOIN node_text   nt ON nt.node_id  = n.node_id
WHERE s.title = 'En el Mercado'
ORDER BY n.sequence_order, nt.language_code, nt.text_type;


-- 4. Branching logic for the story
SELECT
  src.sequence_order AS from_node,
  bl.condition_type,
  bl.condition_value,
  dst.sequence_order AS to_node
FROM stories         s
JOIN story_nodes     src ON src.story_id    = s.story_id
JOIN branching_logic bl  ON bl.node_id      = src.node_id
JOIN story_nodes     dst ON dst.node_id     = bl.next_node_id
WHERE s.title = 'En el Mercado'
ORDER BY src.sequence_order;


-- 5. Vocabulary with target flags per node
SELECT
  n.sequence_order AS node,
  v.term,
  v.translation_en,
  nv.is_target
FROM stories        s
JOIN story_nodes    n  ON n.story_id  = s.story_id
JOIN node_vocabulary nv ON nv.node_id = n.node_id
JOIN vocabulary     v  ON v.vocab_id  = nv.vocab_id
WHERE s.title = 'En el Mercado'
ORDER BY n.sequence_order, nv.is_target DESC, v.term;


-- 6. Grammar points per node
SELECT
  n.sequence_order AS node,
  gp.rule_name,
  gp.explanation_en
FROM stories        s
JOIN story_nodes    n  ON n.story_id   = s.story_id
JOIN node_grammar   ng ON ng.node_id   = n.node_id
JOIN grammar_points gp ON gp.grammar_id = ng.grammar_id
WHERE s.title = 'En el Mercado'
ORDER BY n.sequence_order;
