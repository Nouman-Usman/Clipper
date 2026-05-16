import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clipper | Video Repurposing on Autopilot",
  description:
    "Clipper turns one long-form video into platform-ready short clips with AI clip selection, captions, and auto-post workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
