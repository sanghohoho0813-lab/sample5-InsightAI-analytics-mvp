import type { Metadata } from "next";

export const metadata: Metadata = { title: "이상 감지" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
