import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Aggregator | Find Your Next Opportunity",
  description: "Search job opportunities across multiple platforms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
