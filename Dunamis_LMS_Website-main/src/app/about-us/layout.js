import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "About Us",
  description: "Discover Dunamis School of Music — our mission, expert instructors, and approach to teaching music, dance, chess and more across online and offline centres.",
  path: "/about-us",
});

export default function RouteLayout({ children }) {
  return children;
}
