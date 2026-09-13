import type { Metadata } from "next";
import { LatexStudio } from "@/components/latex/LatexStudio";

export const metadata: Metadata = {
  title: "LaTeX studio",
  description: "Edit and compile your LaTeX resume in the browser with an Overleaf-style editor and live errors, or open it in Overleaf.",
};

export default function LatexPage() {
  return <LatexStudio />;
}
