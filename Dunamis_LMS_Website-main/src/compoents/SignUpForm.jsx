"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { HiArrowLeft, HiCheckCircle } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import { sendOtp, createStudent, setStep } from "../store/signupSlice";
import { Country } from "country-state-city";
import * as Select from "@radix-ui/react-select";
import { IoMdArrowDropdown } from "react-icons/io";
import BookDemoModal from "@/compoents/PopupModals/BookDemoModal";

const ButtonSpinner = ({ label }) => (
  <span className="inline-flex items-center gap-2">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
    <span>{label}</span>
  </span>
);

const StepBlockingLoader = ({ title, description }) => (
  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[28px] bg-white/80 px-6 backdrop-blur-sm">
    <div className="w-full max-w-xs rounded-[28px] border border-orange-100 bg-white px-5 py-5 text-center shadow-[0_24px_80px_-48px_rgba(249,115,22,0.9)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-500">
        <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-current border-r-transparent" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-orange-100">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-orange-400 to-orange-500" />
      </div>
    </div>
  </div>
);

export default function SignUpForm() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { step, otpSent, otpStatus, createStatus } = useSelector((state) => state.signup);
  const [isBookDemoOpen, setBookDemoOpen] = useState(false);

  // Step 1 Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [countryCode, setCountryCode] = useState("+91");

  // Step 2 Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP State
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(30);
  const intervalRef = useRef(null);
  const isOtpLoading = otpStatus === "loading";
  const isAccountCreating = createStatus === "loading";
  const isStep2Busy = isOtpLoading || isAccountCreating;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Step 1 continue
  const handleContinueStep1 = (e) => {
    e.preventDefault();

    if (!firstName || !lastName || !mobile) {
      toast.error("Please fill out all fields");
      return;
    }

    const fullNumber = countryCode + mobile;

    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    if (!phoneRegex.test(fullNumber)) {
      toast.error(
        "Please enter a valid mobile number with country code (e.g. +91 9876543210)"
      );
      return;
    }

    dispatch(setStep(2));
  };

  // Step 2 continue
  const handleContinueStep2 = (e) => {
    e.preventDefault();

    if (isStep2Busy) return;

    if (!email || !password || !confirmPassword) {
      toast.error("Please fill out all fields");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }

    const payload = {
      name: { firstName, lastName },
      mobileNo: countryCode + mobile,
      email,
      password,
      confirmPassword,
      otp,
    };

    dispatch(createStudent(payload))
      .unwrap()
      .then(() => {
        toast.success("Account created successfully!");
      })
      .catch((err) => toast.error(err || "Signup failed"));
  };

  // OTP Functions
  const handleSendOtp = () => {
    if (isStep2Busy) return;

    if (!email) {
      toast.error("Please enter your email first");
      return;
    }

    dispatch(sendOtp(email))
      .unwrap()
      .then(() => {
        toast.success("OTP sent successfully!");
        setCountdown(30);

        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      })
      .catch((err) => toast.error(err || "Failed to send OTP"));
  };

  return (
    <div className="w-[600px] mx-auto flex flex-col justify-center px-6 md:px-10 py-8 rounded-xl shadow-md bg-white">
      {/* Back Button */}
      <div
        onClick={
          isStep2Busy
            ? undefined
            : step === 1
              ? () => router.back()
              : () => dispatch(setStep(step - 1))
        }
        className={`mb-6 flex items-center text-sm transition ${
          isStep2Busy
            ? "cursor-not-allowed text-gray-300"
            : "cursor-pointer text-gray-500 hover:text-gray-700"
        }`}
      >
        <HiArrowLeft className="mr-1" />
        <span>Back</span>
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-center gap-4 mb-10 max-w-md mx-auto">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full font-semibold ${
                step >= s ? "bg-orange-400 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-1 ${
                  step >= s + 1 ? "bg-orange-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <form
          className="space-y-4 w-full md:w-3/4 mx-auto"
          onSubmit={handleContinueStep1}
        >
          <h2 className="text-2xl text-center font-bold mb-1">
            Personal Information
          </h2>
          <p className="text-center text-gray-600 text-sm mb-6">
            Let's start with your basic details
          </p>

          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter your first name"
            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter your last name"
            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <div className="flex items-center gap-2 w-full">
            {/* Country Code Select */}
            <div className="relative w-1/4">
              <Select.Root
              value={countryCode}
              onValueChange={(val) => setCountryCode(val.split("-")[0])} // +61
            >

                <Select.Trigger
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-orange-300"
                  aria-label="Country Code"
                >
                  <span className="truncate">{countryCode}</span>
                  <IoMdArrowDropdown className="text-gray-500 ml-1 flex-shrink-0" />
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content
                    className="z-50 bg-white rounded-lg shadow-lg border border-gray-200 mb-1 max-h-48 overflow-y-auto"
                    position="popper"
                    side="bottom"
                    align="center"
                  >
                    <Select.Viewport className="p-1">
                     {Country.getAllCountries().map((country) => (
                    <Select.Item
                      key={country.isoCode} // unique key
                      value={`+${country.phonecode}-${country.isoCode}`} // unique value for Select
                      className="cursor-pointer select-none px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-orange-100 flex items-center justify-between"
                    >
                      <Select.ItemText>
                        +{country.phonecode} {country.name}
                      </Select.ItemText>
                    </Select.Item>
                  ))}

                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Mobile Number Input */}
            <input
              type="tel"
              value={mobile}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setMobile(value);
              }}
              placeholder="Enter mobile number"
              className="w-3/4 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div className="text-center pt-4">
            <button
              type="submit"
              className="bg-orange-400 hover:bg-orange-500 text-white font-medium px-6 py-2 rounded-2xl transition"
            >
              Continue
            </button>
          </div>
        </form>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="relative mx-auto w-full md:w-1/2">
          {isStep2Busy && (
            <StepBlockingLoader
              title={isOtpLoading ? "Sending your OTP" : "Creating your account"}
              description={
                isOtpLoading
                  ? "Please wait while we secure your email verification."
                  : "Please wait while we complete your sign up."
              }
            />
          )}

          <form
            className={`space-y-4 ${isStep2Busy ? "pointer-events-none select-none" : ""}`}
            onSubmit={handleContinueStep2}
            aria-busy={isStep2Busy}
          >
            <h2 className="mb-1 text-center text-2xl font-bold">Account Creation</h2>
            <p className="mb-6 text-center text-sm text-gray-600">
              Set up your login credentials
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={isStep2Busy}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            />

            <div className="flex items-center gap-2">
              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isStep2Busy}
                  className="inline-flex min-w-[144px] items-center justify-center gap-2 rounded-lg bg-orange-400 px-4 py-2 text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-orange-300"
                >
                  {isOtpLoading ? <ButtonSpinner label="Sending OTP" /> : "Send OTP"}
                </button>
              ) : countdown > 0 ? (
                <p className="text-sm text-gray-500">Resend OTP in {countdown}s</p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isStep2Busy}
                  className="inline-flex min-w-[144px] items-center justify-center gap-2 rounded-lg bg-orange-400 px-4 py-2 text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-orange-300"
                >
                  {isOtpLoading ? <ButtonSpinner label="Sending OTP" /> : "Resend OTP"}
                </button>
              )}
            </div>

            {otpSent && (
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter OTP"
                required
                disabled={isStep2Busy}
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
              />
            )}

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              disabled={isStep2Busy}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              disabled={isStep2Busy}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                required
                id="terms"
                disabled={isStep2Busy}
                className="h-4 w-4"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                I accept the{" "}
                <a
                  href="/term-condition"
                  target="_blank"
                  className="text-[#47c9c4] underline hover:text-[#47c9c4]"
                >
                  Terms & Conditions
                </a>
              </label>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => dispatch(setStep(1))}
                disabled={isStep2Busy}
                className="rounded-2xl border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isStep2Busy || !password || !confirmPassword || !otp}
                className={`inline-flex min-w-[164px] items-center justify-center gap-2 rounded-2xl px-6 py-2 font-medium transition ${
                  isStep2Busy || !password || !confirmPassword || !otp
                    ? "cursor-not-allowed bg-gray-300 text-gray-500"
                    : "bg-orange-400 text-white hover:bg-orange-500"
                }`}
              >
                {isAccountCreating ? <ButtonSpinner label="Creating account" /> : "Continue"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="flex flex-col items-center text-center py-10">
          <HiCheckCircle className="text-green-500 text-5xl mb-4" />
          <h2 className="text-2xl font-bold mb-2">Account Created Successfully!</h2>
          <p className="text-gray-600 text-sm mb-6">
            Welcome {firstName}! You can now continue with your course enrollment.
          </p>
          <button
             onClick={() => setBookDemoOpen(true)}
            className="bg-orange-400 hover:bg-orange-500 text-white font-medium px-6 py-2 rounded-2xl transition"
          >
            Done
          </button>
        </div>
      )}
       {isBookDemoOpen && (
        <BookDemoModal onClose={() => setBookDemoOpen(false)} />
      )}
    </div>
  );
}
