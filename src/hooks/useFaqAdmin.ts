import { useState, useCallback } from "react";
import type { KvFaq } from "@/lib/kv-cache";

export type FaqAdminPhase =
  | "idle"
  | "choose-action"
  | "choose-faq"
  | "drafting-question"
  | "drafting-answer"
  | "choose-category"
  | "choose-link"
  | "drafting-link"
  | "translating"
  | "preview"
  | "revise"
  | "applying"
  | "done";

export type FaqAdminAction = "add" | "edit" | "delete";

export interface FaqTranslations {
  question_en: string;
  answer_en: string;
  question_nl: string;
  answer_nl: string;
  question_de: string;
  answer_de: string;
}

interface UseFaqAdminOptions {
  faqs: KvFaq[];
  setFaqs: (faqs: KvFaq[]) => void;
  setMessages: React.Dispatch<React.SetStateAction<{ role: "user" | "assistant"; content: string; logId?: string; rating?: "👍" | "👎" }[]>>;
  lang: string;
}

export function useFaqAdmin({ faqs, setFaqs, setMessages, lang }: UseFaqAdminOptions) {
  const [phase, setPhase] = useState<FaqAdminPhase>("idle");
  const [action, setAction] = useState<FaqAdminAction | null>(null);
  const [selectedFaq, setSelectedFaq] = useState<KvFaq | null>(null);
  const [draftQuestion, setDraftQuestion] = useState("");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [draftCategory, setDraftCategory] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [translations, setTranslations] = useState<FaqTranslations | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setAction(null);
    setSelectedFaq(null);
    setDraftQuestion("");
    setDraftAnswer("");
    setDraftCategory("");
    setDraftUrl("");
    setTranslations(null);
    setError(null);
  }, []);

  const categories = [...new Set(faqs.map((f) => f.category).filter(Boolean))];

  const startAdmin = useCallback(() => {
    setPhase("choose-action");
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: lang === "nl"
        ? "Wat wil je doen met de FAQs?"
        : lang === "de"
        ? "Was möchtest du mit den FAQs machen?"
        : "What would you like to do with the FAQs?" },
    ]);
  }, [setMessages, lang]);

  const chooseAction = useCallback((a: FaqAdminAction) => {
    setAction(a);
    if (a === "add") {
      setPhase("drafting-question");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: lang === "nl"
          ? "Wat is de vraag? (je mag in elke taal schrijven)"
          : lang === "de"
          ? "Was ist die Frage? (du kannst in jeder Sprache schreiben)"
          : "What is the question? (you can write in any language)" },
      ]);
    } else if (a === "edit" || a === "delete") {
      setPhase("choose-faq");
      const faqList = faqs
        .map((f, i) => `${i + 1}. ${f.question}`)
        .join("\n");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: (lang === "nl"
          ? "Kies een FAQ door het nummer te typen:\n\n"
          : lang === "de"
          ? "Wähle eine FAQ durch Eingabe der Nummer:\n\n"
          : "Choose a FAQ by typing the number:\n\n") + faqList },
      ]);
    }
  }, [faqs, setMessages, lang]);

  const chooseFaq = useCallback((index: number) => {
    const faq = faqs[index];
    if (!faq) {
      setError("Invalid FAQ number");
      return;
    }
    setSelectedFaq(faq);

    if (action === "delete") {
      setPhase("preview");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: (lang === "nl"
          ? `Weet je zeker dat je deze FAQ wilt verwijderen?\n\n**${faq.question}**`
          : lang === "de"
          ? `Möchtest du diese FAQ wirklich löschen?\n\n**${faq.question}**`
          : `Are you sure you want to delete this FAQ?\n\n**${faq.question}**`) },
      ]);
    } else if (action === "edit") {
      setPhase("drafting-question");
      const getQ = lang === "nl" && faq.questionNl ? faq.questionNl : lang === "de" && faq.questionDe ? faq.questionDe : faq.question;
      const getA = lang === "nl" && faq.answerNl ? faq.answerNl : lang === "de" && faq.answerDe ? faq.answerDe : faq.answer;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: (lang === "nl"
          ? "Huidige FAQ:\n\n"
          : lang === "de"
          ? "Aktuelle FAQ:\n\n"
          : "Current FAQ:\n\n") +
          `**Q:** ${getQ}\n\n**A:** ${getA}\n\n` +
          (lang === "nl"
            ? "Wat wordt de nieuwe vraag? (of typ 'ok' om de huidige te behouden)"
            : lang === "de"
            ? "Was wird die neue Frage? (oder tippe 'ok' um die aktuelle zu behalten)"
            : "What should the new question be? (or type 'ok' to keep the current one)") },
      ]);
    }
  }, [faqs, action, setMessages, lang]);

  const showCategoryPicker = useCallback(() => {
    setPhase("choose-category");
    const catList = categories.length > 0
      ? categories.map((c, i) => `${i + 1}. ${c}`).join("\n")
      : "";
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: lang === "nl"
        ? `In welke categorie valt deze FAQ?\n\n${catList}\n\nTyp een nummer of een nieuwe categorie.`
        : lang === "de"
        ? `In welche Kategorie fällt diese FAQ?\n\n${catList}\n\nGib eine Nummer oder eine neue Kategorie ein.`
        : `Which category does this FAQ belong to?\n\n${catList}\n\nType a number or a new category name.` },
    ]);
  }, [categories, setMessages, lang]);

  const showLinkChoice = useCallback(() => {
    setPhase("choose-link");
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: lang === "nl"
        ? "Wil je een link toevoegen aan deze FAQ?"
        : lang === "de"
        ? "Möchtest du einen Link zu dieser FAQ hinzufügen?"
        : "Do you want to add a link to this FAQ?" },
    ]);
  }, [setMessages, lang]);

  const translateDraft = useCallback(async (question: string, answer: string, sourceLang: string) => {
    setPhase("translating");
    setError(null);

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: lang === "nl"
        ? "Even vertalen naar 3 talen..."
        : lang === "de"
        ? "Wird in 3 Sprachen übersetzt..."
        : "Translating to 3 languages..." },
    ]);

    try {
      const res = await fetch("/api/faq-admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, sourceLang }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Translation failed");
      }

      const result = await res.json() as FaqTranslations;
      setTranslations(result);
      setPhase("preview");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content:
          (lang === "nl" ? "**Preview in 3 talen:**\n\n" : lang === "de" ? "**Vorschau in 3 Sprachen:**\n\n" : "**Preview in 3 languages:**\n\n") +
          `🇬🇧 **EN**\n**Q:** ${result.question_en}\n**A:** ${result.answer_en}\n\n` +
          `🇳🇱 **NL**\n**Q:** ${result.question_nl}\n**A:** ${result.answer_nl}\n\n` +
          `🇩🇪 **DE**\n**Q:** ${result.question_de}\n**A:** ${result.answer_de}` },
      ]);

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
      setPhase("drafting-answer");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: lang === "nl"
          ? "Vertaling mislukt. Probeer het opnieuw — geef het antwoord nogmaals."
          : lang === "de"
          ? "Übersetzung fehlgeschlagen. Bitte versuche es erneut — gib die Antwort nochmals ein."
          : "Translation failed. Please try again — provide the answer once more." },
      ]);
      return null;
    }
  }, [setMessages, lang]);

  const apply = useCallback(async () => {
    setPhase("applying");
    setError(null);

    try {
      let body: Record<string, unknown>;

      if (action === "delete" && selectedFaq?.notionPageId) {
        body = { action: "delete", notionPageId: selectedFaq.notionPageId };
      } else if (action === "edit" && selectedFaq?.notionPageId && translations) {
        body = {
          action: "edit",
          notionPageId: selectedFaq.notionPageId,
          question: translations.question_en,
          questionNl: translations.question_nl,
          questionDe: translations.question_de,
          answer: translations.answer_en,
          answerNl: translations.answer_nl,
          answerDe: translations.answer_de,
          category: draftCategory || selectedFaq.category,
          url: draftUrl || selectedFaq.url,
        };
      } else if (action === "add" && translations) {
        body = {
          action: "add",
          question: translations.question_en,
          questionNl: translations.question_nl,
          questionDe: translations.question_de,
          answer: translations.answer_en,
          answerNl: translations.answer_nl,
          answerDe: translations.answer_de,
          category: draftCategory,
          url: draftUrl,
        };
      } else {
        throw new Error("Invalid state");
      }

      const res = await fetch("/api/faq-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Operation failed");
      }

      const result = await res.json();

      const faqRes = await fetch("/api/faqs?fresh=true");
      if (faqRes.ok) {
        const updatedFaqs = await faqRes.json();
        setFaqs(updatedFaqs);
      }

      setPhase("done");

      const actionLabel = action === "add"
        ? (lang === "nl" ? "toegevoegd" : lang === "de" ? "hinzugefügt" : "added")
        : action === "edit"
        ? (lang === "nl" ? "bijgewerkt" : lang === "de" ? "aktualisiert" : "updated")
        : (lang === "nl" ? "verwijderd" : lang === "de" ? "gelöscht" : "deleted");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: lang === "nl"
          ? `FAQ succesvol ${actionLabel}! ✓\n\n${result.question ? `**${result.question}**` : ""}`
          : lang === "de"
          ? `FAQ erfolgreich ${actionLabel}! ✓\n\n${result.question ? `**${result.question}**` : ""}`
          : `FAQ successfully ${actionLabel}! ✓\n\n${result.question ? `**${result.question}**` : ""}` },
      ]);

      setTimeout(() => reset(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
      setPhase("preview");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: lang === "nl"
          ? "Operatie mislukt. Probeer het opnieuw."
          : lang === "de"
          ? "Vorgang fehlgeschlagen. Bitte versuche es erneut."
          : "Operation failed. Please try again." },
      ]);
    }
  }, [action, selectedFaq, translations, draftCategory, draftUrl, setFaqs, setMessages, lang, reset]);

  const cancel = useCallback(() => {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: lang === "nl"
        ? "FAQ bewerking geannuleerd."
        : lang === "de"
        ? "FAQ-Bearbeitung abgebrochen."
        : "FAQ editing cancelled." },
    ]);
    reset();
  }, [setMessages, lang, reset]);

  const revise = useCallback(() => {
    setPhase("revise");
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: lang === "nl"
        ? "Wat wil je aanpassen?"
        : lang === "de"
        ? "Was möchtest du ändern?"
        : "What would you like to change?" },
    ]);
  }, [setMessages, lang]);

  const handleAdminInput = useCallback((text: string): boolean => {
    if (phase === "idle") return false;

    if (phase === "choose-faq") {
      const num = parseInt(text.trim(), 10);
      if (isNaN(num) || num < 1 || num > faqs.length) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: text },
          { role: "assistant", content: lang === "nl"
            ? `Ongeldig nummer. Kies een nummer tussen 1 en ${faqs.length}.`
            : lang === "de"
            ? `Ungültige Nummer. Wähle eine Nummer zwischen 1 und ${faqs.length}.`
            : `Invalid number. Choose a number between 1 and ${faqs.length}.` },
        ]);
        return true;
      }
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      chooseFaq(num - 1);
      return true;
    }

    if (phase === "drafting-question") {
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      if (action === "edit" && selectedFaq && text.trim().toLowerCase() === "ok") {
        setDraftQuestion(selectedFaq.question);
      } else {
        setDraftQuestion(text.trim());
      }

      setPhase("drafting-answer");
      if (action === "edit" && selectedFaq) {
        const getA = lang === "nl" && selectedFaq.answerNl ? selectedFaq.answerNl : lang === "de" && selectedFaq.answerDe ? selectedFaq.answerDe : selectedFaq.answer;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: lang === "nl"
            ? `Wat wordt het nieuwe antwoord? (of typ 'ok' om het huidige te behouden)\n\nHuidig antwoord:\n${getA}`
            : lang === "de"
            ? `Was wird die neue Antwort? (oder tippe 'ok' um die aktuelle zu behalten)\n\nAktuelle Antwort:\n${getA}`
            : `What should the new answer be? (or type 'ok' to keep the current one)\n\nCurrent answer:\n${getA}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: lang === "nl"
            ? "Wat is het antwoord?"
            : lang === "de"
            ? "Was ist die Antwort?"
            : "What is the answer?" },
        ]);
      }
      return true;
    }

    if (phase === "drafting-answer") {
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      if (action === "edit" && selectedFaq && text.trim().toLowerCase() === "ok") {
        setDraftAnswer(selectedFaq.answer);
      } else {
        setDraftAnswer(text.trim());
      }

      // Next: ask for category
      showCategoryPicker();
      return true;
    }

    if (phase === "choose-category") {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      const num = parseInt(text.trim(), 10);
      if (!isNaN(num) && num >= 1 && num <= categories.length) {
        setDraftCategory(categories[num - 1]);
      } else {
        setDraftCategory(text.trim());
      }

      // Next: ask about link
      showLinkChoice();
      return true;
    }

    if (phase === "choose-link") {
      const lower = text.trim().toLowerCase();
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      if (["ja", "yes", "ja!", "yes!", "y", "j"].includes(lower)) {
        setPhase("drafting-link");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: lang === "nl"
            ? "Plak de link (URL):"
            : lang === "de"
            ? "Füge den Link (URL) ein:"
            : "Paste the link (URL):" },
        ]);
      } else {
        setDraftUrl("");
        // Start translation with collected data
        const question = draftQuestion || (selectedFaq?.question ?? "");
        const answer = draftAnswer || (selectedFaq?.answer ?? "");
        const sourceLang = detectLanguage(question + " " + answer);
        translateDraft(question, answer, sourceLang);
      }
      return true;
    }

    if (phase === "drafting-link") {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setDraftUrl(text.trim());

      // Start translation with collected data
      const question = draftQuestion || (selectedFaq?.question ?? "");
      const answer = draftAnswer || (selectedFaq?.answer ?? "");
      const sourceLang = detectLanguage(question + " " + answer);
      translateDraft(question, answer, sourceLang);
      return true;
    }

    if (phase === "revise") {
      const lower = text.trim().toLowerCase();
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      if (["vraag", "question", "frage", "q"].includes(lower)) {
        setPhase("drafting-question");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: lang === "nl"
            ? "Wat wordt de nieuwe vraag?"
            : lang === "de"
            ? "Was wird die neue Frage?"
            : "What should the new question be?" },
        ]);
      } else if (["antwoord", "answer", "antwort", "a"].includes(lower)) {
        setPhase("drafting-answer");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: lang === "nl"
            ? "Wat wordt het nieuwe antwoord?"
            : lang === "de"
            ? "Was wird die neue Antwort?"
            : "What should the new answer be?" },
        ]);
      } else if (["beide", "both", "beides", "alles", "all"].includes(lower)) {
        setPhase("drafting-question");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: lang === "nl"
            ? "Wat wordt de nieuwe vraag?"
            : lang === "de"
            ? "Was wird die neue Frage?"
            : "What should the new question be?" },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: lang === "nl"
            ? "Kies: vraag, antwoord of beide"
            : lang === "de"
            ? "Wähle: Frage, Antwort oder beides"
            : "Choose: question, answer, or both" },
        ]);
      }
      return true;
    }

    return false;
  }, [phase, action, selectedFaq, draftQuestion, draftAnswer, faqs, categories, chooseFaq, translateDraft, showCategoryPicker, showLinkChoice, setMessages, lang]);

  return {
    phase,
    action,
    selectedFaq,
    translations,
    error,
    categories,
    startAdmin,
    chooseAction,
    chooseFaq,
    translateDraft,
    apply,
    cancel,
    revise,
    reset,
    handleAdminInput,
  };
}

function detectLanguage(text: string): "en" | "nl" | "de" {
  const lower = text.toLowerCase();
  const nlWords = ["de", "het", "een", "van", "in", "is", "dat", "op", "voor", "met", "niet", "zijn", "aan", "er", "maar", "ook", "nog", "wel", "kan", "dit", "wat", "wordt", "waar", "hoe", "je", "we", "ons"];
  const deWords = ["der", "die", "das", "und", "ist", "von", "zu", "den", "mit", "auf", "für", "nicht", "sich", "ein", "eine", "dem", "des", "auch", "nach", "wie", "kann", "wird", "wir", "uns"];
  const enWords = ["the", "is", "are", "and", "of", "to", "in", "for", "that", "with", "not", "this", "but", "from", "they", "was", "have", "can", "will", "you", "we", "our"];

  const words = lower.split(/\s+/);
  let nlScore = 0, deScore = 0, enScore = 0;

  for (const word of words) {
    if (nlWords.includes(word)) nlScore++;
    if (deWords.includes(word)) deScore++;
    if (enWords.includes(word)) enScore++;
  }

  if (nlScore > deScore && nlScore > enScore) return "nl";
  if (deScore > nlScore && deScore > enScore) return "de";
  return "en";
}
