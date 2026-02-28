import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

async function getAuthUser(req: NextApiRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

function nextReviewDate(score: number): string {
  let days: number;
  if (score < 0.3) {
    days = 1;
  } else if (score < 0.6) {
    days = 3;
  } else if (score < 0.8) {
    days = 7;
  } else {
    days = 14;
  }
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { uid, vocab_id, mastery_score } = req.body ?? {};

  if (uid == null || vocab_id == null || mastery_score == null) {
    return res.status(400).json({ error: 'Missing required fields: uid, vocab_id, mastery_score' });
  }

  const next_review_at = nextReviewDate(mastery_score);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('user_vocab_mastery')
    .upsert(
      { uid, vocab_id, mastery_score, next_review_at, updated_at: now },
      { onConflict: 'uid,vocab_id', ignoreDuplicates: false }
    )
    .select('uid, vocab_id, mastery_score, next_review_at')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
