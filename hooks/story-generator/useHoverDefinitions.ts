import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { createHash } from "crypto";

export function useHoverWord(
  practiceLang: string,
  words: string[],
  setWords: React.Dispatch<React.SetStateAction<string[]>>,
  story: string,
  userLang: "en" | "es" | "zh"
) {
  const [hoveredWord, setHoveredWord] = useState<{ word: string; index: number } | null>(null);
  const [definitions, setDefinitions] = useState<{
    [key: string]: {
      translatedWord: string;
      partOfSpeech: string;
      definition: string;
    };
  }>({});

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const storyHash = createHash("sha256").update(story).digest("hex");

  useEffect(() => {
    if (!hoveredWord || definitions[hoveredWord.word]) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const fetchDefinition = async () => {
        const word = hoveredWord.word.toLowerCase();

        // 1. Check Supabase cache
        try {
          const { data: cached, error: fetchError } = await supabase
            .from("cached_definitions")
            .select("definition, part_of_speech, translated_word")
            .eq("word", word)
            .eq("lang", userLang)
            .single();

          if (cached && !fetchError) {
            setDefinitions((prev) => ({
              ...prev,
              [word]: {
                definition: cached.definition,
                partOfSpeech: cached.part_of_speech || "Unknown",
                translatedWord: cached.translated_word || "",
              },
            }));
            return;
          }

          if (fetchError) {
            console.warn("Supabase cache fetch error:", fetchError.message);
          } else {
          }
        } catch (err) {
          console.error("Unexpected error during Supabase cache fetch:", err);
        }

        // 2. Fetch from OpenAI
        try {
          const response = await fetch("/api/generate-definitions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word, story, userLang }),
          });

          const data = await response.json();

          const newDef = {
            definition: data.definition || "No definition found.",
            partOfSpeech: data.partOfSpeech || "Unknown",
            translatedWord: data.translatedWord || "",
          };

          // 3. Cache result in Supabase
          await supabase.from("cached_definitions").insert([{
            word,
            definition: newDef.definition,
            part_of_speech: newDef.partOfSpeech,
            translated_word: newDef.translatedWord,
            story_hash: storyHash,
            lang: userLang,
          }]);


          setDefinitions((prev) => ({
            ...prev,
            [word]: newDef,
          }));
        } catch (error) {
          console.error("Failed fetching/generating definition:", error);
          setDefinitions((prev) => ({
            ...prev,
            [word]: {
              definition: "Error retrieving definition.",
              partOfSpeech: "Unknown",
              translatedWord: "",
            },
          }));
        }
      };

      fetchDefinition();
    }, 1500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [hoveredWord, story]);

  const handleAddHoveredWord = async () => {
    if (!hoveredWord?.word) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!words.includes(hoveredWord.word)) {
      const { error } = await supabase
        .from("vocab_words")
        .insert([{ word: hoveredWord.word, language: practiceLang, uid: user.id }]);

      if (error) {
        console.error("Error adding hovered word:", error);
      } else {
        setWords([...words, hoveredWord.word]);
      }
    }
  };

  return {
    hoveredWord,
    setHoveredWord,
    definitions,
    handleAddHoveredWord,
  };
}
