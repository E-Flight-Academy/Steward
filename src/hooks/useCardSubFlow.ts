import { useState, useCallback } from "react";
import type { Message, CardAction, CardSubFlowState, StructuredContent } from "@/types/chat";

function resolveTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => context[key] || "");
}

/** Check if a resolved label has empty template var segments like "()" */
function hasUnresolvedVars(resolved: string, original: string): boolean {
  if (original === resolved) return false;
  return /\(\s*\)/.test(resolved) || resolved.trim().endsWith("(");
}

interface UseCardSubFlowParams {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsLoading: (v: boolean) => void;
  setProgressSteps: (v: string[]) => void;
  lang: string;
  userEmailOverride?: string;
  roleOverride?: string[];
}

/** Fetch course lesson plans and resolve previousLessonName into booking context */
async function enrichBookingContext(
  ctx: Record<string, string>,
  userEmailOverride?: string,
  roleOverride?: string[],
): Promise<Record<string, string>> {
  const courseId = ctx.courseId;
  const planId = ctx.planId;
  if (!courseId || !planId) return ctx;

  try {
    const params: Record<string, unknown> = {
      action: "course-plans",
      courseId: Number(courseId),
    };
    if (userEmailOverride) params.userEmail = userEmailOverride;
    if (roleOverride) params.roleOverride = roleOverride;

    const res = await fetch("/api/capability-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) return ctx;
    const data = await res.json();
    const plans: { id: number; sequence: number; name: string }[] = data.plans || [];
    const currentIdx = plans.findIndex((p) => p.id === Number(planId));
    if (currentIdx > 0) {
      return { ...ctx, previousLessonName: plans[currentIdx - 1].name };
    }
  } catch {
    // Silently fail — previousLessonName stays empty, option gets hidden
  }
  return ctx;
}

export function useCardSubFlow({
  messages,
  setMessages,
  setIsLoading,
  setProgressSteps,
  lang,
  userEmailOverride,
  roleOverride,
}: UseCardSubFlowParams) {
  const [subFlow, setSubFlow] = useState<CardSubFlowState | null>(null);

  const startSubFlow = useCallback(async (action: CardAction, bookingContext: Record<string, string>) => {
    if (!action.subSteps || action.subSteps.length === 0) return;
    // Add user bubble for the initial action click
    const label = resolveTemplate(action.label, bookingContext);
    setMessages((prev) => [...prev, { role: "user", content: label }]);

    // Enrich context with course plan data (lazy fetch)
    const enrichedContext = await enrichBookingContext(bookingContext, userEmailOverride, roleOverride);

    setSubFlow({
      rootAction: action,
      stepIndex: 0,
      accumulatedContext: {},
      bookingContext: enrichedContext,
    });
  }, [setMessages, userEmailOverride, roleOverride]);

  const handleSubFlowOption = useCallback(async (optionLabel: string, contextValue: string) => {
    if (!subFlow) return;

    const { rootAction, stepIndex, accumulatedContext, bookingContext } = subFlow;
    const steps = rootAction.subSteps!;

    // Add user bubble
    setMessages((prev) => [...prev, { role: "user", content: optionLabel }]);

    // Parse contextValue (e.g. "lessonChoice=current") and accumulate
    const newContext = { ...accumulatedContext };
    if (contextValue.includes("=")) {
      const [key, val] = contextValue.split("=", 2);
      newContext[key] = val;
    }

    // Is this the last step?
    if (stepIndex >= steps.length - 1) {
      // Build final action string from template
      const allContext = { ...bookingContext, ...newContext };
      const actionStr = rootAction.actionTemplate
        ? resolveTemplate(rootAction.actionTemplate, allContext)
        : rootAction.contextKey;

      setSubFlow(null);
      setIsLoading(true);
      setProgressSteps(["Generating briefing..."]);

      try {
        const params: Record<string, unknown> = {
          action: actionStr,
          bookingId: bookingContext.bookingId ? Number(bookingContext.bookingId) : undefined,
          studentUserId: bookingContext.studentUserId ? Number(bookingContext.studentUserId) : undefined,
          studentName: bookingContext.studentName,
        };
        if (userEmailOverride) params.userEmail = userEmailOverride;
        if (roleOverride) params.roleOverride = roleOverride;

        const res = await fetch("/api/capability-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const detail = data.error || "Unknown error";
          throw new Error(
            res.status === 403 ? `Not authorized: ${detail}`
            : res.status === 400 ? `Invalid request: ${detail}`
            : res.status === 404 ? `Data not found: ${detail}`
            : `Failed (${res.status}): ${detail}`
          );
        }
        const result = await res.json();

        if (result.type && result.data) {
          const structured: StructuredContent = result;
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: structured.summary,
            structured,
          }]);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Something went wrong";
        console.error("[cardSubFlow]", actionStr, err);
        setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
      } finally {
        setIsLoading(false);
        setProgressSteps([]);
      }
    } else {
      // Advance to next step
      setSubFlow({
        ...subFlow,
        stepIndex: stepIndex + 1,
        accumulatedContext: newContext,
      });
    }
  }, [subFlow, setMessages, setIsLoading, setProgressSteps, userEmailOverride, roleOverride]);

  const handleSubFlowBack = useCallback(() => {
    if (!subFlow || subFlow.stepIndex === 0) {
      setSubFlow(null);
      return;
    }
    // Remove last user message
    setMessages((prev) => prev.slice(0, -1));
    const steps = subFlow.rootAction.subSteps!;
    const prevStep = steps[subFlow.stepIndex - 1];
    const newContext = { ...subFlow.accumulatedContext };
    for (const opt of prevStep.options) {
      if (opt.contextValue.includes("=")) {
        const [key] = opt.contextValue.split("=", 2);
        delete newContext[key];
      }
    }
    setSubFlow({
      ...subFlow,
      stepIndex: subFlow.stepIndex - 1,
      accumulatedContext: newContext,
    });
  }, [subFlow, setMessages]);

  const handleSubFlowCancel = useCallback(() => {
    setSubFlow(null);
  }, []);

  /** Get current step's options with resolved labels, filtering out unresolvable ones */
  const getVisibleOptions = useCallback(() => {
    if (!subFlow) return [];
    const step = subFlow.rootAction.subSteps![subFlow.stepIndex];
    if (!step) return [];
    const allContext = { ...subFlow.bookingContext, ...subFlow.accumulatedContext };
    return step.options
      .map((opt) => {
        const template = lang === "nl" ? opt.labelNl || opt.label : opt.label;
        const resolvedLabel = resolveTemplate(template, allContext);
        return { ...opt, resolvedLabel };
      })
      .filter((opt) => {
        if (!opt.hideIfEmpty) return true;
        const template = lang === "nl" ? opt.labelNl || opt.label : opt.label;
        if (hasUnresolvedVars(opt.resolvedLabel, template)) return false;
        if (!opt.resolvedLabel.trim()) return false;
        return true;
      });
  }, [subFlow, lang]);

  return {
    subFlow,
    startSubFlow,
    handleSubFlowOption,
    handleSubFlowBack,
    handleSubFlowCancel,
    getVisibleOptions,
  };
}
