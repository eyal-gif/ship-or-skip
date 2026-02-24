import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReportClient from "./ReportClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!/^[a-z0-9]{10}$/.test(slug)) return {};

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.slug, slug))
    .limit(1);

  if (!report) return {};

  const verdictLabel =
    report.verdict === "BUILD IT" ? "Build It" :
    report.verdict === "SKIP IT" ? "Skip It" : "Needs Work";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    title: `${report.featureName} — ${report.overallScore}/10 — ${verdictLabel} | Product Builder`,
    description: `Feature validation report: ${report.summary}`,
    openGraph: {
      title: `${report.featureName} — ${report.overallScore}/10 — ${verdictLabel}`,
      description: `Feature validation report: ${report.summary}`,
      images: [`${appUrl}/api/og?slug=${slug}`],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${report.featureName} — ${report.overallScore}/10 — ${verdictLabel}`,
      description: `Feature validation report: ${report.summary}`,
      images: [`${appUrl}/api/og?slug=${slug}`],
    },
  };
}

export default async function ReportPage({ params }: PageProps) {
  const { slug } = await params;

  if (!/^[a-z0-9]{10}$/.test(slug)) notFound();

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.slug, slug))
    .limit(1);

  if (!report) notFound();

  const scores = report.scores as Array<{
    dimension: string;
    score: number;
    detail: string;
  }>;

  return (
    <ReportClient
      featureName={report.featureName}
      companyName={report.companyName}
      companyDescription={report.companyDescription}
      companySize={report.companySize}
      companyIndustry={report.companyIndustry}
      overallScore={Number(report.overallScore)}
      verdict={report.verdict || "NEEDS WORK"}
      summary={report.summary || ""}
      scores={scores}
      slug={slug}
      createdAt={report.createdAt.toISOString()}
    />
  );
}
