import { useState, useMemo, useEffect, useRef, useCallback } from "react";

export function useFaqSuggestions(
  input: string,
  faqs: { question: string; questionNl: string; questionDe: string; answer: string; answerNl: string; answerDe: string; category: string[]; audience: string[]; url: string }[],
  starters: { question: string; questionNl: string; questionDe: string; answer: string; answerNl: string; answerDe: string }[],
  getQ: (item: { question: string; questionNl: string; questionDe: string }) => string
) {
  const [debouncedInput, setDebouncedInput] = useState(input);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const prevSuggestionsRef = useRef<string[]>([]);

  // Debounce input changes — use setTimeout for both paths to satisfy lint
  useEffect(() => {
    const delay = input.trim() ? 150 : 0;
    const value = input.trim() ? input : "";
    const timer = setTimeout(() => setDebouncedInput(value), delay);
    return () => clearTimeout(timer);
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

  // Reset selection when suggestions change
  useEffect(() => {
    if (prevSuggestionsRef.current !== faqSuggestions) {
      prevSuggestionsRef.current = faqSuggestions;
      setTimeout(() => setSelectedSuggestion(-1), 0);
    }
  }, [faqSuggestions]);

  const setSelectedSuggestionWrapped = useCallback((v: number | ((prev: number) => number)) => {
    setSelectedSuggestion(v);
  }, []);

  return { faqSuggestions, selectedSuggestion, setSelectedSuggestion: setSelectedSuggestionWrapped };
}
