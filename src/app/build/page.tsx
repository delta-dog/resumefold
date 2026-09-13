import type { Metadata } from "next";
import { Workspace } from "@/components/workspace/Workspace";

export const metadata: Metadata = {
  title: "Resume builder",
  description: "Build your resume with a live preview and an ATS checker. Export PDF, DOCX or LaTeX. Free, no sign-up.",
};

export default function BuildPage() {
  return <Workspace />;
}
