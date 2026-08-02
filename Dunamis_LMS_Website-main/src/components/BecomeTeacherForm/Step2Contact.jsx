import { City, Country, State } from "country-state-city";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  SelectInput,
  TextInput,
  TextareaInput,
} from "./FormFields";

const DEFAULT_COUNTRY = "IN";
const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";

export default function Step2Contact({ formData, setFormData, errors = {}, emailVerified, onEmailVerified, onEmailChange }) {
  const [selectedCountry, setSelectedCountry] = useState(
    formData.country || DEFAULT_COUNTRY
  );
  const [selectedStateCode, setSelectedStateCode] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);

  const states = useMemo(
    () => State.getStatesOfCountry(selectedCountry),
    [selectedCountry]
  );

  const cities = useMemo(
    () => (selectedStateCode ? City.getCitiesOfState(selectedCountry, selectedStateCode) : []),
    [selectedCountry, selectedStateCode]
  );

  useEffect(() => {
    const matchedState = states.find(
      (state) =>
        state.isoCode === formData.currentState || state.name === formData.currentState
    );

    if (matchedState) {
      setSelectedStateCode(matchedState.isoCode);
    }
  }, [formData.currentState, states]);

  useEffect(() => {
    return () => clearInterval(countdownRef.current);
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());

  const handleSendOtp = async () => {
    if (!isValidEmail) return;
    setSending(true);
    setOtpError("");
    try {
      const res = await fetch(`${API_BASE}/v1/teacherApplication/send-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setOtpSent(true);
      setOtpValue("");
      startCountdown();
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue.trim()) return;
    setVerifying(true);
    setOtpError("");
    try {
      const res = await fetch(`${API_BASE}/v1/teacherApplication/verify-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim(), otp: otpValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid code");
      onEmailVerified();
      clearInterval(countdownRef.current);
      setCountdown(0);
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Email with OTP verification */}
      <div className="md:col-span-2 md:grid md:grid-cols-2 md:gap-5">
        <div>
          <TextInput
            id="teacher-email"
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (otpSent) { setOtpSent(false); setOtpValue(""); setOtpError(""); }
              onEmailChange?.();
            }}
            error={errors.email}
            required
          />

          {/* OTP block */}
          {emailVerified ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <span className="text-base">✓</span> Email verified
            </p>
          ) : (
            <div className="mt-2">
              {!otpSent ? (
                <button
                  type="button"
                  disabled={!isValidEmail || sending}
                  onClick={handleSendOtp}
                  className="rounded-xl bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send Verification Code"}
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-36 rounded-xl border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                    <button
                      type="button"
                      disabled={otpValue.length !== 6 || verifying}
                      onClick={handleVerifyOtp}
                      className="rounded-xl bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      {verifying ? "Verifying…" : "Verify"}
                    </button>
                  </div>
                  {countdown > 0 ? (
                    <p className="text-xs text-gray-500">Resend in {countdown}s</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sending}
                      className="w-fit text-xs text-orange-500 underline hover:text-orange-600 disabled:opacity-50"
                    >
                      {sending ? "Sending…" : "Resend code"}
                    </button>
                  )}
                </div>
              )}
              {otpError && <p role="alert" className="mt-1 text-xs text-red-500">{otpError}</p>}
            </div>
          )}
        </div>

        <TextInput
          id="teacher-mobile"
          label="Mobile Number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="Enter your mobile number"
          value={formData.mobileNo}
          onChange={(e) =>
            setFormData({
              ...formData,
              mobileNo: e.target.value.replace(/\D/g, "").slice(0, 10),
            })
          }
          error={errors.mobileNo}
          required
        />
      </div>

      <SelectInput
        id="teacher-country"
        label="Country"
        autoComplete="country"
        value={selectedCountry}
        onChange={(e) => {
          setSelectedCountry(e.target.value);
          setSelectedStateCode("");
          setFormData({
            ...formData,
            country: e.target.value,
            currentState: "",
            currentCity: "",
          });
        }}
      >
        {Country.getAllCountries().map((country) => (
          <option key={country.isoCode} value={country.isoCode}>
            {country.name}
          </option>
        ))}
      </SelectInput>

      <SelectInput
        id="teacher-state"
        label="State"
        autoComplete="address-level1"
        value={selectedStateCode}
        onChange={(e) => {
          const stateCode = e.target.value;
          const selectedState = states.find((state) => state.isoCode === stateCode);
          setSelectedStateCode(stateCode);
          setFormData({
            ...formData,
            currentState: selectedState?.name || "",
            currentCity: "",
          });
        }}
        error={errors.currentState}
        required
      >
        <option value="">Select state</option>
        {states.map((state) => (
          <option key={state.isoCode} value={state.isoCode}>
            {state.name}
          </option>
        ))}
      </SelectInput>

      <SelectInput
        id="teacher-city"
        label="City"
        autoComplete="address-level2"
        value={formData.currentCity}
        onChange={(e) =>
          setFormData({ ...formData, currentCity: e.target.value })
        }
        error={errors.currentCity}
        required
        disabled={!selectedStateCode}
      >
        <option value="">Select city</option>
        {cities.map((city) => (
          <option key={city.name} value={city.name}>
            {city.name}
          </option>
        ))}
      </SelectInput>

      <TextareaInput
        id="teacher-address"
        label="Current Address"
        placeholder="Enter your full current address"
        autoComplete="street-address"
        rows={4}
        value={formData.currentAddress}
        onChange={(e) =>
          setFormData({ ...formData, currentAddress: e.target.value })
        }
        error={errors.currentAddress}
        required
        className="md:col-span-2"
      />
    </div>
  );
}
