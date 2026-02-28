import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, node_id, status, accuracy_score } = req.body ?? {};

  if (uid == null || node_id == null || status == null) {
    return res.status(400).json({ error: 'Missing required fields: uid, node_id, status' });
  }

  // Build upsert payload.
  // best_score and completed_at use DB-side logic via ignoreDuplicates=false:
  // we pass the new values and let the DB column default handle "set once" semantics.
  // The onConflict columns are (uid, node_id).
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    uid,
    node_id,
    status,
    updated_at: now,
  };

  if (accuracy_score != null) {
    payload.best_score = accuracy_score;
  }

  if (status === 'completed') {
    payload.completed_at = now;
  }

  const { data, error } = await supabase
    .from('user_node_progress')
    .upsert(payload, { onConflict: 'uid,node_id', ignoreDuplicates: false })
    .select('uid, node_id, status, best_score, completed_at')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
