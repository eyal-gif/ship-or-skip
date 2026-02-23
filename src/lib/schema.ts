import {
  pgTable,
  uuid,
  timestamp,
  jsonb,
  text,
  decimal,
} from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  answers: jsonb("answers").notNull().default({}),
  status: text("status").notNull().default("in_progress"),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id),
  email: text("email").notNull(),
  name: text("name"),
  image: text("image"),
  domain: text("domain"),
  companyData: jsonb("company_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id),
  leadId: uuid("lead_id").references(() => leads.id),
  slug: text("slug").unique().notNull(),
  featureName: text("feature_name").notNull(),
  companyName: text("company_name"),
  overallScore: decimal("overall_score", { precision: 3, scale: 1 }),
  verdict: text("verdict"),
  scores: jsonb("scores").notNull(),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
