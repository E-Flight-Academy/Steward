import { useState, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Message } from "@/types/chat";
import type { UiLabels } from "@/lib/i18n/labels";

export function useRating(
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  lang: string,
  sessionId: string,
  t: (key: keyof UiLabels) => string
) {
  const [pendingFeedbackLogId, setPendingFeedbackLogId] = useState<string | null>(null);
  const [feedbackFollowUpLogId, setFeedbackFollowUpLogId] = useState<string | null>(null);
  const [feedbackContactLogId, setFeedbackContactLogId] = useState<string | null>(null);

  const rateMessage = useCallback((msgIndex: number, rating: "\u{1F44D}" | "\u{1F44E}", e?: React.MouseEvent) => {
    if (rating === "\u{1F44D}" && e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: ["#1515F5", "#A1A1FB", "#85D9BF", "#6666FF"],
        scalar: 0.8,
        gravity: 1.2,
        ticks: 60,
      });
    }
    setMessages((prev) => {
      const msg = prev[msgIndex];
      if (!msg) return prev;

      // Optimistic UI update
      const updated = prev.map((m, i) => (i === msgIndex ? { ...m, rating } : m));

      // Show feedback message
      const feedbackMsg: Message = {
        role: "assistant",
        content: rating === "\u{1F44D}" ? t("feedback.thanksUp") : t("feedback.askDown"),
      };
      const withFeedback = [...updated, feedbackMsg];

      const resolveLogId = (logId: string) => {
        if (rating === "\u{1F44E}") setPendingFeedbackLogId(logId);
      };

      if (msg.logId) {
        // Already logged — just update rating
        fetch(`/api/chat/log/${encodeURIComponent(msg.logId)}/rate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating }),
        }).catch(() => {});
        resolveLogId(msg.logId);
      } else {
        // Not yet logged — find the preceding user message and log first
        let question = "";
        for (let i = msgIndex - 1; i >= 0; i--) {
          if (prev[i].role === "user") { question = prev[i].content; break; }
        }
        const sourceMatch = msg.content.match(/\[source:\s*(.+?)\]\s*$/i);
        const source = sourceMatch?.[1] || null;
        fetch("/api/chat/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, answer: msg.content, source, lang, sessionId }),
        })
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            if (data?.logId) {
              setMessages((p) =>
                p.map((m, i) => i === msgIndex ? { ...m, logId: data.logId } : m)
              );
              fetch(`/api/chat/log/${encodeURIComponent(data.logId)}/rate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating }),
              }).catch(() => {});
              resolveLogId(data.logId);
            }
          })
          .catch(() => {});
      }

      return withFeedback;
    });
  }, [lang, sessionId, t, setMessages]);

  return {
    pendingFeedbackLogId,
    setPendingFeedbackLogId,
    feedbackFollowUpLogId,
    setFeedbackFollowUpLogId,
    feedbackContactLogId,
    setFeedbackContactLogId,
    rateMessage,
  };
}
