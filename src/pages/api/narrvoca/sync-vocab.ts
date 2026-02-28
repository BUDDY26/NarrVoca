import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

async function getAuthUser(req: NextApiRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

/**
 * POST /api/narrvoca/sync-vocab
 *
 * After a user passes a checkpoint, sync the node's target NarrVoca vocabulary
 * words into the user's Vocora `vocab_words` table so they appear in the
 * dashboard word list and can be used in the story generator.
 *
 * Body: { uid, node_id, target_language }
 * Returns: { added: string[], skipped: string[] }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { uid, node_id, target_language } = req.body ?? {};

  if (uid == null || node_id == null || target_language == null) {
    return res.status(400).json({ error: 'Missing required fields: uid, node_id, target_language' });
  }

  // 1. Fetch the node's target vocabulary IDs
  const { data: nodeVocabRows, error: nvError } = await supabase
    .from('node_vocabulary')
    .select('vocab_id')
    .eq('node_id', node_id)
    .eq('is_target', true);

  if (nvError) return res.status(500).json({ error: nvError.message });

  const vocabIds = (nodeVocabRows ?? []).map((r: { vocab_id: number }) => r.vocab_id);
  if (vocabIds.length === 0) {
    return res.status(200).json({ added: [], skipped: [] });
  }

  // 2. Fetch the actual vocabulary terms for those IDs in the correct language
  const { data: vocabRows, error: vError } = await supabase
    .from('vocabulary')
    .select('term')
    .in('vocab_id', vocabIds)
    .eq('language_code', target_language);

  if (vError) return res.status(500).json({ error: vError.message });

  const terms = (vocabRows ?? []).map((r: { term: string }) => r.term);
  if (terms.length === 0) {
    return res.status(200).json({ added: [], skipped: [] });
  }

  // 3. Fetch the user's existing vocab words for this language
  const { data: existingRows, error: ewError } = await supabase
    .from('vocab_words')
    .select('word')
    .eq('uid', uid)
    .eq('language', target_language);

  if (ewError) return res.status(500).json({ error: ewError.message });

  const existing = new Set((existingRows ?? []).map((r: { word: string }) => r.word));

  // 4. Insert only the words that are not already in the list
  const toAdd = terms.filter((t) => !existing.has(t));
  const skipped = terms.filter((t) => existing.has(t));

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase
      .from('vocab_words')
      .insert(toAdd.map((word) => ({ word, language: target_language, uid })));

    if (insertError) return res.status(500).json({ error: insertError.message });
  }

  return res.status(200).json({ added: toAdd, skipped });
}
