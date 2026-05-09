"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { getWebsiteToken, getWebsiteUser } from "@/lib/authSession";
import { isStudentAccount } from "@/lib/roleRouting";

export default function StudentGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useSelector((state) => state.auth || {});
  const [checked, setChecked] = useState(false);

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

    setChecked(true);
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

  return children;
}
