import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Reviews & Testimonials",
  description: "Read what Dunamis learners and parents say about our instructors, classes and results across music, dance, chess and languages.",
  path: "/testimonials",
});

export default function RouteLayout({ children }) {
  return children;
}
