import { useEffect } from "react";
import { clearAuthSession } from "../../utils/authSession";
import { STUDENT_PORTAL_URL } from "../../utils/portalUrls";

export default function StudentPortalRedirect() {
  useEffect(() => {
    clearAuthSession();
    window.location.replace(STUDENT_PORTAL_URL);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-center">
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-600">
          Student Portal
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">
          Redirecting to the website student portal...
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Students now sign in and learn from the unified Next.js website.
        </p>
      </div>
    </div>
  );
}
