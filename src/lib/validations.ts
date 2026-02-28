import { z } from "zod";

export const createSessionSchema = z.object({
  ideaDescription: z.string().min(10).max(1000),
});

export const updateSessionSchema = z.object({
  questionKey: z.enum(["q1", "q2", "q3", "q4", "q5"]),
  answer: z.string().max(5000).nullable(),
});

export const createLeadSchema = z.object({
  sessionId: z.string().uuid(),
  email: z.string().email().max(255),
  name: z.string().max(255).nullable().optional(),
  image: z.string().url().max(2048).nullable().optional(),
});

export const generateReportSchema = z.object({
  sessionId: z.string().uuid(),
  leadId: z.string().uuid(),
});
