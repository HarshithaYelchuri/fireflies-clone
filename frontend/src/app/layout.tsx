import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";

import { Providers } from "@/components/layout/providers";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Hersheys.ai", template: "%s | Hersheys.ai" },
  description: "AI meeting intelligence that captures conversations, understands decisions, and turns them into actionable work.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
