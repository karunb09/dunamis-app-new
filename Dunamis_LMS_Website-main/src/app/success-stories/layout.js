import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Success Stories",
  description: "Real student success stories from Dunamis School of Music — watch journeys in music, singing, dance and more, with video highlights.",
  path: "/success-stories",
});

export default function RouteLayout({ children }) {
  return children;
}
