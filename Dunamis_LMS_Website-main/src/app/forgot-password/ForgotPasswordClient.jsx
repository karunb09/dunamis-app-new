"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HiArrowLeft, HiCheckCircle, HiEye, HiEyeOff, HiLockClosed, HiMail } from "react-icons/hi";
import { forgotPassword, verifyOtp, resetPassword, clearAuthFlags } from "@/store/authSlice";

const STEPS = { EMAIL: "email", OTP: "otp", RESET: "reset", DONE: "done" };

export default function ForgotPasswordClient() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { loading, error } = useSelector((state) => state.auth || {});

  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const clearErrors = () => {
    setLocalError("");
    dispatch(clearAuthFlags());
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    clearErrors();
    const result = await dispatch(forgotPassword(email));
    if (forgotPassword.fulfilled.match(result)) {
      setStep(STEPS.OTP);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearErrors();
    const result = await dispatch(verifyOtp({ email, otp }));
    if (verifyOtp.fulfilled.match(result)) {
      setStep(STEPS.RESET);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearErrors();
    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    const result = await dispatch(resetPassword({ email, otp, newPassword }));
    if (resetPassword.fulfilled.match(result)) {
      setStep(STEPS.DONE);
    }
  };

  const displayError = localError || error;

  return (
    <div className="bg-[radial-gradient(circle_at_top_left,#fff1e8,transparent_32%),#fffaf4] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <Link
          href="/login"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          <HiArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <div className="rounded-[2.25rem] border border-orange-100 bg-white p-8 shadow-[0_30px_100px_-60px_rgba(15,23,42,0.75)] sm:p-10">
          {step === STEPS.DONE ? (
            <div className="flex flex-col items-center py-4 text-center">
              <HiCheckCircle className="h-14 w-14 text-emerald-500" />
              <h2 className="mt-4 text-2xl font-bold text-slate-950">Password reset!</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <button
                onClick={() => router.replace("/login")}
                className="mt-8 w-full rounded-full bg-orange-600 px-6 py-3 font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
              >
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
                {step === STEPS.EMAIL && "Step 1 of 3"}
                {step === STEPS.OTP && "Step 2 of 3"}
                {step === STEPS.RESET && "Step 3 of 3"}
              </p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">
                {step === STEPS.EMAIL && "Forgot your password?"}
                {step === STEPS.OTP && "Check your email"}
                {step === STEPS.RESET && "Set a new password"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {step === STEPS.EMAIL && "Enter your student account email and we'll send you a one-time code."}
                {step === STEPS.OTP && `We sent a 6-digit code to ${email}. Enter it below.`}
                {step === STEPS.RESET && "Choose a strong new password for your account."}
              </p>

              {step === STEPS.EMAIL && (
                <form onSubmit={handleSendEmail} className="mt-8 space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Email address</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                        <HiMail className="h-5 w-5" />
                      </span>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
                        className="w-full rounded-full border border-stone-200 bg-white px-12 py-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  {displayError && <p className="text-center text-sm text-red-600">{displayError}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-orange-600 px-6 py-3 font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-400"
                  >
                    {loading ? "Sending..." : "Send reset code"}
                  </button>
                </form>
              )}

              {step === STEPS.OTP && (
                <form onSubmit={handleVerifyOtp} className="mt-8 space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">One-time code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); clearErrors(); }}
                      className="w-full rounded-full border border-stone-200 bg-white px-6 py-3 text-center text-xl tracking-[0.5em] text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      placeholder="------"
                    />
                  </div>
                  {displayError && <p className="text-center text-sm text-red-600">{displayError}</p>}
                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full rounded-full bg-orange-600 px-6 py-3 font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-400"
                  >
                    {loading ? "Verifying..." : "Verify code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { clearErrors(); setOtp(""); setStep(STEPS.EMAIL); }}
                    className="w-full text-center text-sm text-slate-500 transition hover:text-slate-800"
                  >
                    Wrong email? Go back
                  </button>
                </form>
              )}

              {step === STEPS.RESET && (
                <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">New password</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                        <HiLockClosed className="h-5 w-5" />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); clearErrors(); }}
                        className="w-full rounded-full border border-stone-200 bg-white px-12 py-3 pr-14 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        placeholder="Min. 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-4 flex items-center text-slate-400 transition hover:text-slate-600"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm new password</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                        <HiLockClosed className="h-5 w-5" />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); clearErrors(); }}
                        className="w-full rounded-full border border-stone-200 bg-white px-12 py-3 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        placeholder="Repeat password"
                      />
                    </div>
                  </div>
                  {displayError && <p className="text-center text-sm text-red-600">{displayError}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-orange-600 px-6 py-3 font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-400"
                  >
                    {loading ? "Resetting..." : "Reset password"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
