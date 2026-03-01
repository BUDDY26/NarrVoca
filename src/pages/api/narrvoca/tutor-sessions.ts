import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

async function getAuthUser(req: NextApiRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── GET — retrieve a session ─────────────────────────────────────────────
  if (req.method === 'GET') {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { session_id, uid, story_id } = req.query;

    // Fetch by primary key
    if (session_id) {
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('session_id', Number(session_id))
        .single();
      if (error) return res.status(404).json({ error: 'Session not found' });
      return res.status(200).json(data);
    }

    // Fetch latest session for a user + story
    if (uid && story_id) {
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('uid', uid)
        .eq('story_id', Number(story_id))
        .order('updated_at', { ascending: false })
        .maybeSingle();
      if (error) return res.status(500).json({ error: (error as { message: string }).message });
      return res.status(200).json(data ?? null);
    }

    return res.status(400).json({ error: 'Provide session_id or uid+story_id' });
  }

  // ── POST — create blank session ──────────────────────────────────────────
  if (req.method === 'POST') {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { uid, story_id } = req.body ?? {};
    if (!uid || !story_id) {
      return res.status(400).json({ error: 'uid and story_id are required' });
    }

    const { data, error } = await supabase
      .from('tutor_sessions')
      .insert({ uid, story_id, messages: [] })
      .select('session_id')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ session_id: (data as { session_id: number }).session_id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
