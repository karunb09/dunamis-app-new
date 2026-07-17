"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HiEye, HiEyeOff, HiLockClosed, HiMail } from "react-icons/hi";
import { login, logoutSession } from "@/store/authSlice";
import FloatingInput from "@/components/FloatingInput";
import {
  getPortalForAccountType,
  getPortalLabel,
  getRoleDestination,
} from "@/lib/roleRouting";

export default function LoginPageClient() {
  const router = useRouter();
  const params = useSearchParams();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth || {});
  const nextHref = params.get("next") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [staffPortalNotice, setStaffPortalNotice] = useState(null);

  const signupHref = useMemo(() => {
    const query = new URLSearchParams();
    if (nextHref) query.set("next", nextHref);
    return query.toString() ? `/signup?${query.toString()}` : "/signup";
  }, [nextHref]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    const action = await dispatch(login({ email, password, portalIntent: "student" }));

    if (!login.fulfilled.match(action)) return;

    const accountType = action.payload?.user?.accountType;
    const actualPortal = getPortalForAccountType(accountType);
    const destination = getRoleDestination(accountType);

    if (actualPortal && actualPortal !== "student") {
      await dispatch(logoutSession());
      setStaffPortalNotice({
        portalLabel: getPortalLabel(actualPortal),
        href: destination,
      });
      return;
    }

    if (actualPortal === "student" && nextHref) {
      router.replace(nextHref);
      return;
    }

    router.replace(destination);
  };

  return (
    <div className="bg-[radial-gradient(circle_at_top_left,#fff1e8,transparent_32%),#fffaf4] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2.25rem] border border-orange-100 bg-white shadow-[0_30px_100px_-60px_rgba(15,23,42,0.75)] lg:grid-cols-[0.9fr_1.1fr]">
        {staffPortalNotice ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[2rem] border border-orange-100 bg-white p-6 text-center shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
                Staff Portal Required
              </p>
              <h3 className="mt-3 text-2xl font-bold text-slate-950">
                Use the dashboard to sign in
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This email belongs to a {staffPortalNotice.portalLabel} account. Admins and instructors sign in from the Staff Portal, not the student website.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a
                  href={staffPortalNotice.href}
                  className="inline-flex items-center justify-center rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
                >
                  Open Staff Portal
                </a>
                <button
                  type="button"
                  onClick={() => setStaffPortalNotice(null)}
                  className="inline-flex items-center justify-center rounded-full border border-stone-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-stone-50"
                >
                  Stay here
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <section className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-[#b93415] p-10 text-white lg:flex">
          <div className="relative z-10">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/70">
              Dunamis Portal
            </p>
            <h1 className="mt-6 max-w-md text-5xl font-bold leading-tight">
              Sign in to continue learning.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/80">
              Student accounts use the website portal for courses, payments,
              assignments, and learning progress.
            </p>
          </div>
          <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute left-10 top-32 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        </section>

        <section className="p-6 sm:p-10">
          <div className="mt-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Student sign in
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Use this page for student accounts only. Instructors and admins
              should use the staff portal link in the footer.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <FloatingInput
              id="login-email"
              label="Email address"
              name="email"
              type="email"
              required
              autoComplete="email"
              icon={<HiMail className="h-5 w-5" />}
            />

            <div>
              <FloatingInput
                id="login-password"
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                icon={<HiLockClosed className="h-5 w-5" />}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-4 z-10 flex items-center text-slate-400 transition hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                  </button>
                }
              />
              <div className="mt-2 text-right">
                <Link href="/forgot-password" className="text-sm font-medium text-orange-600 hover:text-orange-700">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#fd5a1f] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:shadow-xl hover:shadow-orange-500/35 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in as Student"}
            </button>

            {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}

            <p className="text-center text-sm text-slate-600">
              New student?{" "}
              <Link href={signupHref} className="font-semibold text-orange-600 underline underline-offset-4">
                Create an account
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
