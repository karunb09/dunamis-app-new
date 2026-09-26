import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import authReducer from "../../redux/authSlice";
import { PublicOnlyRoute } from "./AuthGuard";
import SignIn from "../signIn";

const ADMIN = {
  _id: "u1",
  name: { firstName: "Karun", lastName: "B" },
  email: "admin@example.com",
  accountType: "admin",
};

const makeStore = (auth = {}) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        ...authReducer(undefined, { type: "@@init" }),
        user: null,
        token: null,
        hydrating: false,
        ...auth,
      },
    },
  });

const LocationProbe = () => <p data-testid="location">{useLocation().pathname}</p>;

const renderAt = (store, entry, publicChild = <p>sign in page</p>) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/" element={<PublicOnlyRoute>{publicChild}</PublicOnlyRoute>} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

afterEach(() => {
  vi.unstubAllGlobals();
  // A successful login persists the session, which the guard also reads.
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("PublicOnlyRoute", () => {
  it("redirects an already signed-in user straight to their dashboard", () => {
    renderAt(makeStore({ user: ADMIN, token: "t" }), "/");
    expect(screen.getByTestId("location")).toHaveTextContent("/admin");
  });

  it("keeps a just-signed-in user on the sign-in page while the login hold is up", () => {
    renderAt(makeStore({ user: ADMIN, token: "t", loginHold: true }), "/");
    expect(screen.getByText("sign in page")).toBeInTheDocument();
  });
});

describe("SignIn success hold", () => {
  it("shows the Signed in overlay, then lands on the originally requested page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ success: true, token: "t", user: ADMIN }),
      }))
    );
    const store = makeStore();
    renderAt(store, { pathname: "/", state: { from: { pathname: "/admin/financials" } } }, <SignIn />);

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: ADMIN.email } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(
      await screen.findByText("Welcome back, Karun! Loading your dashboard…")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("location")).not.toBeInTheDocument();

    expect(await screen.findByTestId("location", {}, { timeout: 2500 })).toHaveTextContent(
      "/admin/financials"
    );
    expect(store.getState().auth.loginHold).toBe(false);
  });

  it("releases the hold when the login fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ success: false, message: "Email or password is incorrect" }),
      }))
    );
    const store = makeStore();
    renderAt(store, "/", <SignIn />);

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: ADMIN.email } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(store.getState().auth.loginHold).toBe(true);

    // The hold is released in SignIn's catch, a tick after login.rejected.
    await waitFor(() => expect(store.getState().auth.loginHold).toBe(false));
    expect(store.getState().auth.loading).toBe(false);
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });
});
