import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact Us",
  description: "Get in touch with Dunamis School of Music. Call, WhatsApp, or email us, or send an enquiry — real humans reply, no bot maze. Visit our Hyderabad centre.",
  path: "/contact-us",
});

export default function RouteLayout({ children }) {
  return children;
}
