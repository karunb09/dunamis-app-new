import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { FiAward, FiBookOpen, FiCalendar, FiCheckCircle, FiLock, FiUsers } from "react-icons/fi";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { login, forgotPassword, verifyOTP, resetPassword } from "../redux/authSlice";
import { clearAuthSession } from "../utils/authSession";
import { STUDENT_PORTAL_URL } from "../utils/portalUrls";

// Mirrors the post-login dashboard's input/button/link conventions.
const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const primaryButtonClass =
  "w-full rounded-2xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_-22px_rgba(239,106,50,0.95)] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50";
const linkClass = "cursor-pointer font-medium text-orange-600 hover:text-orange-700";
const eyeButtonClass =
  "absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-600";

// Same icon/gradient pairs as the admin home's metric tiles.
const workspaceTiles = [
  { label: "Courses", icon: FiBookOpen, chip: "from-teal-500 to-emerald-400" },
  { label: "Students", icon: FiUsers, chip: "from-[#FF6B35] to-amber-400" },
  { label: "Instructors", icon: FiAward, chip: "from-purple-500 to-fuchsia-400" },
  { label: "Schedules", icon: FiCalendar, chip: "from-sky-500 to-cyan-400" },
];

const SignIn = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotInput, setForgotInput] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading } = useSelector((state) => state.auth);

  const validateEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email");
      toast.error("Please enter a valid email");
      return;
    }
    setEmailError("");

    if (!email || !password) {
      toast.error("Please fill Email & Password");
      return;
    }

    try {
      const result = await dispatch(login({ email, password })).unwrap();

      if (result.user.accountType === "student") {
        clearAuthSession();
        toast.success("Students now use the website student portal.");
        window.location.href = STUDENT_PORTAL_URL;
        return;
      }

      toast.success("Login successful!");

      const requestedPath = location.state?.from?.pathname;

      const defaultRoute =
        result.user.accountType === "admin"
          ? "/admin"
          : result.user.accountType === "teacher"
            ? "/teacher"
            : null;

      if (!defaultRoute) {
        toast.error("Invalid account type");
        return;
      }

      navigate(requestedPath || defaultRoute, { replace: true });
    } catch (err) {
      if (err?.toLowerCase().includes("user is not registered")) {
        toast.error("User not found. Please sign up first.");
      } else if (err?.toLowerCase().includes("email or password is incorrect")) {
        toast.error("Please enter correct email or password.");
      } else if (err?.toLowerCase().includes("account has been deactivated")) {
        toast.error("Your account is deactivated. Please contact admin.");
      } else if (err?.toLowerCase().includes("student portal")) {
        toast.error("Students now sign in from the website student portal.");
      } else {
        toast.error(err || "Login failed. Please try again.");
      }
    }
  };

  const handleForgotSubmit = async () => {
    if (!validateEmail(forgotInput)) {
      setForgotError("Please enter a valid email");
      return;
    }
    setForgotError("");

    try {
      await dispatch(forgotPassword({ email: forgotInput })).unwrap();
      toast.success("OTP sent to your email!");
      setStep(4);
    } catch (error) {
      toast.error(error || "Failed to send OTP");
      setForgotError(error);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP");
      return;
    }
    setOtpError("");

    try {
      await dispatch(verifyOTP({ email: forgotInput, otp })).unwrap();
      toast.success("OTP verified successfully!");
      setStep(5);
    } catch (error) {
      setOtpError(error || "Invalid OTP");
      toast.error(error || "Invalid OTP");
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill both fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      await dispatch(resetPassword({ email: forgotInput, otp, newPassword })).unwrap();
      toast.success("Your password was reset successfully!");
      setStep(6);
      setNewPassword("");
      setConfirmPassword("");
      setPassword("");
      setForgotInput("");
      setOtp("");
    } catch (error) {
      toast.error(error || "Failed to reset password");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center bg-gradient-to-b from-[#fff4ec] via-[#fffaf6] to-white px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:min-h-[560px] lg:grid-cols-[1.1fr_1fr] lg:gap-8">
        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0f172a] via-[#1e1b3a] to-[#3b1d0f] px-6 py-8 text-white sm:px-8 sm:py-10 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-[#FF6B35]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[#47c9c4]/20 blur-3xl" />
          <div className="pointer-events-none absolute left-6 top-4 h-24 w-24 rounded-full bg-[#a855f7]/25 blur-2xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15">
              <FiLock className="text-orange-300" />
              Admin &amp; Instructor Workspace
            </span>
            <h1 className="mt-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
              Welcome back to Dunamis
            </h1>
            <p className="mt-2 hidden max-w-md text-sm leading-6 text-white/60 sm:block">
              Sign in to pick up where you left off with your courses, students, and schedules.
            </p>
          </div>
          <div className="relative mt-8 hidden grid-cols-2 gap-3 lg:grid">
            {workspaceTiles.map(({ label, icon: Icon, chip }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur"
              >
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${chip}`}
                >
                  <Icon />
                </span>
                <span className="text-sm font-medium text-white/80">{label}</span>
              </div>
            ))}
          </div>
          <div className="relative mt-3 hidden rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/20 via-orange-500/8 to-transparent px-5 py-4 lg:block">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-200/80">
              Workspace
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Navigate courses, students, and operations from one place.
            </p>
          </div>
        </section>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-orange-100/70 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
              Dunamis Dashboard
            </p>
            <h2 className="mb-6 mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
              {step === 1
                ? "Admin & Instructor Sign In"
                : step === 3
                  ? "Forgot Password"
                  : step === 4
                    ? "Verify OTP"
                    : step === 6
                      ? "Password Updated"
                      : "Reset Password"}
            </h2>

            {step === 1 && (
              <>
                <div className="mb-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs leading-5 text-orange-800">
                  Students now sign in from the website student portal. This dashboard is for admins and instructors only.
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  className={`${inputClass} mb-3`}
                />
                {emailError && (
                  <div className="-mt-1 mb-3 text-xs text-red-500">{emailError}</div>
                )}
                <div className="relative mb-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-11`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleLogin();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className={eyeButtonClass}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                  </button>
                </div>
                <div
                  className={`mb-5 text-right text-sm ${linkClass}`}
                  onClick={() => setStep(3)}
                >
                  Forgot/Reset Password?
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className={primaryButtonClass}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
                <div className="mt-5 text-center text-sm text-slate-500">
                  Student account? Continue on the website.{" "}
                  <a
                    href={STUDENT_PORTAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${linkClass} whitespace-nowrap`}
                  >
                    Open Student Portal
                  </a>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="mb-3 text-sm text-slate-500">
                  Enter your registered email to receive OTP
                </div>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={forgotInput}
                  onChange={(e) => {
                    setForgotInput(e.target.value);
                    if (forgotError) setForgotError("");
                  }}
                  className={`${inputClass} mb-3`}
                />
                {forgotError && (
                  <div className="-mt-1 mb-3 text-xs text-red-500">{forgotError}</div>
                )}
                <button
                  onClick={handleForgotSubmit}
                  disabled={loading}
                  className={primaryButtonClass}
                >
                  {loading ? "Sending..." : "Send OTP"}
                </button>
                <div
                  className={`mt-5 text-center text-sm ${linkClass}`}
                  onClick={() => {
                    setStep(1);
                    setForgotInput("");
                    setForgotError("");
                  }}
                >
                  Back to Sign In
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="mb-3 text-sm text-slate-500">
                  Enter the 6-digit OTP sent to <strong className="text-slate-700">{forgotInput}</strong>
                </div>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  maxLength={6}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    if (otpError) setOtpError("");
                  }}
                  className={`${inputClass} mb-3 text-center text-2xl tracking-widest`}
                />
                {otpError && (
                  <div className="-mt-1 mb-3 text-xs text-red-500">{otpError}</div>
                )}
                <button
                  onClick={handleOtpSubmit}
                  disabled={loading}
                  className={primaryButtonClass}
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
                <div className="mt-5 text-center text-sm text-slate-500">
                  Didn't receive OTP?{" "}
                  <span
                    className={linkClass}
                    onClick={handleForgotSubmit}
                  >
                    Resend
                  </span>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="mb-3 text-sm text-slate-500">
                  Enter your new password
                </div>
                <div className="relative mb-3">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((current) => !current)}
                    className={eyeButtonClass}
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  >
                    {showNewPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="relative mb-2">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className={eyeButtonClass}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="mb-5 text-xs text-slate-500">
                  Password must be at least 6 characters
                </div>
                <button
                  onClick={handleResetPassword}
                  disabled={loading}
                  className={primaryButtonClass}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </>
            )}

            {step === 6 && (
              <div className="flex flex-col items-center text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
                  <FiCheckCircle className="h-8 w-8" />
                </span>
                <p className="mb-6 mt-4 text-sm text-slate-600">Your password has been reset successfully!</p>
                <button
                  className={primaryButtonClass}
                  onClick={() => {
                    setStep(1);
                    setEmail("");
                    setPassword("");
                    setForgotInput("");
                    setOtp("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
