import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import type { RetrievedChunk } from '@/lib/narrvoca/rag';

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

  const { query_id, chunks } = req.body ?? {};

  if (!query_id) {
    return res.status(400).json({ error: 'query_id is required' });
  }

  if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
    return res.status(400).json({ error: 'chunks must be a non-empty array' });
  }

  try {
    const rows = (chunks as RetrievedChunk[]).map((chunk, i) => ({
      query_id,
      embedding_id: chunk.embedding_id,
      rank: i + 1,                        // 1-indexed: rank 1 = most similar
      similarity_score: chunk.similarity,
      chunk_text: chunk.content_text,
    }));

    const { error } = await supabase
      .from('rag_context_chunks')
      .insert(rows);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({ inserted: rows.length });
  } catch {
    return res.status(500).json({ error: 'Failed to cache RAG chunks' });
  }
}
