import { Suspense } from "react";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const metadata = {
  title: "Forgot Password | Dunamis",
  description: "Reset your Dunamis student account password.",
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
