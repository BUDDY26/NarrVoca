import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  const { node_id, user_input, target_language } = req.body ?? {};

  if (node_id == null || user_input == null || target_language == null) {
    return res.status(400).json({ error: 'Missing required fields: node_id, user_input, target_language' });
  }

  // Fetch the prompt text for this node to use as grading context
  const { data: promptRows, error: dbError } = await supabase
    .from('node_text')
    .select('text_content')
    .eq('node_id', node_id)
    .eq('text_type', 'prompt')
    .limit(1);

  if (dbError) {
    return res.status(500).json({ error: dbError.message });
  }

  const promptContext = promptRows?.[0]?.text_content ?? null;

  const systemMessage = `You are a language learning evaluator grading a student response in ${target_language}.
Evaluate the student's response for grammatical accuracy, vocabulary use, and relevance to the prompt.
Return a JSON object with exactly two fields:
- "accuracy_score": a number from 0.0 to 1.0 (1.0 = perfect, 0.0 = completely wrong or off-topic)
- "feedback": a brief, encouraging sentence (1–2 sentences) telling the student what they did well and what to improve

Respond with ONLY the JSON object, no other text.`;

  const userMessage = promptContext
    ? `Prompt given to the student: "${promptContext}"\n\nStudent's response: "${user_input}"`
    : `Student's response in ${target_language}: "${user_input}"`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw) as { accuracy_score?: unknown; feedback?: unknown };

    const accuracy_score = typeof parsed.accuracy_score === 'number'
      ? Math.min(1, Math.max(0, parsed.accuracy_score))
      : 0.5;
    const feedback = typeof parsed.feedback === 'string' ? parsed.feedback : '';

    return res.status(200).json({ accuracy_score, feedback });
  } catch (err) {
    console.error('grade-response: OpenAI error', err);
    return res.status(500).json({ error: 'Failed to grade response' });
  }
}
