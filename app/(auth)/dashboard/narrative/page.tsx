'use client';

import { motion } from 'framer-motion';
import { BookOpen, Bot, ChevronRight, CheckCircle2, RotateCcw, Send } from 'lucide-react';
import { Navbar3 } from '@/components/dashboard/navbar3';
import { useNarrativeReader } from '@/hooks/narrvoca/useNarrativeReader';
import { useTutorChat } from '@/hooks/narrvoca/useTutorChat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import type { Story } from '@/lib/narrvoca/types';

// ---------------------------------------------------------------------------
// Difficulty badge colour
// ---------------------------------------------------------------------------
function difficultyVariant(level: Story['difficulty_level']) {
  if (level === 'beginner') return 'default';
  if (level === 'intermediate') return 'secondary';
  return 'outline';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function NarrativePage() {
  const {
    uid,
    accessToken,
    stories,
    fullStory,
    currentNode,
    nodeIndex,
    isCheckpoint,
    userInput,
    setUserInput,
    feedback,
    gradeScore,
    isLoading,
    isSubmitting,
    isComplete,
    selectStory,
    handleContinue,
    handleSubmit,
    resetStory,
  } = useNarrativeReader();

  const {
    messages: tutorMessages,
    chatInput,
    setChatInput,
    isTyping,
    isChatOpen,
    setIsChatOpen,
    sendMessage,
  } = useTutorChat({
    uid,
    accessToken,
    storyId: fullStory?.story.story_id ?? null,
    nodeId: currentNode?.node_id ?? null,
    targetLanguage: fullStory?.story.target_language ?? 'es',
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar3 />
        <main className="flex-1 flex items-center justify-center bg-gradient-to-b from-purple-50 to-white dark:from-purple-950 dark:to-slate-900">
          <p className="text-purple-600 dark:text-purple-300 animate-pulse text-lg">Loading…</p>
        </main>
      </div>
    );
  }

  // ── Story list ────────────────────────────────────────────────────────────
  if (!fullStory) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar3 />
        <main className="flex-1 bg-gradient-to-b from-purple-50 to-white dark:from-purple-950 dark:to-slate-900 dark:text-white">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="h-8 w-8 text-purple-600" />
                <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                  Narrative Reader
                </h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Choose a story to practice your language skills through immersive reading and interaction.
              </p>

              {stories.length === 0 ? (
                <Card className="border-purple-100 dark:border-purple-800 dark:bg-slate-800">
                  <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No stories available yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {stories.map((story) => (
                    <motion.div
                      key={story.story_id}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Card
                        className="cursor-pointer border-purple-100 shadow-sm hover:shadow-md transition-shadow dark:border-purple-800 dark:bg-slate-800"
                        onClick={() => selectStory(story.story_id)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg text-purple-700 dark:text-purple-300">
                            {story.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant={difficultyVariant(story.difficulty_level)}>
                              {story.difficulty_level ?? 'any level'}
                            </Badge>
                            <Badge variant="outline" className="uppercase text-xs">
                              {story.target_language}
                            </Badge>
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900 px-0"
                          >
                            Start reading <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // ── Completion screen ─────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar3 />
        <main className="flex-1 flex items-center justify-center bg-gradient-to-b from-purple-50 to-white dark:from-purple-950 dark:to-slate-900">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md mx-4"
          >
            <Card className="border-purple-100 shadow-md text-center dark:border-purple-800 dark:bg-slate-800">
              <CardHeader className="pt-10 pb-4">
                <CheckCircle2 className="mx-auto h-14 w-14 text-green-500 mb-3" />
                <CardTitle className="text-2xl text-purple-700 dark:text-purple-300">
                  Story complete!
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  You finished &ldquo;{fullStory.story.title}&rdquo;
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-10">
                <Button
                  onClick={resetStory}
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Choose another story
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  // ── Node reader ───────────────────────────────────────────────────────────
  const targetTexts = currentNode?.texts.filter((t) => t.language_code !== 'en') ?? [];
  const englishTexts = currentNode?.texts.filter((t) => t.language_code === 'en') ?? [];
  const totalNodes = fullStory.nodes.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar3 />
      <main className="flex-1 bg-gradient-to-b from-purple-50 to-white dark:from-purple-950 dark:to-slate-900 dark:text-white">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <motion.div
            key={nodeIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>{fullStory.story.title}</span>
                <span>Scene {nodeIndex + 1} of {totalNodes}</span>
              </div>
              <div className="h-1.5 bg-purple-100 dark:bg-purple-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${((nodeIndex + 1) / totalNodes) * 100}%` }}
                />
              </div>
            </div>

            <Card className="border-purple-100 shadow-md dark:border-purple-800 dark:bg-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-purple-700 dark:text-purple-300">
                    {fullStory.story.title}
                  </CardTitle>
                  {isCheckpoint && (
                    <Badge variant="outline" className="text-purple-600 border-purple-400">
                      Checkpoint
                    </Badge>
                  )}
                </div>
                {currentNode?.context_description && (
                  <CardDescription>{currentNode.context_description}</CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Target language text */}
                {targetTexts.length > 0 && (
                  <div className="space-y-2">
                    {targetTexts.map((t) => (
                      <p key={t.node_text_id} className="text-base leading-relaxed">
                        {t.speaker && (
                          <span className="font-semibold text-purple-600 dark:text-purple-400 mr-1">
                            {t.speaker}:
                          </span>
                        )}
                        {t.text_content}
                      </p>
                    ))}
                  </div>
                )}

                {/* English translation */}
                {englishTexts.length > 0 && (
                  <div className="border-t border-purple-100 dark:border-purple-800 pt-3 space-y-1">
                    {englishTexts.map((t) => (
                      <p key={t.node_text_id} className="text-sm text-slate-500 dark:text-slate-400 italic">
                        {t.speaker && (
                          <span className="not-italic font-medium mr-1">{t.speaker}:</span>
                        )}
                        {t.text_content}
                      </p>
                    ))}
                  </div>
                )}

                {/* Checkpoint — response input */}
                {isCheckpoint && (
                  <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Your response in {fullStory.story.target_language === 'es' ? 'Spanish' : 'the target language'}:
                    </p>
                    <Textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Type your response…"
                      rows={3}
                      className="resize-none border-purple-200 focus:border-purple-400 dark:border-purple-700"
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !userInput.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isSubmitting ? 'Checking…' : 'Submit response'}
                    </Button>

                    {/* Grade feedback card — score badge + explanation */}
                    {feedback && (
                      <div className="rounded-lg bg-purple-50 border border-purple-200 dark:bg-purple-950 dark:border-purple-700 px-4 py-3 space-y-2">
                        {gradeScore !== null && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Score
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                gradeScore >= 0.7
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : gradeScore >= 0.4
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}
                            >
                              {Math.round(gradeScore * 100)}%
                            </span>
                          </div>
                        )}
                        <p className="text-sm italic text-purple-700 dark:text-purple-300">
                          {feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Non-checkpoint — continue */}
                {!isCheckpoint && (
                  <Button
                    onClick={handleContinue}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
                  >
                    Continue <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* ── AI Tutor chat panel ───────────────────────────────────── */}
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="gap-2 text-purple-600 border-purple-300 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-950"
              >
                <Bot className="h-4 w-4" />
                {isChatOpen ? 'Close Tutor' : 'Ask Tutor'}
              </Button>

              {isChatOpen && (
                <Card className="mt-2 border-purple-100 dark:border-purple-800 dark:bg-slate-800">
                  <CardContent className="p-4 space-y-3">
                    {/* Message list */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {tutorMessages.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4 italic">
                          Ask your tutor anything about this story!
                        </p>
                      )}
                      {tutorMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                              msg.role === 'user'
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}

                      {/* Typing indicator — three animated dots */}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="rounded-lg px-3 py-2 bg-slate-100 dark:bg-slate-700">
                            <span className="flex gap-1 items-center h-4">
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input row */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && chatInput.trim()) {
                            void sendMessage(chatInput);
                          }
                        }}
                        placeholder="Ask your tutor…"
                        className="flex-1 rounded-md border border-purple-200 dark:border-purple-700 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:border-purple-400"
                      />
                      <Button
                        size="sm"
                        onClick={() => { if (chatInput.trim()) void sendMessage(chatInput); }}
                        disabled={!chatInput.trim() || isTyping}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
