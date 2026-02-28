'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getStories, getFullStory, getNodeVocab } from '@/lib/narrvoca/queries';
import { resolveBranch } from '@/lib/narrvoca/branching';
import type { Story, FullStory, StoryNode, NodeText } from '@/lib/narrvoca/types';

export type NarrativeNode = StoryNode & { texts: NodeText[] };

export function useNarrativeReader() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [fullStory, setFullStory] = useState<FullStory | null>(null);
  const [nodeIndex, setNodeIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUid(session.user.id);
      setAccessToken(session.access_token);
      try {
        const data = await getStories();
        setStories(data);
      } catch (e) {
        console.error('useNarrativeReader: failed to load stories', e);
      }
      setIsLoading(false);
    }
    init();
  }, [router]);

  // Derived state
  const currentNode: NarrativeNode | null = fullStory?.nodes[nodeIndex] ?? null;
  const isCheckpoint = currentNode?.is_checkpoint ?? false;

  async function selectStory(storyId: number) {
    setIsLoading(true);
    setIsComplete(false);
    setNodeIndex(0);
    setUserInput('');
    setFeedback(null);
    try {
      const full = await getFullStory(storyId);
      setFullStory(full);
    } catch (e) {
      console.error('useNarrativeReader: failed to load story', e);
    }
    setIsLoading(false);
  }

  function authHeaders(): Record<string, string> {
    return accessToken
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }
      : { 'Content-Type': 'application/json' };
  }

  async function handleContinue() {
    if (!fullStory || !currentNode || !uid) return;
    setFeedback(null);

    await fetch('/api/narrvoca/update-progress', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ uid, node_id: currentNode.node_id, status: 'completed' }),
    });

    const nextNodeId = await resolveBranch(currentNode.node_id);
    advanceToNode(fullStory, nextNodeId);
  }

  async function handleSubmit() {
    if (!fullStory || !currentNode || !uid || !userInput.trim()) return;
    setIsSubmitting(true);
    setFeedback(null);

    // Step 1: Grade the response with the real LLM
    let accuracy_score = 0.5;
    let llm_feedback: string | null = null;

    const gradeRes = await fetch('/api/narrvoca/grade-response', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        node_id: currentNode.node_id,
        user_input: userInput,
        target_language: fullStory.story.target_language,
      }),
    });
    if (gradeRes.ok) {
      const gradeData = await gradeRes.json() as { accuracy_score: number; feedback: string };
      accuracy_score = gradeData.accuracy_score;
      llm_feedback = gradeData.feedback ?? null;
    }

    setFeedback(llm_feedback);

    // Step 2: Log the interaction with the real score
    await fetch('/api/narrvoca/log-interaction', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ uid, node_id: currentNode.node_id, user_input: userInput, llm_feedback, accuracy_score }),
    });

    // Step 3: Update node progress
    await fetch('/api/narrvoca/update-progress', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ uid, node_id: currentNode.node_id, status: 'completed', accuracy_score }),
    });

    // Step 4: Update vocab mastery for every word associated with this node
    try {
      const vocabRows = await getNodeVocab(currentNode.node_id);
      await Promise.all(
        vocabRows.map((row) =>
          fetch('/api/narrvoca/update-mastery', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ uid, vocab_id: row.vocab_id, mastery_score: accuracy_score }),
          })
        )
      );
    } catch (e) {
      console.error('useNarrativeReader: failed to update vocab mastery', e);
    }

    const nextNodeId = await resolveBranch(currentNode.node_id, accuracy_score);
    advanceToNode(fullStory, nextNodeId);
    setUserInput('');
    setIsSubmitting(false);
  }

  function advanceToNode(story: FullStory, nextNodeId: number | null) {
    if (nextNodeId === null) {
      setIsComplete(true);
      return;
    }
    const nextIndex = story.nodes.findIndex((n) => n.node_id === nextNodeId);
    if (nextIndex === -1) {
      setIsComplete(true);
    } else {
      setNodeIndex(nextIndex);
    }
  }

  function resetStory() {
    setFullStory(null);
    setNodeIndex(0);
    setUserInput('');
    setFeedback(null);
    setIsComplete(false);
  }

  return {
    uid,
    stories,
    fullStory,
    currentNode,
    nodeIndex,
    isCheckpoint,
    userInput,
    setUserInput,
    feedback,
    isLoading,
    isSubmitting,
    isComplete,
    selectStory,
    handleContinue,
    handleSubmit,
    resetStory,
  };
}
