"use client";

import { Suspense } from "react";
import PersonalInfoPage from "./signup.jsx";

export default function PersonalInfoPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PersonalInfoPage />
    </Suspense>
  );
}
