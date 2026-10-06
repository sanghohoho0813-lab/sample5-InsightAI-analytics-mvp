import type { Metadata } from "next";

export const metadata: Metadata = { title: "보고서" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
