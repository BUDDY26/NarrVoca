import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import { retrieveChunks } from '@/lib/narrvoca/rag';
import type { RagSupabaseClient, RagOpenAIClient } from '@/lib/narrvoca/rag';
import type { GradingRubric } from '@/lib/narrvoca/types';
import { queryCache } from '@/lib/narrvoca/query-cache';

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

  const { uid, node_id, user_input, target_language, interaction_id } = req.body ?? {};

  if (!uid || node_id == null || !user_input || !target_language) {
    return res.status(400).json({
      error: 'Missing required fields: uid, node_id, user_input, target_language',
    });
  }

  try {
    // Step 1 — Fetch rubrics for this checkpoint node (cache-first)
    const rubricCacheKey = `rubrics:${node_id as number}`;
    let rubrics = queryCache.get<GradingRubric[]>(rubricCacheKey);
    if (rubrics === undefined) {
      const { data: rubricData, error: rubricError } = await supabase
        .from('grading_rubrics')
        .select('*')
        .eq('node_id', node_id);

      if (rubricError) return res.status(500).json({ error: rubricError.message });
      rubrics = (rubricData as GradingRubric[]) ?? [];
      queryCache.set(rubricCacheKey, rubrics);
    }

    // Step 2 — RAG retrieval: get relevant story context using the student's answer
    const chunks = await retrieveChunks(
      supabase as unknown as RagSupabaseClient,
      openai as unknown as RagOpenAIClient,
      user_input as string,
      { topN: 5, sourceType: 'node_text' }
    );

    // Step 3 — Build context-aware grading prompt
    const contextText = chunks.map((c) => c.content_text).join('\n---\n');
    const rubricText =
      rubrics.length > 0
        ? rubrics
            .map(
              (r) =>
                `- ${r.criterion} (weight: ${r.weight}` +
                (r.example_correct ? `, example correct answer: "${r.example_correct}"` : '') +
                ')'
            )
            .join('\n')
        : 'Grade holistically on grammatical accuracy, vocabulary use, and relevance.';

    const systemMessage =
      `You are a language learning evaluator grading a student response in ${target_language as string}.\n\n` +
      `Story context (use this to judge whether the student's answer is correct and relevant):\n` +
      `${contextText || 'No story context available.'}\n\n` +
      `Grading criteria:\n${rubricText}\n\n` +
      `Return a JSON object with exactly three fields:\n` +
      `- "accuracy_score": a number from 0.0 to 1.0 (1.0 = perfect)\n` +
      `- "feedback": 1–2 encouraging sentences explaining what the student did well and what to improve\n` +
      `- "rubric_scores": an object mapping each criterion name to a score 0.0–1.0 (use {} if no rubrics)\n\n` +
      `Respond with ONLY the JSON object, no other text.`;

    const userMessage = `Student's response: "${user_input as string}"`;

    // Step 4 — Call gpt-4o-mini
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
    const parsed = JSON.parse(raw) as {
      accuracy_score?: unknown;
      feedback?: unknown;
      rubric_scores?: unknown;
    };

    const accuracy_score =
      typeof parsed.accuracy_score === 'number'
        ? Math.min(1, Math.max(0, parsed.accuracy_score))
        : 0.5;
    const feedback = typeof parsed.feedback === 'string' ? parsed.feedback : '';
    const rubric_scores =
      typeof parsed.rubric_scores === 'object' && parsed.rubric_scores !== null
        ? (parsed.rubric_scores as Record<string, number>)
        : {};

    // Step 5 — Store grade in checkpoint_grades
    const { data: gradeData, error: gradeError } = await supabase
      .from('checkpoint_grades')
      .insert({
        uid,
        node_id,
        interaction_id: interaction_id ?? null,
        rubric_scores,
        overall_score: accuracy_score,
        feedback,
      })
      .select('grade_id')
      .single();

    if (gradeError) return res.status(500).json({ error: gradeError.message });

    return res.status(200).json({
      accuracy_score,
      feedback,
      grade_id: (gradeData as { grade_id: number }).grade_id,
    });
  } catch (err) {
    console.error('smart-grade: error', err);
    return res.status(500).json({ error: 'Failed to grade response' });
  }
}
