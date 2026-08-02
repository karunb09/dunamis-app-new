import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Login",
  description: "Sign in to the Dunamis student, instructor, or admin portal.",
  path: "/login",
});

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}
