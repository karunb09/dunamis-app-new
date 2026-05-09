"use client";

import { useEffect } from "react";
import store from "@/store/store";
import { hydrateSession } from "@/store/authSlice";
import { Provider } from "react-redux";

function AuthSessionHydrator({ children }) {
  useEffect(() => {
    store.dispatch(hydrateSession());
  }, []);

  return children;
}

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <AuthSessionHydrator>{children}</AuthSessionHydrator>
    </Provider>
  );
}
