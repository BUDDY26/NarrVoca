-- =============================================================================
-- NarrVoca Seed Rollback — Migration 002
-- Removes the "En el Mercado" seed story and all associated rows.
-- Because all FKs use ON DELETE RESTRICT, rows must be deleted
-- in reverse dependency order (children before parents).
-- =============================================================================

DO $$
DECLARE
  v_story_id bigint;
BEGIN
  -- Find the seed story by its unique title + language
  SELECT story_id INTO v_story_id
  FROM stories
  WHERE title = 'En el Mercado' AND target_language = 'es'
  LIMIT 1;

  IF v_story_id IS NULL THEN
    RAISE NOTICE 'Seed story not found — nothing to roll back.';
    RETURN;
  END IF;

  -- Delete in reverse FK dependency order

  -- Interaction log rows referencing seed nodes
  DELETE FROM interaction_log
  WHERE node_id IN (SELECT node_id FROM story_nodes WHERE story_id = v_story_id);

  -- User progress rows referencing seed nodes
  DELETE FROM user_node_progress
  WHERE node_id IN (SELECT node_id FROM story_nodes WHERE story_id = v_story_id);

  -- Associative tables referencing seed nodes
  DELETE FROM node_grammar
  WHERE node_id IN (SELECT node_id FROM story_nodes WHERE story_id = v_story_id);

  DELETE FROM node_vocabulary
  WHERE node_id IN (SELECT node_id FROM story_nodes WHERE story_id = v_story_id);

  -- Branching logic referencing seed nodes (both source and destination)
  DELETE FROM branching_logic
  WHERE node_id     IN (SELECT node_id FROM story_nodes WHERE story_id = v_story_id)
     OR next_node_id IN (SELECT node_id FROM story_nodes WHERE story_id = v_story_id);

  -- Node text
  DELETE FROM node_text
  WHERE node_id IN (SELECT node_id FROM story_nodes WHERE story_id = v_story_id);

  -- Nodes
  DELETE FROM story_nodes WHERE story_id = v_story_id;

  -- Story
  DELETE FROM stories WHERE story_id = v_story_id;

  -- Vocabulary (only the 8 words seeded for this story, identified by unique term+lang+low difficulty)
  DELETE FROM vocabulary
  WHERE language_code = 'es'
    AND term IN ('mercado','manzana','cuánto','cuesta','por favor','gracias','vendedor','dinero');

  -- Grammar points seeded for this story
  DELETE FROM grammar_points
  WHERE language_code = 'es'
    AND rule_name IN (
      '¿Cuánto cuesta...? — Price Questions',
      'Basic Greetings — Hola / Buenos días / Bienvenida'
    );

  RAISE NOTICE 'Seed rollback complete — removed story_id: %', v_story_id;
END;
$$;
