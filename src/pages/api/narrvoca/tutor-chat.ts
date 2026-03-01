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

type TutorMessage = { role: 'user' | 'assistant'; content: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // node_id is accepted for future context scoping but not yet used in retrieval
  const { uid, story_id, session_id, question, target_language } = req.body ?? {};

  if (!uid || !story_id || !question || !target_language) {
    return res.status(400).json({
      error: 'uid, story_id, question, and target_language are required',
    });
  }

  try {
    // Step 1 — RAG retrieval for relevant story context
    const chunks = await retrieveChunks(
      supabase as unknown as RagSupabaseClient,
      openai as unknown as RagOpenAIClient,
      question as string,
      { topN: 5 }
    );

    // Step 2 — Get or create tutor session
    let sessionId: number;
    let existingMessages: TutorMessage[] = [];

    if (session_id) {
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('session_id', session_id)
        .single();
      if (error) return res.status(500).json({ error: error.message });
      const row = data as { session_id: number; messages: TutorMessage[] };
      sessionId = row.session_id;
      existingMessages = row.messages ?? [];
    } else {
      const { data, error } = await supabase
        .from('tutor_sessions')
        .insert({ uid, story_id, messages: [] })
        .select('session_id')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      sessionId = (data as { session_id: number }).session_id;
    }

    // Step 3 — Build system prompt with RAG context
    const contextText = chunks.map((c) => c.content_text).join('\n---\n');
    const systemPrompt =
      `You are a friendly language tutor helping a student learn ${target_language as string}.\n` +
      `Use the following story excerpts as context to answer the student's question:\n` +
      `${contextText || 'No specific context available.'}\n` +
      `Be concise, encouraging, and educational.`;

    // Step 4 — Call gpt-4o-mini
    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...existingMessages,
      { role: 'user' as const, content: question as string },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content ?? '';

    // Step 5 — Persist updated messages to tutor_sessions
    const updatedMessages: TutorMessage[] = [
      ...existingMessages,
      { role: 'user', content: question as string },
      { role: 'assistant', content: reply },
    ];

    const { error: updateError } = await supabase
      .from('tutor_sessions')
      .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId);

    if (updateError) return res.status(500).json({ error: updateError.message });

    return res.status(200).json({ reply, session_id: sessionId, messages: updatedMessages });
  } catch (err) {
    console.error('tutor-chat: error', err);
    return res.status(500).json({ error: 'Failed to get tutor response' });
  }
}
