import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { FiSmile } from "react-icons/fi";
import { login, forgotPassword, verifyOTP, resetPassword } from "../redux/authSlice";

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
      toast.success("Login successful!");

      const requestedPath = location.state?.from?.pathname;

      const defaultRoute =
        result.user.accountType === "admin"
          ? "/admin"
          : result.user.accountType === "teacher"
            ? "/teacher"
            : result.user.accountType === "student"
              ? "/home"
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
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-6 sm:px-6 sm:py-10 bg-[url('/paper-geometric-shape.jpg')] bg-cover bg-center">
      <div className="w-full max-w-xs rounded-2xl bg-white/85 p-4 shadow-lg backdrop-blur-sm sm:max-w-md sm:p-8">
        <h2 className="text-2xl font-semibold text-center mb-6">
          {step === 1
            ? "Sign In"
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
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              className="w-full px-4 py-2 mb-2 rounded-lg border outline-none"
            />
            {emailError && (
              <div className="text-red-500 text-xs mb-2">{emailError}</div>
            )}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 mb-2 rounded-lg border outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
            />
            <div
              className="text-right text-sm text-purple-600 cursor-pointer mb-4"
              onClick={() => setStep(3)}
            >
              Forgot/Reset Password?
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-2 rounded-lg text-white bg-black hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
            <div className="text-center text-sm mt-4 text-gray-600">
              Don&apos;t have an account? Sign up on the website.{" "}
              <a
                href="https://dunamisindia.co.in/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline"
              >
                Go to Sign Up
              </a>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="mb-2 text-gray-700 text-center text-xs">
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
              className="w-full px-4 py-2 mb-2 rounded-lg border outline-none"
            />
            {forgotError && (
              <div className="text-red-500 text-xs mb-2">{forgotError}</div>
            )}
            <button
              onClick={handleForgotSubmit}
              disabled={loading}
              className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
            <div
              className="text-center text-xs text-purple-600 cursor-pointer mt-4"
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
            <div className="mb-2 text-gray-700 text-center text-xs">
              Enter the 6-digit OTP sent to <strong>{forgotInput}</strong>
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
              className="w-full px-4 py-2 mb-2 rounded-lg border outline-none text-center text-2xl tracking-widest"
            />
            {otpError && (
              <div className="text-red-500 text-xs mb-2">{otpError}</div>
            )}
            <button
              onClick={handleOtpSubmit}
              disabled={loading}
              className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <div className="text-center text-xs text-gray-600 mt-4">
              Didn't receive OTP?{" "}
              <span
                className="text-purple-600 cursor-pointer hover:underline"
                onClick={handleForgotSubmit}
              >
                Resend
              </span>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div className="mb-2 text-gray-700 text-center text-xs">
              Enter your new password
            </div>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 mb-2 rounded-lg border outline-none"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 mb-2 rounded-lg border outline-none"
            />
            <div className="text-xs text-gray-500 mb-4">
              Password must be at least 6 characters
            </div>
            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </>
        )}

        {step === 6 && (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl max-w-md mx-auto">
            <div className="mb-6 text-center">
              <span className="text-center">
                <FiSmile className="h-20 w-64 text-[#58896c]" />
              </span>
              <p className="mt-4 text-gray-700">Your password has been reset successfully!</p>
            </div>
            <button
              className="bg-gray-800 text-white rounded-2xl px-6 py-2 hover:bg-gray-900 transition"
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
  );
};

export default SignIn;
