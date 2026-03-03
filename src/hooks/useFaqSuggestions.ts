import { useState, useMemo, useEffect, useRef } from "react";

export function useFaqSuggestions(
  input: string,
  faqs: { question: string; questionNl: string; questionDe: string; answer: string; answerNl: string; answerDe: string; category: string[]; audience: string[]; url: string }[],
  starters: { question: string; questionNl: string; questionDe: string; answer: string; answerNl: string; answerDe: string }[],
  getQ: (item: { question: string; questionNl: string; questionDe: string }) => string
) {
  const [debouncedInput, setDebouncedInput] = useState(input);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear instantly when input is emptied
    if (!input.trim()) {
      setDebouncedInput("");
      return;
    }
    timerRef.current = setTimeout(() => setDebouncedInput(input), 150);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [input]);

  const faqSuggestions = useMemo(() => {
    const query = debouncedInput.trim().toLowerCase();
    if (query.length < 2) return [];
    // Check if input matches a starter exactly (user clicked a starter)
    if (starters.some((s) => getQ(s) === debouncedInput)) return [];
    return faqs
      .filter((f) => {
        const lower = getQ(f).toLowerCase();
        return lower.includes(query) ||
          lower.split(/\s+/).some((word) => word.startsWith(query));
      })
      .map((f) => getQ(f))
      .slice(0, 5);
  }, [debouncedInput, faqs, starters, getQ]);

  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedSuggestion(-1);
  }, [faqSuggestions]);

  return { faqSuggestions, selectedSuggestion, setSelectedSuggestion };
}
