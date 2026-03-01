import { z } from "zod";

export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).min(1),
  lang: z.string().max(5).optional(),
  flowContext: z.record(z.string(), z.string()).optional(),
});

export const chatLogSchema = z.object({
  question: z.string().min(1).max(2000),
  answer: z.string().max(2000).optional().default(""),
  source: z.string().max(100).optional(),
  lang: z.string().max(5).optional(),
  sessionId: z.string().max(100).optional(),
});

export const chatShareSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).min(1),
  flowContext: z.record(z.string(), z.string()).optional(),
  lang: z.string().max(5).optional().default("en"),
  currentFlowStepName: z.string().optional(),
  flowPhase: z.string().optional(),
});

export const feedbackSchema = z.object({
  feedback: z.string().max(2000).optional(),
  contact: z.string().max(500).optional(),
}).refine((d) => d.feedback || d.contact, {
  message: "Provide feedback or contact",
});

export const ratingSchema = z.object({
  rating: z.enum(["👍", "👎"]),
});
