import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "FAQs",
  description: "Answers to common questions about Dunamis courses, demos, pricing plans, online vs offline classes, instructors and enrollment.",
  path: "/faqs",
});

export default function RouteLayout({ children }) {
  return children;
}
