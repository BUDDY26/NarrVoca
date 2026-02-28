import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

async function getAuthUser(req: NextApiRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { uid, node_id, user_input, llm_feedback, accuracy_score } = req.body ?? {};

  if (uid == null || node_id == null || user_input == null || accuracy_score == null) {
    return res.status(400).json({ error: 'Missing required fields: uid, node_id, user_input, accuracy_score' });
  }

  const { data, error } = await supabase
    .from('interaction_log')
    .insert({ uid, node_id, user_input, llm_feedback: llm_feedback ?? null, accuracy_score })
    .select('interaction_id')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ interaction_id: (data as { interaction_id: number }).interaction_id });
}
