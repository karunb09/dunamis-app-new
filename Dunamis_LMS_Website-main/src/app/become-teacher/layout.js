import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Become an Instructor",
  description: "Teach with Dunamis School of Music. Apply to become an instructor, share your specializations, and reach students online and at our centres.",
  path: "/become-teacher",
});

export default function RouteLayout({ children }) {
  return children;
}
