import type { Metadata } from "next";

export const metadata: Metadata = { title: "서비스 소개" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
