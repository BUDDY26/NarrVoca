import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

async function getAuthUser(req: NextApiRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── GET — retrieve all rubrics for a checkpoint node ─────────────────────
  if (req.method === 'GET') {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { node_id } = req.query;
    if (!node_id) return res.status(400).json({ error: 'node_id is required' });

    const { data, error } = await supabase
      .from('grading_rubrics')
      .select('*')
      .eq('node_id', Number(node_id))
      .order('rubric_id', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data ?? []);
  }

  // ── POST — create a rubric criterion for a checkpoint node ───────────────
  if (req.method === 'POST') {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { node_id, criterion, weight, example_correct } = req.body ?? {};
    if (!node_id || !criterion || weight == null) {
      return res.status(400).json({ error: 'node_id, criterion, and weight are required' });
    }

    const { data, error } = await supabase
      .from('grading_rubrics')
      .insert({ node_id, criterion, weight, example_correct: example_correct ?? null })
      .select('rubric_id')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ rubric_id: (data as { rubric_id: number }).rubric_id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
