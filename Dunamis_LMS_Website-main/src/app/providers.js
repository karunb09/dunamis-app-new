"use client";

import { useEffect, useRef } from "react";
import { Provider, useDispatch } from "react-redux";
import { makeStore } from "@/store/store";
import { hydrateSession } from "@/store/authSlice";

function AuthSessionHydrator({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    // Refresh/validate the session against the backend after first paint.
    // The first render is already correct (seeded from the server cookie),
    // so this no longer causes a hydration mismatch.
    dispatch(hydrateSession());
  }, [dispatch]);

  return children;
}

export function Providers({ children, initialAuth }) {
  // One store per request. On the client this runs once (useRef), seeded with
  // the same server-read auth state used for the server render -> identical
  // first render on both sides.
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = makeStore(
      initialAuth ? { auth: initialAuth } : undefined,
    );
  }

  return (
    <Provider store={storeRef.current}>
      <AuthSessionHydrator>{children}</AuthSessionHydrator>
    </Provider>
  );
}
