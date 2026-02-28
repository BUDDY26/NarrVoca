-- =============================================================================
-- NarrVoca Seed Data — Migration 002
-- Course:  CSCI 6333 — Database Systems
-- Project: NarrVoca (Based on Vocora)
-- Date:    2026-02-27
--
-- Seeds one complete sample story covering every table introduced in 001.
--
-- Story:  "En el Mercado" (At the Market)
-- Lang:   Spanish (es) | Difficulty: beginner | Genre: daily life
-- Nodes:  4  (Node 3 is a checkpoint)
-- Vocab:  8 words
-- Grammar: 2 rules
-- Branches: Node1→2 (default), Node2→3 (default),
--           Node3→4 (pass), Node3→2 (fail/retry)
--
-- Uses a PL/pgSQL DO block so every generated identity ID is captured in a
-- variable and used by subsequent INSERTs — no hardcoded IDs, safe to run
-- on any Supabase project regardless of existing sequence state.
-- =============================================================================

DO $$
DECLARE
  -- Story
  v_story_id          bigint;

  -- Story nodes
  v_node1_id          bigint;   -- Scene 1: Introduction narration
  v_node2_id          bigint;   -- Scene 2: Greeting the vendor (dialogue)
  v_node3_id          bigint;   -- Scene 3: Asking the price (checkpoint)
  v_node4_id          bigint;   -- Scene 4: Completing the purchase (narration)

  -- Vocabulary IDs
  v_vocab_mercado     bigint;   -- mercado    / market
  v_vocab_manzana     bigint;   -- manzana    / apple
  v_vocab_cuanto      bigint;   -- cuánto     / how much
  v_vocab_cuesta      bigint;   -- cuesta     / costs
  v_vocab_por_favor   bigint;   -- por favor  / please
  v_vocab_gracias     bigint;   -- gracias    / thank you
  v_vocab_vendedor    bigint;   -- vendedor   / vendor
  v_vocab_dinero      bigint;   -- dinero     / money

  -- Grammar point IDs
  v_grammar_cuanto    bigint;   -- ¿Cuánto cuesta...? question structure
  v_grammar_greet     bigint;   -- Basic Spanish greetings

BEGIN

  -- ===========================================================================
  -- SECTION 1 — VOCABULARY
  --   Inserted first because node_vocabulary FKs reference vocabulary.
  -- ===========================================================================

  INSERT INTO vocabulary (language_code, term, translation_en, pinyin, difficulty_score)
  VALUES ('es', 'mercado',   'market',     NULL, 0.2)
  RETURNING vocab_id INTO v_vocab_mercado;

  INSERT INTO vocabulary (language_code, term, translation_en, pinyin, difficulty_score)
  VALUES ('es', 'manzana',   'apple',      NULL, 0.2)
  RETURNING vocab_id INTO v_vocab_manzana;

  INSERT INTO vocabulary (language_code, term, translation_en, pinyin, difficulty_score)
  VALUES ('es', 'cuánto',    'how much',   NULL, 0.3)
  RETURNING vocab_id INTO v_vocab_cuanto;

  INSERT INTO vocabulary (language_code, term, translation_en, pinyin, difficulty_score)
  VALUES ('es', 'cuesta',    'costs',      NULL, 0.3)
  RETURNING vocab_id INTO v_vocab_cuesta;

  INSERT INTO vocabulary (language_code, term, translation_en, pinyin, difficulty_score)
  VALUES ('es', 'por favor', 'please',     NULL, 0.1)
  RETURNING vocab_id INTO v_vocab_por_favor;

  INSERT INTO vocabulary (language_code, term, translation_en, pinyin, difficulty_score)
  VALUES ('es', 'gracias',   'thank you',  NULL, 0.1)
  RETURNING vocab_id INTO v_vocab_gracias;

  INSERT INTO vocabulary (language_code, term, translation_en, pinyin, difficulty_score)
  VALUES ('es', 'vendedor',  'vendor',     NULL, 0.4)
  RETURNING vocab_id INTO v_vocab_vendedor;

  INSERT INTO vocabulary (language_code, term, translation_en, pinyin, difficulty_score)
  VALUES ('es', 'dinero',    'money',      NULL, 0.2)
  RETURNING vocab_id INTO v_vocab_dinero;


  -- ===========================================================================
  -- SECTION 2 — GRAMMAR POINTS
  --   Inserted before nodes because node_grammar FKs reference grammar_points.
  -- ===========================================================================

  INSERT INTO grammar_points (language_code, rule_name, explanation_en, example_target)
  VALUES (
    'es',
    '¿Cuánto cuesta...? — Price Questions',
    'Use "¿Cuánto cuesta + [noun]?" to ask the price of a single item. '
    'For plural items use "¿Cuánto cuestan + [plural noun]?"',
    '¿Cuánto cuesta una manzana?'
  )
  RETURNING grammar_id INTO v_grammar_cuanto;

  INSERT INTO grammar_points (language_code, rule_name, explanation_en, example_target)
  VALUES (
    'es',
    'Basic Greetings — Hola / Buenos días / Bienvenida',
    'Use "Hola" (Hello) at any time of day. Use "Buenos días" (Good morning) until noon. '
    '"Bienvenida" (Welcome, fem.) / "Bienvenido" (Welcome, masc.) greet arriving guests.',
    '¡Hola! ¡Buenos días! ¡Bienvenida!'
  )
  RETURNING grammar_id INTO v_grammar_greet;


  -- ===========================================================================
  -- SECTION 3 — STORY
  -- ===========================================================================

  INSERT INTO stories (title, target_language, difficulty_level, genre)
  VALUES ('En el Mercado', 'es', 'beginner', 'daily life')
  RETURNING story_id INTO v_story_id;


  -- ===========================================================================
  -- SECTION 4 — STORY NODES
  --   Inserted in sequence order.  Branching references are added in Section 7
  --   after all node IDs are known.
  -- ===========================================================================

  -- Node 1 — Narration intro
  INSERT INTO story_nodes (story_id, sequence_order, context_description, is_checkpoint)
  VALUES (
    v_story_id, 1,
    'Narrator sets the scene — María walks to the local market on a sunny morning.',
    false
  )
  RETURNING node_id INTO v_node1_id;

  -- Node 2 — Greeting dialogue
  INSERT INTO story_nodes (story_id, sequence_order, context_description, is_checkpoint)
  VALUES (
    v_story_id, 2,
    'María arrives at the fruit stand and exchanges greetings with the vendor.',
    false
  )
  RETURNING node_id INTO v_node2_id;

  -- Node 3 — Price question: CHECKPOINT
  INSERT INTO story_nodes (story_id, sequence_order, context_description, is_checkpoint)
  VALUES (
    v_story_id, 3,
    'María asks the price of an apple. Learner must ask the price of a banana to pass.',
    true
  )
  RETURNING node_id INTO v_node3_id;

  -- Node 4 — Purchase completion
  INSERT INTO story_nodes (story_id, sequence_order, context_description, is_checkpoint)
  VALUES (
    v_story_id, 4,
    'María pays for the apple, thanks the vendor, and leaves the market.',
    false
  )
  RETURNING node_id INTO v_node4_id;


  -- ===========================================================================
  -- SECTION 5 — NODE TEXT
  --   Two language rows per spoken line (es + en).
  --   Prompt rows (text_type = 'prompt') are the learner-facing practice cues.
  --   pinyin is NULL for all Spanish rows.
  -- ===========================================================================

  -- --- Node 1 : Introduction narration ---
  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node1_id, 'es', 'narrator', 'narration',
    'Es una mañana soleada. María camina al mercado local para comprar fruta.', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node1_id, 'en', 'narrator', 'narration',
    'It is a sunny morning. María walks to the local market to buy fruit.', NULL);


  -- --- Node 2 : Greeting dialogue ---
  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node2_id, 'es', 'vendedor', 'dialogue',
    '¡Hola! ¡Bienvenida! ¿Qué desea?', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node2_id, 'en', 'vendedor', 'dialogue',
    'Hello! Welcome! What would you like?', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node2_id, 'es', 'María', 'dialogue',
    '¡Buenos días! Busco fruta, por favor.', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node2_id, 'en', 'María', 'dialogue',
    'Good morning! I am looking for fruit, please.', NULL);


  -- --- Node 3 : Price question + checkpoint prompt ---
  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node3_id, 'es', 'María', 'dialogue',
    '¿Cuánto cuesta una manzana?', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node3_id, 'en', 'María', 'dialogue',
    'How much does an apple cost?', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node3_id, 'es', 'vendedor', 'dialogue',
    'Una manzana cuesta dos pesos.', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node3_id, 'en', 'vendedor', 'dialogue',
    'An apple costs two pesos.', NULL);

  -- Practice prompt (shown to learner, triggers interaction_log entry)
  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node3_id, 'es', 'narrator', 'prompt',
    '¡Tu turno! Pregunta al vendedor: ¿Cuánto cuesta un plátano?', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node3_id, 'en', 'narrator', 'prompt',
    'Your turn! Ask the vendor: How much does a banana cost?', NULL);


  -- --- Node 4 : Purchase completion ---
  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node4_id, 'es', 'narrator', 'narration',
    'María le da el dinero al vendedor y sonríe.', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node4_id, 'en', 'narrator', 'narration',
    'María gives the money to the vendor and smiles.', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node4_id, 'es', 'vendedor', 'dialogue',
    '¡Gracias! ¡Que tenga un buen día!', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node4_id, 'en', 'vendedor', 'dialogue',
    'Thank you! Have a good day!', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node4_id, 'es', 'María', 'dialogue',
    '¡Muchas gracias! ¡Adiós!', NULL);

  INSERT INTO node_text (node_id, language_code, speaker, text_type, text_content, pinyin)
  VALUES (v_node4_id, 'en', 'María', 'dialogue',
    'Thank you very much! Goodbye!', NULL);


  -- ===========================================================================
  -- SECTION 6 — NODE VOCABULARY
  --   is_target = true  → key learning word for this node (highlighted in UI)
  --   is_target = false → word appears in context but is not the primary focus
  -- ===========================================================================

  -- Node 1: "mercado" is the only target word
  INSERT INTO node_vocabulary (node_id, vocab_id, is_target)
  VALUES (v_node1_id, v_vocab_mercado,   true);

  -- Node 2: "vendedor" is target; "por favor" and "gracias" appear contextually
  INSERT INTO node_vocabulary (node_id, vocab_id, is_target)
  VALUES (v_node2_id, v_vocab_vendedor,  true);
  INSERT INTO node_vocabulary (node_id, vocab_id, is_target)
  VALUES (v_node2_id, v_vocab_por_favor, false);
  INSERT INTO node_vocabulary (node_id, vocab_id, is_target)
  VALUES (v_node2_id, v_vocab_gracias,   false);

  -- Node 3: cuánto, cuesta, manzana are the three targets; dinero/por favor contextual
  INSERT INTO node_vocabulary (node_id, vocab_id, is_target)
  VALUES (v_node3_id, v_vocab_cuanto,    true);
  INSERT INTO node_vocabulary (node_id, vocab_id, is_target)
  VALUES (v_node3_id, v_vocab_cuesta,    true);
  INSERT INTO node_vocabulary (node_id, vocab_id, is_target)
  VALUES (v_node3_id, v_vocab_manzana,   true);
  INSERT INTO node_vocabulary (node_id, vocab_id, is_target)
  VALUES (v_node3_id, v_vocab_dinero,    false);
  INSERT INTO node_vocabulary (node_id, vocab_id, is_target)
  VALUES (v_node3_id, v_vocab_por_favor, false);

  -- Node 4: gracias and dinero are the targets for this closing scene
  INSERT INTO node_vocabulary (node_id, vocab_id, is_target)
  VALUES (v_node4_id, v_vocab_gracias,   true);
  INSERT INTO node_vocabulary (node_id, vocab_id, is_target)
  VALUES (v_node4_id, v_vocab_dinero,    true);


  -- ===========================================================================
  -- SECTION 7 — NODE GRAMMAR
  -- ===========================================================================

  -- Node 2 teaches greetings grammar
  INSERT INTO node_grammar (node_id, grammar_id)
  VALUES (v_node2_id, v_grammar_greet);

  -- Node 3 teaches the ¿Cuánto cuesta...? question structure
  INSERT INTO node_grammar (node_id, grammar_id)
  VALUES (v_node3_id, v_grammar_cuanto);


  -- ===========================================================================
  -- SECTION 8 — BRANCHING LOGIC
  --   condition_type = 'default'         → always advance, no score check
  --   condition_type = 'score_threshold' → application evaluates pass/fail
  --     condition_value = 'pass'  → accuracy_score >= 0.7 → advance to Node 4
  --     condition_value = 'fail'  → accuracy_score <  0.7 → retry from Node 2
  --   Node 4 has no outgoing branch (end of story)
  -- ===========================================================================

  INSERT INTO branching_logic (node_id, condition_type, condition_value, next_node_id)
  VALUES (v_node1_id, 'default',         NULL,   v_node2_id);

  INSERT INTO branching_logic (node_id, condition_type, condition_value, next_node_id)
  VALUES (v_node2_id, 'default',         NULL,   v_node3_id);

  INSERT INTO branching_logic (node_id, condition_type, condition_value, next_node_id)
  VALUES (v_node3_id, 'score_threshold', 'pass', v_node4_id);

  INSERT INTO branching_logic (node_id, condition_type, condition_value, next_node_id)
  VALUES (v_node3_id, 'score_threshold', 'fail', v_node2_id);

  RAISE NOTICE 'Seed complete — story_id: %, nodes: %, %, %, %',
    v_story_id, v_node1_id, v_node2_id, v_node3_id, v_node4_id;

END;
$$;
