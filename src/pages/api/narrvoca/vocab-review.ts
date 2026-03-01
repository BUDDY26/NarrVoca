import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import { retrieveChunks } from '@/lib/narrvoca/rag';
import type { RagSupabaseClient, RagOpenAIClient } from '@/lib/narrvoca/rag';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getAuthUser(req: NextApiRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

interface VocabRow {
  vocab_id: number;
  term: string;
  translation_en: string;
  language_code: string;
}

interface MasteryRow {
  vocab_id: number;
  mastery_score: number;
  next_review_at: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { uid, target_language } = req.query;

  if (!uid || !target_language) {
    return res.status(400).json({ error: 'uid and target_language are required' });
  }

  try {
    // Step 1 — words whose review is due now
    const now = new Date().toISOString();
    const { data: masteryData, error: masteryError } = await supabase
      .from('user_vocab_mastery')
      .select('vocab_id, mastery_score, next_review_at')
      .eq('uid', uid as string)
      .lte('next_review_at', now);

    if (masteryError) {
      return res.status(500).json({ error: masteryError.message });
    }

    const masteryRows = (masteryData as MasteryRow[]) ?? [];

    if (masteryRows.length === 0) {
      return res.status(200).json({ due_words: [] });
    }

    // Step 2 — vocab details for due words
    const vocabIds = masteryRows.map((r) => r.vocab_id);
    const { data: vocabData, error: vocabError } = await supabase
      .from('vocabulary')
      .select('vocab_id, term, translation_en, language_code')
      .in('vocab_id', vocabIds)
      .eq('language_code', target_language as string);

    if (vocabError) {
      return res.status(500).json({ error: vocabError.message });
    }

    const vocabMap = new Map<number, VocabRow>(
      ((vocabData as VocabRow[]) ?? []).map((v) => [v.vocab_id, v])
    );

    // Step 3 — RAG retrieval of contextual examples per word (best-effort)
    const due_words = await Promise.all(
      masteryRows.map(async (mastery) => {
        const vocab = vocabMap.get(mastery.vocab_id);
        if (!vocab) return null;

        let context_chunks: string[] = [];
        try {
          const chunks = await retrieveChunks(
            supabase as unknown as RagSupabaseClient,
            openai as unknown as RagOpenAIClient,
            vocab.term,
            { topN: 3, sourceType: 'node_text' }
          );
          context_chunks = chunks.map((c) => c.content_text);
        } catch {
          // RAG retrieval failure is non-fatal — return word without context
        }

        return {
          vocab_id: vocab.vocab_id,
          term: vocab.term,
          translation_en: vocab.translation_en,
          mastery_score: mastery.mastery_score,
          next_review_at: mastery.next_review_at,
          context_chunks,
        };
      })
    );

    return res.status(200).json({
      due_words: due_words.filter(Boolean),
    });
  } catch (err) {
    console.error('vocab-review: error', err);
    return res.status(500).json({ error: 'Failed to fetch vocab review' });
  }
}
