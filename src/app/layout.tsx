import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ship or Skip — Feature Validation | Product Builder",
  description:
    "Describe a feature. Get a score across 5 dimensions. Share the report with your team to decide: build it or skip it.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
