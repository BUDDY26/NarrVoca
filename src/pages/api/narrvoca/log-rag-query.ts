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

  const { uid, node_id, query_text, source_type_filter, top_k } = req.body ?? {};

  if (!uid || !query_text) {
    return res.status(400).json({ error: 'uid and query_text are required' });
  }

  try {
    const { data, error } = await supabase
      .from('rag_query_log')
      .insert({
        uid,
        node_id: node_id ?? null,
        query_text,
        source_type_filter: source_type_filter ?? null,
        top_k: top_k ?? DEFAULT_TOP_K,
      })
      .select('query_id')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({ query_id: (data as { query_id: number }).query_id });
  } catch {
    return res.status(500).json({ error: 'Failed to log RAG query' });
  }
}

const DEFAULT_TOP_K = 5;
