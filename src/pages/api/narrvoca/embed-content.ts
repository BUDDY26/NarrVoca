import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import { embedSingleRecord } from '@/lib/narrvoca/embed';
import type { EmbedSupabaseClient, EmbedOpenAIClient } from '@/lib/narrvoca/embed';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_SOURCE_TYPES = ['node_text', 'vocabulary', 'grammar_point'] as const;

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

  const { source_type, source_id, content_text, language_code } = req.body ?? {};

  if (!source_type || source_id == null || !content_text) {
    return res.status(400).json({
      error: 'source_type, source_id, and content_text are required',
    });
  }

  if (!(VALID_SOURCE_TYPES as readonly string[]).includes(source_type as string)) {
    return res.status(400).json({
      error: 'source_type must be node_text, vocabulary, or grammar_point',
    });
  }

  try {
    const result = await embedSingleRecord(
      supabase as unknown as EmbedSupabaseClient,
      openai as unknown as EmbedOpenAIClient,
      {
        source_type: source_type as 'node_text' | 'vocabulary' | 'grammar_point',
        source_id: Number(source_id),
        content_text: content_text as string,
        language_code: (language_code as string | undefined) ?? null,
      }
    );
    return res.status(201).json(result);
  } catch (err) {
    console.error('embed-content: error', err);
    return res.status(500).json({ error: 'Failed to embed content' });
  }
}
