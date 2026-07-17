"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { HiArrowLeft, HiCheckCircle, HiEye, HiEyeOff } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import { sendOtp, createStudent, setStep } from "../store/signupSlice";
import { Country } from "country-state-city";
import * as Select from "@radix-ui/react-select";
import { IoMdArrowDropdown } from "react-icons/io";
import LoginModal from "@/components/PopupModals/LoginModal";
import FloatingInput from "@/components/FloatingInput";
import {
  clearEnrollmentResume,
  readEnrollmentResume,
  saveEnrollmentResume,
} from "@/helpers/enrollmentResume";

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

const STUDENT_TERMS_SECTIONS = [
  {
    title: "1. Musical Instruments",
    items: [
      "You must have a musical instrument to begin classes.",
      "You are required to carry your own instrument to all music classes.",
      "We can assist you in purchasing an instrument, either from our music school or an external store.",
      "If you have not yet purchased an instrument, you may rent one from our music school by following our rental policy.",
    ],
  },
  {
    title: "2. Sessions / Classes",
    items: [
      "Regular courses include 8 sessions per month (2 sessions per week).",
      "Additional sessions beyond the standard 8 per month will be charged on a prorated basis.",
    ],
  },
  {
    title: "3. Schedule & Duration",
    items: [
      "Your class schedule will be decided at the time of joining, based on mutual convenience with your trainer.",
      "You are expected to maintain regular attendance.",
      "Each session will last between 45 to 60 minutes.",
    ],
  },
  {
    title: "4. Class Compensation",
    items: [
      "As classes are conducted twice a week, missed sessions by students will not be compensated, except in cases of documented medical emergencies.",
      "If a trainer misses a session, the class will be compensated within the same month.",
    ],
  },
  {
    title: "5. Examinations",
    items: [
      "Internal assessments will be conducted periodically through video performances and presentations.",
      "Successful learners will receive DSM Level Certificates and be promoted to the next level.",
    ],
  },
  {
    title: "6. Study Material / Syllabus Books",
    items: [
      "You are required to purchase study materials as instructed by your teacher/trainer/administrator in a timely manner.",
    ],
  },
  {
    title: "7. Course Duration & Fees",
    items: [
      "Monthly fees must be paid in advance each month.",
      "Fees once paid are non-refundable.",
      "For Grade Exams from Trinity College London (TCL), an additional exam fee will apply. Please refer to the TCL manual for details.",
    ],
  },
  {
    title: "8. Consent for Use of Content",
    items: [
      "You consent to the school recording, storing, and using your assignment videos or performance recordings for promotional purposes.",
      "These may be posted on the school's website, social media platforms, or other brand marketing channels.",
      "Materials will not be sold to third parties and will be used solely for educational and promotional purposes.",
    ],
  },
];

const StudentTermsModal = ({
  isOpen,
  onClose,
  onAgree,
  hasReadTerms,
  onReadTerms,
}) => {
  const contentRef = useRef(null);

  if (!isOpen) return null;

  const handleScroll = (event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 8) {
      onReadTerms();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/50 px-3 py-4 sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-terms-title"
    >
      <div className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 id="student-terms-title" className="text-xl font-semibold text-gray-900">
              Student Terms & Conditions
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Scroll to the bottom to enable the agree button.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close terms and conditions"
            className="rounded-lg px-2 py-1 text-2xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            &times;
          </button>
        </div>

        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="max-h-[52vh] space-y-5 overflow-y-auto px-5 py-5 text-sm leading-6 text-gray-700 sm:max-h-[58vh]"
        >
          <p className="font-medium text-gray-900">
            By signing up as a student, you agree to the following:
          </p>
          {STUDENT_TERMS_SECTIONS.map((section) => (
            <section key={section.title} className="space-y-2">
              <h4 className="font-semibold text-gray-900">{section.title}</h4>
              <ul className="list-disc space-y-1 pl-5">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            {hasReadTerms
              ? ""
              : "Please read to the bottom before agreeing."}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onAgree}
              disabled={!hasReadTerms}
              className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${
                hasReadTerms
                  ? "bg-gradient-to-r from-[#FF6B35] to-[#fd5a1f] text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30"
                  : "cursor-not-allowed bg-slate-200 text-slate-400"
              }`}
            >
              I Agree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { step, otpSent, otpStatus, createStatus } = useSelector((state) => state.signup);
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [resumeHref, setResumeHref] = useState("/courses");
  const [isTermsOpen, setTermsOpen] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  // Step 1 Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [countryCode, setCountryCode] = useState("+91");

  // Step 2 Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  useEffect(() => {
    const nextFromQuery = searchParams?.get("next");
    const storedResume = readEnrollmentResume();
    const nextHref = nextFromQuery || storedResume?.nextHref || "/courses";
    setResumeHref(nextHref);

    if (nextHref && nextHref !== "/courses") {
      saveEnrollmentResume(nextHref);
    } else {
      clearEnrollmentResume();
    }
  }, [searchParams]);

  // Step 1 continue
  const handleContinueStep1 = (e) => {
    e.preventDefault();

    const first = firstName.trim();
    const last = lastName.trim();

    if (!first || !last || !mobile.trim()) {
      toast.error("Please fill out all fields");
      return;
    }

    const nameRegex = /^[A-Za-z][A-Za-z\s.'-]*$/;
    if (first.length < 3) {
      toast.error("First name must be at least 3 characters");
      return;
    }
    if (!nameRegex.test(first)) {
      toast.error("First name can only contain letters");
      return;
    }
    if (last.length < 3) {
      toast.error("Last name must be at least 3 characters");
      return;
    }
    if (!nameRegex.test(last)) {
      toast.error("Last name can only contain letters");
      return;
    }

    if (countryCode === "+91") {
      if (!/^[6-9]\d{9}$/.test(mobile)) {
        toast.error("Please enter a valid 10-digit mobile number (starting with 6-9)");
        return;
      }
    } else if (mobile.length < 6 || mobile.length > 10) {
      toast.error("Mobile number must be 6 to 10 digits");
      return;
    }

    dispatch(setStep(2));
  };

  // Step 2 continue
  const handleContinueStep2 = (e) => {
    e.preventDefault();

    if (isStep2Busy) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password || !confirmPassword) {
      toast.error("Please fill out all fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      toast.error("Password must contain at least one letter and one number");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    if (!hasAcceptedTerms) {
      toast.error("Please read and agree to the Terms & Conditions");
      return;
    }

    const payload = {
      name: { firstName: firstName.trim(), lastName: lastName.trim() },
      mobileNo: countryCode + mobile,
      email: normalizedEmail,
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

  useEffect(() => {
    if (step !== 3 || createStatus !== "succeeded") return;
    if (resumeHref && resumeHref !== "/courses") {
      setLoginOpen(true);
    }
  }, [step, createStatus, resumeHref]);

  // OTP Functions
  const handleSendOtp = () => {
    if (isStep2Busy) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Please enter your email first");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    dispatch(sendOtp(normalizedEmail))
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
    <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col justify-center bg-white px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-14">
      {/* Back Button */}
      <div
        onClick={
          isStep2Busy
            ? undefined
            : step === 1
              ? () => router.back()
              : () => dispatch(setStep(step - 1))
        }
        className={`mb-8 inline-flex w-fit items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${
          isStep2Busy
            ? "cursor-not-allowed border-slate-100 text-slate-300"
            : "cursor-pointer border-slate-200 text-slate-500 hover:border-orange-200 hover:bg-orange-50/50 hover:text-slate-800"
        }`}
      >
        <HiArrowLeft />
        <span>Back</span>
      </div>

      {/* Step Progress */}
      <div className="mx-auto mb-10 flex items-center justify-center gap-2">
        {[
          { n: 1, label: "Profile" },
          { n: 2, label: "Account" },
          { n: 3, label: "Done" },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
                  step > n
                    ? "bg-gradient-to-br from-[#FF6B35] to-[#fd5a1f] text-white shadow-lg shadow-orange-500/25"
                    : step === n
                      ? "bg-gradient-to-br from-[#FF6B35] to-[#fd5a1f] text-white shadow-lg shadow-orange-500/25 ring-4 ring-orange-100"
                      : "bg-orange-50 text-orange-300"
                }`}
              >
                {step > n ? "✓" : n}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  step >= n ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < 2 && (
              <div
                className={`mb-5 h-[3px] w-8 rounded-full sm:w-12 ${
                  step >= n + 1 ? "bg-gradient-to-r from-[#FF6B35] to-[#fd5a1f]" : "bg-orange-100"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <form
          className="mx-auto w-full space-y-5 md:w-[85%]"
          onSubmit={handleContinueStep1}
        >
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
              Create your account
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Personal Information
            </h2>
            <p className="mt-2 mb-8 text-sm text-slate-500">
              Let's start with your basic details
            </p>
          </div>

          <FloatingInput
            id="signup-first-name"
            label="First name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            maxLength={30}
          />

          <FloatingInput
            id="signup-last-name"
            label="Last name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            maxLength={30}
          />

          <div className="flex w-full items-center gap-2">
            {/* Country Code Select */}
            <div className="relative w-1/4">
              <Select.Root
                value={countryCode}
                onValueChange={(val) => setCountryCode(val.split("-")[0])}
              >
                <Select.Trigger
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-[17px] text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  aria-label="Country Code"
                >
                    <span className="truncate">{countryCode}</span>
                    <IoMdArrowDropdown className="ml-1 flex-shrink-0 text-slate-400" />
                  </Select.Trigger>

                  <Select.Portal>
                    <Select.Content
                      className="z-50 mb-1 max-h-48 overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-xl"
                      position="popper"
                      side="bottom"
                      align="center"
                    >
                      <Select.Viewport className="p-1.5">
                        {Country.getAllCountries().map((country) => (
                          <Select.Item
                            key={country.isoCode}
                            value={`+${country.phonecode}-${country.isoCode}`}
                            className="flex cursor-pointer select-none items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-orange-50"
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
            <FloatingInput
              id="signup-mobile"
              label="Mobile number"
              type="tel"
              className="w-3/4"
              value={mobile}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setMobile(value);
              }}
              required
              maxLength={10}
              inputMode="numeric"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#fd5a1f] py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:shadow-xl hover:shadow-orange-500/35 hover:brightness-105"
            >
              Continue
            </button>
          </div>
        </form>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="relative mx-auto w-full md:w-[85%]">
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
            className={`space-y-5 ${isStep2Busy ? "pointer-events-none select-none" : ""}`}
            onSubmit={handleContinueStep2}
            aria-busy={isStep2Busy}
          >
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                Almost there
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Account Creation</h2>
              <p className="mt-2 mb-8 text-sm text-slate-500">
                Set up your login credentials
              </p>
            </div>

            <FloatingInput
              id="signup-email"
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isStep2Busy}
            />

            <div className="flex items-center gap-2">
              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isStep2Busy}
                  className="inline-flex min-w-[144px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#fd5a1f] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition hover:shadow-lg hover:shadow-orange-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isOtpLoading ? <ButtonSpinner label="Sending OTP" /> : "Send OTP"}
                </button>
              ) : countdown > 0 ? (
                <p className="text-sm text-slate-500">
                  Resend OTP in <span className="font-semibold text-orange-500">{countdown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isStep2Busy}
                  className="inline-flex min-w-[144px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#fd5a1f] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition hover:shadow-lg hover:shadow-orange-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isOtpLoading ? <ButtonSpinner label="Sending OTP" /> : "Resend OTP"}
                </button>
              )}
            </div>

            {otpSent && (
              <FloatingInput
                id="signup-otp"
                label="Verification code (OTP)"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                disabled={isStep2Busy}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                inputClassName="tracking-[0.3em]"
              />
            )}

            <div className="space-y-1.5">
              <FloatingInput
                id="signup-password"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={isStep2Busy}
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
              <p className="text-[11px] text-slate-400">
                At least 6 characters, with a letter and a number
              </p>
            </div>

            <FloatingInput
              id="signup-confirm-password"
              label="Confirm password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                toast.error("Please type your password to confirm it");
              }}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              required
              minLength={6}
              disabled={isStep2Busy}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-4 z-10 flex items-center text-slate-400 transition hover:text-slate-600"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                </button>
              }
            />

            <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <input
                type="checkbox"
                id="terms"
                checked={hasAcceptedTerms}
                onChange={() => {
                  if (!isStep2Busy) setTermsOpen(true);
                }}
                disabled={isStep2Busy}
                className="h-4 w-4 cursor-pointer accent-orange-500"
              />
              <div className="text-sm text-slate-600">
                <span>I accept the </span>
                <button
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  disabled={isStep2Busy}
                  className="font-medium text-[#47c9c4] underline underline-offset-2 hover:text-teal-600"
                >
                  Terms & Conditions
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => dispatch(setStep(1))}
                disabled={isStep2Busy}
                className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 sm:w-auto"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={
                  isStep2Busy ||
                  !password ||
                  !confirmPassword ||
                  !otp ||
                  !hasAcceptedTerms
                }
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-semibold transition sm:w-auto sm:min-w-[164px] ${
                  isStep2Busy ||
                  !password ||
                  !confirmPassword ||
                  !otp ||
                  !hasAcceptedTerms
                    ? "cursor-not-allowed bg-slate-200 text-slate-400"
                    : "bg-gradient-to-r from-[#FF6B35] to-[#fd5a1f] text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/35 hover:brightness-105"
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
        <div className="flex flex-col items-center py-10 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
            <HiCheckCircle className="text-5xl text-emerald-500" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Account Created Successfully!
          </h2>
          <p className="mb-8 max-w-sm text-sm leading-6 text-slate-500">
            Welcome {firstName}! You can now sign in and continue your course enrollment.
          </p>
          <button
            onClick={() => {
              if (resumeHref && resumeHref !== "/courses") {
                setLoginOpen(true);
                return;
              }
              router.push("/courses");
            }}
            className="rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#fd5a1f] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:shadow-xl hover:shadow-orange-500/35 hover:brightness-105"
          >
            {resumeHref && resumeHref !== "/courses" ? "Continue to sign in" : "Done"}
          </button>
        </div>
      )}

      {isLoginOpen && (
        <LoginModal
          open={isLoginOpen}
          onClose={() => setLoginOpen(false)}
          nextHref={resumeHref}
          onSuccess={() => {
            clearEnrollmentResume();
            if (resumeHref && resumeHref !== "/courses") {
              router.replace(resumeHref);
            }
          }}
        />
      )}

      <StudentTermsModal
        isOpen={isTermsOpen}
        onClose={() => setTermsOpen(false)}
        hasReadTerms={hasReadTerms}
        onReadTerms={() => setHasReadTerms(true)}
        onAgree={() => {
          setHasAcceptedTerms(true);
          setTermsOpen(false);
        }}
      />
    </div>
  );
}
