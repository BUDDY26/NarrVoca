// ============================================================
// NarrVoca — TypeScript interfaces matching all 11 DB tables
// ============================================================

export interface Story {
  story_id: number;
  title: string;
  target_language: 'es' | 'zh';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | null;
  genre: string | null;
  created_at: string;
}

export interface StoryNode {
  node_id: number;
  story_id: number;
  sequence_order: number;
  is_checkpoint: boolean;
  context_description: string | null;
}

export interface NodeText {
  node_text_id: number;
  node_id: number;
  language_code: string;
  speaker: string | null;
  text_type: 'narration' | 'dialogue' | 'prompt';
  text_content: string;
  display_order: number;
}

export interface BranchingLogic {
  branch_id: number;
  node_id: number;
  condition_type: 'default' | 'score_threshold';
  condition_value: string | null;
  next_node_id: number;
}

export interface Vocabulary {
  vocab_id: number;
  language_code: string;
  term: string;
  translation_en: string;
  example_sentence: string | null;
  difficulty_score: number | null;
}

export interface GrammarPoint {
  grammar_id: number;
  language_code: string;
  rule_name: string;
  explanation_en: string;
  example_sentence: string | null;
}

export interface NodeVocabulary {
  node_id: number;
  vocab_id: number;
  is_target: boolean;
}

export interface NodeGrammar {
  node_id: number;
  grammar_id: number;
}

export interface UserNodeProgress {
  uid: string;
  node_id: number;
  status: 'not_started' | 'in_progress' | 'completed';
  best_score: number | null;
  completed_at: string | null;
  updated_at: string;
}

export interface UserVocabMastery {
  uid: string;
  vocab_id: number;
  mastery_score: number;
  next_review_at: string;
  updated_at: string;
}

export interface InteractionLog {
  interaction_id: number;
  uid: string;
  node_id: number;
  user_input: string;
  llm_feedback: string | null;
  accuracy_score: number;
  created_at: string;
}

// Composite type — full story with nodes and all their text lines
export interface FullStory {
  story: Story;
  nodes: Array<StoryNode & { texts: NodeText[] }>;
}

// =============================================================================
// NarrVoca 2.0 — RAG Layer 4 Types (Migration 003)
// =============================================================================

export interface EmbeddingStore {
  embedding_id: number;
  source_type: 'node_text' | 'vocabulary' | 'grammar_point';
  source_id: number;
  language_code: string | null;
  content_text: string | null;
  embedding: number[];               // vector(1536) returned as number[]
  created_at: string;
  updated_at: string;
}

export interface RagQueryLog {
  query_id: number;
  uid: string;
  node_id: number | null;
  query_text: string;
  query_embedding: number[] | null;  // vector(1536) — nullable
  source_type_filter: string | null;
  top_k: number;
  created_at: string;
}

export interface RagContextChunk {
  chunk_id: number;
  query_id: number;
  embedding_id: number;
  rank: number;
  similarity_score: number | null;
  chunk_text: string | null;
}

export interface GradingRubric {
  rubric_id: number;
  node_id: number;
  criterion: string;
  weight: number;
  example_correct: string | null;
  created_at: string;
}

export interface CheckpointGrade {
  grade_id: number;
  uid: string;
  node_id: number;
  interaction_id: number | null;
  rubric_scores: Record<string, number> | null;  // { rubric_id: score }
  overall_score: number;
  feedback: string | null;
  attempt_number: number;
  created_at: string;
}

export interface TutorSession {
  session_id: number;
  uid: string;
  story_id: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  created_at: string;
  updated_at: string;
}
