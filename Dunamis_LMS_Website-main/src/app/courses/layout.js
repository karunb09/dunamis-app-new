import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Courses — Music, Singing, Dance, Chess & More",
  description:
    "Browse Dunamis courses across music, singing, dance, chess, languages and wellness. Filter by category, level and mode, book a free demo, and enroll online or offline.",
  path: "/courses",
});

export default function CoursesLayout({ children }) {
  return children;
}
