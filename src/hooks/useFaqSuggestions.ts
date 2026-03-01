import { useState, useMemo, useEffect } from "react";

export function useFaqSuggestions(
  input: string,
  faqs: { question: string; questionNl: string; questionDe: string; answer: string; answerNl: string; answerDe: string; category: string; audience: string[]; url: string }[],
  starters: { question: string; questionNl: string; questionDe: string; answer: string; answerNl: string; answerDe: string }[],
  getQ: (item: { question: string; questionNl: string; questionDe: string }) => string
) {
  const faqSuggestions = useMemo(() => {
    const query = input.trim().toLowerCase();
    if (query.length < 2) return [];
    // Check if input matches a starter exactly (user clicked a starter)
    if (starters.some((s) => getQ(s) === input)) return [];
    return faqs
      .filter((f) => {
        const lower = getQ(f).toLowerCase();
        return lower.includes(query) ||
          lower.split(/\s+/).some((word) => word.startsWith(query));
      })
      .map((f) => getQ(f))
      .slice(0, 5);
  }, [input, faqs, starters, getQ]);

  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedSuggestion(-1);
  }, [faqSuggestions]);

  return { faqSuggestions, selectedSuggestion, setSelectedSuggestion };
}
