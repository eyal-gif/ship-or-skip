import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug || !/^[a-z0-9]{10}$/.test(slug)) {
    return new Response("Invalid slug", { status: 400 });
  }

  let featureName = "Feature Analysis";
  let score = "7.0";
  let verdict = "NEEDS WORK";

  try {
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.slug, slug))
      .limit(1);

    if (report) {
      featureName = report.featureName;
      score = report.overallScore || "0";
      verdict = report.verdict || "NEEDS WORK";
    }
  } catch {
    // Use defaults
  }

  const verdictColor =
    verdict === "BUILD IT" ? "#22C55E" : verdict === "SKIP IT" ? "#EF4444" : "#F59E0B";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1A1A1A",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#FF6B35",
            letterSpacing: "2px",
            marginBottom: "24px",
          }}
        >
          PRODUCT BUILDER
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "#FFFFFF",
            marginBottom: "32px",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          {featureName}
        </div>
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: "#FF6B35",
            lineHeight: 1,
          }}
        >
          {score}
        </div>
        <div
          style={{
            fontSize: 16,
            color: "#999999",
            marginBottom: "16px",
          }}
        >
          / 10
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: verdictColor,
            padding: "8px 24px",
            borderRadius: "8px",
            backgroundColor: `${verdictColor}22`,
          }}
        >
          {verdict}
        </div>
        <div
          style={{
            fontSize: 14,
            color: "#666666",
            marginTop: "40px",
          }}
        >
          productbuilder.ai
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
