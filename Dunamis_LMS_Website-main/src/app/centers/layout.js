import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Offline Centres",
  description: "Find a Dunamis offline centre near you. Browse branches by city, view timings, and book an in-person demo with local instructors.",
  path: "/centers",
});

export default function RouteLayout({ children }) {
  return children;
}
