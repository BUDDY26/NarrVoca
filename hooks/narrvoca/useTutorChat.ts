'use client';

import { useState, useCallback } from 'react';

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseTutorChatOptions {
  uid: string | null;
  accessToken: string | null;
  storyId: number | null;
  nodeId?: number | null;
  targetLanguage?: string;
}

export function useTutorChat({
  uid,
  accessToken,
  storyId,
  nodeId,
  targetLanguage = 'es',
}: UseTutorChatOptions) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!uid || !storyId || !question.trim()) return;

      // Optimistic: show user message before server responds
      setMessages((prev) => [...prev, { role: 'user', content: question }]);
      setChatInput('');
      setIsTyping(true);

      const headers: Record<string, string> = accessToken
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }
        : { 'Content-Type': 'application/json' };

      try {
        const res = await fetch('/api/narrvoca/tutor-chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            uid,
            story_id: storyId,
            node_id: nodeId ?? null,
            session_id: sessionId,
            question,
            target_language: targetLanguage,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            reply: string;
            session_id: number;
            messages: TutorMessage[];
          };
          setSessionId(data.session_id);
          setMessages(data.messages);
        }
      } catch {
        // Silently retain the optimistic user message on network error
      } finally {
        setIsTyping(false);
      }
    },
    [uid, storyId, nodeId, sessionId, targetLanguage, accessToken]
  );

  function clearSession() {
    setSessionId(null);
    setMessages([]);
    setChatInput('');
    setIsTyping(false);
  }

  return {
    sessionId,
    messages,
    chatInput,
    setChatInput,
    isTyping,
    isChatOpen,
    setIsChatOpen,
    sendMessage,
    clearSession,
  };
}
