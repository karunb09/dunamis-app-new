"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { getWebsiteToken, getWebsiteUser } from "@/lib/authSession";
import { isStudentAccount } from "@/lib/roleRouting";
import { API_BASE } from "@/lib/apiBase";

// Authenticated access-status check goes through the BFF proxy.
const BASE_URL = API_BASE;
// Reachable while access is paused — otherwise the student cannot get to the
// page that clears the overdue fee.
const PAYMENT_ALLOWED_PATHS = new Set(["/student/profile", "/student/fees"]);

export default function StudentGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useSelector((state) => state.auth || {});
  const [checked, setChecked] = useState(false);
  const [restriction, setRestriction] = useState(null);

  const session = useMemo(() => {
    if (typeof window === "undefined") {
      return { token: auth.token, user: auth.user };
    }

    return {
      token: auth.token || getWebsiteToken(),
      user: auth.user || getWebsiteUser(),
    };
  }, [auth.token, auth.user]);

  useEffect(() => {
    let cancelled = false;

    if (auth.hydrating) {
      return;
    }

    if (!session.token) {
      setChecked(false);
      router.replace(`/login?portal=student&next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!isStudentAccount(session.user)) {
      setChecked(false);
      router.replace("/login?portal=student");
      return;
    }

    const checkPaymentAccess = async () => {
      if (PAYMENT_ALLOWED_PATHS.has(pathname)) {
        setRestriction(null);
        setChecked(true);
        return;
      }

      try {
        const response = await fetch(`${BASE_URL}/v1/enrollment/access-status`, {
          credentials: "include",
          headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
        });
        const data = await response.json();

        if (cancelled) return;

        if (response.ok && data.accessRestricted) {
          setRestriction(data);
        } else {
          setRestriction(null);
        }
      } catch (error) {
        if (!cancelled) setRestriction(null);
      } finally {
        if (!cancelled) setChecked(true);
      }
    };

    checkPaymentAccess();

    return () => {
      cancelled = true;
    };
  }, [auth.hydrating, pathname, router, session.token, session.user]);

  if (!checked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
        <div className="rounded-3xl border border-orange-100 bg-white px-8 py-6 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
            Student Area
          </p>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            Checking your session...
          </p>
        </div>
      </div>
    );
  }

  if (restriction?.accessRestricted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
        <div className="max-w-xl rounded-3xl border border-red-100 bg-white px-8 py-7 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-500">
            Payment Required
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-950">Course access is paused</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {restriction.message || "Please clear your overdue installment to continue."}
          </p>
          {restriction.overduePayments?.[0]?.dueDate ? (
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Due date: {new Date(restriction.overduePayments[0].dueDate).toLocaleDateString("en-IN")}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => router.replace("/student/fees")}
            className="mt-6 rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            Pay now and restore access
          </button>
        </div>
      </div>
    );
  }

  return children;
}
