import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";

export const metadata = {
  title: "Login | Dunamis",
  description: "Sign in to the Dunamis student, instructor, or admin portal.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}
