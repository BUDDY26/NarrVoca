'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getStories, getFullStory } from '@/lib/narrvoca/queries';
import { resolveBranch } from '@/lib/narrvoca/branching';
import type { Story, FullStory, StoryNode, NodeText } from '@/lib/narrvoca/types';

export type NarrativeNode = StoryNode & { texts: NodeText[] };

export function useNarrativeReader() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [fullStory, setFullStory] = useState<FullStory | null>(null);
  const [nodeIndex, setNodeIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
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
    try {
      const full = await getFullStory(storyId);
      setFullStory(full);
    } catch (e) {
      console.error('useNarrativeReader: failed to load story', e);
    }
    setIsLoading(false);
  }

  async function handleContinue() {
    if (!fullStory || !currentNode || !uid) return;

    await fetch('/api/narrvoca/update-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, node_id: currentNode.node_id, status: 'completed' }),
    });

    const nextNodeId = await resolveBranch(currentNode.node_id);
    advanceToNode(fullStory, nextNodeId);
  }

  async function handleSubmit() {
    if (!fullStory || !currentNode || !uid || !userInput.trim()) return;
    setIsSubmitting(true);

    // Phase 3: accuracy_score is a placeholder — real LLM grading added in Phase 4
    const accuracy_score = 0.8;

    await fetch('/api/narrvoca/log-interaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, node_id: currentNode.node_id, user_input: userInput, accuracy_score }),
    });

    await fetch('/api/narrvoca/update-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, node_id: currentNode.node_id, status: 'completed', accuracy_score }),
    });

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
    isLoading,
    isSubmitting,
    isComplete,
    selectStory,
    handleContinue,
    handleSubmit,
    resetStory,
  };
}
