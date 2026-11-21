"use client";

import Link from "next/link";
import { HiCalendar, HiLocationMarker, HiUser, HiVideoCamera } from "react-icons/hi";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The submit button lives in the sheet's footer and joins the form by id, so
// Enter on any field submits too.
export const DETAILS_FORM_ID = "demo-details-form";

// "098765 43210", "+91 98765-43210" and "9876543210" are all the same number.
export const indianMobileDigits = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
};

export const leadPhone = ({ phone, phoneIntl }) =>
  phoneIntl ? `+${String(phone).replace(/\D/g, "")}` : `+91${indianMobileDigits(phone)}`;

export const validateDetails = ({ name, phone, phoneIntl, email }) => {
  const errors = {};
  if (!String(name || "").trim()) errors.name = "Please enter your name";
  if (phoneIntl) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!String(phone || "").trim().startsWith("+") || digits.length < 8 || digits.length > 15) {
      errors.phone = "Please enter your number with the country code, like +44 7700 900123";
    }
  } else if (!/^[6-9]\d{9}$/.test(indianMobileDigits(phone))) {
    errors.phone = "Please enter your 10-digit mobile number";
  }
  if (!EMAIL.test(String(email || "").trim())) errors.email = "Please enter an email like name@example.com";
  return errors;
};

// Keep the field clear of the phone keyboard once it has opened.
const keepInView = (event) => {
  const field = event.currentTarget;
  setTimeout(() => field.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
};

const inputClass = (hasError) =>
  `block min-h-12 w-full rounded-2xl border-2 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-100 ${
    hasError ? "border-rose-400" : "border-slate-200"
  }`;

const FieldError = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-rose-700">
      {message}
    </p>
  ) : null;

export default function StepDetails({
  summary,
  onChangeSlot,
  values,
  onChange,
  errors,
  touched,
  onBlur,
  onSubmit,
  loginHref,
  submitError,
}) {
  const shown = (field) => (touched[field] ? errors[field] : "");
  const PlaceIcon = summary.isOffline ? HiLocationMarker : HiVideoCamera;

  return (
    <form
      id={DETAILS_FORM_ID}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      <div className="rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-100">
        <div className="flex items-start justify-between gap-3">
          <ul className="min-w-0 space-y-1.5 text-[15px] text-slate-900">
            <li className="flex items-center gap-2 font-semibold">
              <HiCalendar aria-hidden="true" className="shrink-0 text-[#CC3700]" />
              {summary.when}
            </li>
            <li className="flex items-center gap-2">
              <HiUser aria-hidden="true" className="shrink-0 text-[#CC3700]" />
              <span className="truncate">with {summary.teacher}</span>
            </li>
            <li className="flex items-center gap-2">
              <PlaceIcon aria-hidden="true" className="shrink-0 text-[#CC3700]" />
              <span className="truncate">{summary.place}</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={onChangeSlot}
            className="min-h-12 shrink-0 rounded-xl px-3 text-[15px] font-semibold text-[#B83100] underline underline-offset-4"
          >
            Change
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="demo-name" className="mb-1.5 block text-[15px] font-semibold text-slate-900">
          Your name
        </label>
        <input
          id="demo-name"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          value={values.name}
          onChange={(event) => onChange({ name: event.target.value })}
          onBlur={() => onBlur("name")}
          onFocus={keepInView}
          aria-invalid={Boolean(shown("name"))}
          aria-describedby={shown("name") ? "demo-name-error" : undefined}
          className={inputClass(shown("name"))}
        />
        <FieldError id="demo-name-error" message={shown("name")} />
      </div>

      <div>
        <label htmlFor="demo-phone" className="mb-1.5 block text-[15px] font-semibold text-slate-900">
          Mobile number
        </label>
        {values.phoneIntl ? (
          <input
            id="demo-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="next"
            placeholder="+44 7700 900123"
            value={values.phone}
            onChange={(event) => onChange({ phone: event.target.value.replace(/[^\d+\s-]/g, "") })}
            onBlur={() => onBlur("phone")}
            onFocus={keepInView}
            aria-invalid={Boolean(shown("phone"))}
            aria-describedby={shown("phone") ? "demo-phone-error" : undefined}
            className={inputClass(shown("phone"))}
          />
        ) : (
          <div className="flex gap-2">
            <span className="flex min-h-12 shrink-0 items-center rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 text-base font-semibold text-slate-700">
              +91
            </span>
            <input
              id="demo-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              enterKeyHint="next"
              placeholder="98765 43210"
              value={values.phone}
              onChange={(event) => onChange({ phone: event.target.value.replace(/[^\d\s-]/g, "") })}
              onBlur={() => onBlur("phone")}
              onFocus={keepInView}
              aria-invalid={Boolean(shown("phone"))}
              aria-describedby={shown("phone") ? "demo-phone-error" : undefined}
              className={inputClass(shown("phone"))}
            />
          </div>
        )}
        <FieldError id="demo-phone-error" message={shown("phone")} />
        <button
          type="button"
          onClick={() => onChange({ phoneIntl: !values.phoneIntl, phone: "" })}
          className="mt-1 min-h-12 text-sm font-semibold text-slate-700 underline underline-offset-4"
        >
          {values.phoneIntl ? "Use an Indian number" : "Outside India?"}
        </button>
      </div>

      <div>
        <label htmlFor="demo-email" className="mb-1.5 block text-[15px] font-semibold text-slate-900">
          Email
        </label>
        <input
          id="demo-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          enterKeyHint="send"
          value={values.email}
          onChange={(event) => onChange({ email: event.target.value })}
          onBlur={() => onBlur("email")}
          onFocus={keepInView}
          aria-invalid={Boolean(shown("email"))}
          aria-describedby={shown("email") ? "demo-email-error" : "demo-email-hint"}
          className={inputClass(shown("email"))}
        />
        {shown("email") ? (
          <FieldError id="demo-email-error" message={shown("email")} />
        ) : (
          <p id="demo-email-hint" className="mt-1.5 text-sm text-slate-600">
            We&apos;ll send your class details here
          </p>
        )}
      </div>

      {submitError ? (
        <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-[15px] font-medium text-rose-800 ring-1 ring-rose-200">
          {submitError}
        </p>
      ) : null}

      <p className="text-[15px] text-slate-700">
        Have an account?{" "}
        <Link href={loginHref} className="inline-flex min-h-12 min-w-12 items-center font-semibold text-[#B83100] underline underline-offset-4">
          Log in
        </Link>
      </p>

    </form>
  );
}
