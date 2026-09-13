import { parseResume, type Resume } from "./schema";

/** A realistic starter so the preview and template thumbnails never render empty. */
export const sampleResume: Resume = parseResume({
  contact: {
    fullName: "John Doe",
    headline: "Software Engineer",
    email: "john.doe@example.com",
    phone: "(415) 555-0142",
    location: "San Francisco, CA",
    website: "johndoe.example.com",
    linkedin: "linkedin.com/in/johndoe",
    github: "github.com/johndoe",
  },
  summary:
    "Backend-leaning full-stack engineer with 5 years building high-throughput payment and data systems. Led migration of a monolith to event-driven services serving 40M requests/day.",
  experience: [
    {
      id: "e1",
      title: "Senior Software Engineer",
      company: "Northwind Payments",
      location: "San Francisco, CA",
      start: "2023-02",
      end: "",
      current: true,
      bullets: [
        "Led migration of the ledger service from a Rails monolith to 6 Go microservices, cutting p99 latency from 840ms to 120ms and reducing infra spend by $310K/yr.",
        "Designed an idempotent retry layer over Kafka that eliminated 98% of duplicate settlement events across 40M daily transactions.",
        "Mentored 4 engineers; introduced a design-review process adopted by 3 other teams.",
      ],
    },
    {
      id: "e2",
      title: "Software Engineer",
      company: "Lumen Analytics",
      location: "Seattle, WA",
      start: "2020-07",
      end: "2023-01",
      current: false,
      bullets: [
        "Built a real-time anomaly detection pipeline (Python, Flink, PostgreSQL) processing 2TB/day, surfacing incidents 15 minutes faster than the previous batch system.",
        "Shipped a self-serve dashboard builder in React and TypeScript used by 1,200 enterprise customers; raised weekly active usage 34%.",
      ],
    },
  ],
  education: [
    {
      id: "ed1",
      school: "University of Washington",
      degree: "B.S.",
      field: "Computer Science",
      location: "Seattle, WA",
      start: "2016-09",
      end: "2020-06",
      gpa: "3.8/4.0",
      details: ["Dean's List (6 quarters); TA for CSE 332 Data Structures"],
    },
  ],
  skills: [
    { id: "s1", category: "Languages", items: ["Go", "TypeScript", "Python", "SQL", "Java"] },
    { id: "s2", category: "Frameworks", items: ["React", "Next.js", "gRPC", "Flink", "Django"] },
    { id: "s3", category: "Infrastructure", items: ["Kafka", "PostgreSQL", "Kubernetes", "AWS", "Terraform"] },
  ],
  projects: [
    {
      id: "p1",
      name: "Ledgerlite",
      link: "github.com/johndoe/ledgerlite",
      tech: "Go, SQLite, WebAssembly",
      start: "2024-01",
      end: "2024-06",
      bullets: [
        "Open-source double-entry accounting library compiled to WASM; 2,100 GitHub stars and used by 3 fintech startups in production.",
      ],
    },
  ],
  certifications: [
    { id: "c1", name: "AWS Certified Solutions Architect – Associate", issuer: "Amazon Web Services", date: "2022-11", link: "" },
  ],
  meta: { template: "standard", latexStyle: "classic", paper: "letter" },
});
