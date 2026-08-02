import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Sign Up",
  description:
    "Create your Dunamis account to book a free demo and enroll in music, dance, language and wellness classes.",
  path: "/signup",
});

export default function SignupLayout({ children }) {
  return children;
}
