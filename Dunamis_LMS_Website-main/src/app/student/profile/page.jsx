"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { FaEnvelope, FaEye, FaEyeSlash, FaLock, FaPhone, FaTimes, FaUser } from "react-icons/fa";
import Link from "next/link";
import StudentShell from "@/components/student/StudentShell";
import { getWebsiteToken, getWebsiteUser } from "@/lib/authSession";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { updateAuthUser } from "@/store/authSlice";
import { API_BASE } from "@/lib/apiBase";

// Authenticated calls go through the BFF proxy (JWT injected from httpOnly cookie).
const BASE_URL = API_BASE;

const getNameText = (user) => {
  const name = user?.name;
  if (typeof name === "string") return name;
  return `${name?.firstName || user?.firstName || ""} ${name?.lastName || user?.lastName || ""}`.trim();
};

const getInitials = (name = "", email = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return String(email || "U").slice(0, 2).toUpperCase();
};

function ProfileField({ label, value, editing, onChange, type = "text", icon: Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-gray-50 p-4">
      {Icon ? <Icon className="flex-shrink-0 text-gray-500" size={18} /> : null}
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[13px] font-semibold text-[#999]">{label}</p>
        {editing ? (
          <input
            type={type}
            value={value}
            onChange={onChange}
            className="w-full rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <p className="text-sm text-gray-900">{type === "password" ? "••••••••••" : value || "-"}</p>
        )}
      </div>
    </div>
  );
}

function ChangePasswordModal({ open, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.current) return toast.error("Please enter your current password");
    if (form.next.length < 6) return toast.error("New password must be at least 6 characters");
    if (form.next !== form.confirm) return toast.error("Passwords do not match");
    onSubmit(form.current, form.next);
  };

  const PasswordInput = ({ id, label }) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show[id] ? "text" : "password"}
          value={form[id]}
          onChange={(event) => setForm((current) => ({ ...current, [id]: event.target.value }))}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => setShow((current) => ({ ...current, [id]: !current[id] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          disabled={loading}
        >
          {show[id] ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/40 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4">
      <div className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <FaLock className="text-gray-700" size={16} />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}>
            <FaTimes size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <PasswordInput id="current" label="Current Password" />
          <PasswordInput id="next" label="New Password" />
          <PasswordInput id="confirm" label="Confirm New Password" />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="flex-1 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth?.user);
  const authToken = useSelector((state) => state.auth?.token);
  const [tab, setTab] = useState("profile");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [userRecord, setUserRecord] = useState(null);
  const [accessStatus, setAccessStatus] = useState(null);
  const [fields, setFields] = useState({ fullName: "", email: "", mobile: "", image: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const session = useMemo(() => {
    if (typeof window === "undefined") return { user: authUser, token: authToken };
    return { user: authUser || getWebsiteUser(), token: authToken || getWebsiteToken() };
  }, [authToken, authUser]);

  const userId = session.user?._id || session.user?.id || session.user?.userId;

  const loadProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/v1/user/${userId}`, {
        credentials: "include",
        headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
      });
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.message || "Failed to load profile");
      const user = data.user || session.user;
      setUserRecord(user);
      setFields({
        fullName: getNameText(user),
        email: user.email || "",
        mobile: user.mobileNo || user.mobile || "",
        image: user.image || "",
      });
    } catch (err) {
      toast.error(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const loadAccessStatus = async () => {
    if (!session.token) return;

    try {
      const response = await fetch(`${BASE_URL}/v1/enrollment/access-status`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await response.json();
      if (response.ok && data.success !== false) {
        setAccessStatus(data);
      }
    } catch (error) {
      setAccessStatus(null);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId, session.token]);

  useEffect(() => {
    loadAccessStatus();
  }, [session.token]);

  const saveDetails = async () => {
    if (!userId) return toast.error("User ID not found. Please login again.");
    if (!fields.email.includes("@")) return toast.error("Please enter a valid email");

    const [firstName, ...lastParts] = fields.fullName.trim().split(/\s+/);
    const formData = new FormData();
    formData.append("firstName", firstName || "");
    formData.append("lastName", lastParts.join(" "));
    formData.append("email", fields.email);
    formData.append("mobileNo", fields.mobile);
    if (imageFile) formData.append("profileImage", imageFile);

    setSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/v1/user/${userId}`, {
        method: "PUT",
        credentials: "include",
        headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.message || "Failed to update profile");

      const updatedUser = data.user || userRecord;
      dispatch(updateAuthUser(updatedUser));
      setUserRecord(updatedUser);
      setEditing(false);
      setImageFile(null);
      setImagePreview(null);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    setSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/v1/user/change-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.message || "Failed to change password");
      setPasswordOpen(false);
      toast.success(data.message || "Password changed successfully");
    } catch (err) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const initials = getInitials(fields.fullName, fields.email);
  const image = resolveImageUrl(fields.image, "");

  return (
    <StudentShell title="Profile" description="Dashboard-style profile, payment, and certificate tabs moved into the website student area.">
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8">
        <nav className="mb-8 flex items-center gap-8 border-b border-gray-200 pb-4">
          {[
            ["Profile", "profile"],
            ["Payment Details", "payment"],
            ["Certificates", "certificates"],
          ].map(([label, value]) => (
            <button
              key={value}
              className={`pb-3 pt-2 text-sm transition ${tab === value ? "border-b-2 border-gray-900 font-semibold text-gray-900" : "border-b-2 border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => {
                setTab(value);
                setEditing(false);
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
          </div>
        ) : tab === "profile" ? (
          <>
            <div className="mb-8 flex flex-col items-start gap-4">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 shadow-sm">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile preview" className="h-full w-full object-cover object-top" />
                  ) : image ? (
                    <img src={image} alt="Profile" className="h-full w-full object-cover object-top" />
                  ) : (
                    <span className="text-2xl font-bold text-gray-400">{initials}</span>
                  )}
                </div>
                {editing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-900 text-white shadow transition hover:bg-black"
                    aria-label="Change photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.79 2.11a.75.75 0 0 0 .965.965l2.11-.79a2.75 2.75 0 0 0 .892-.597l4.261-4.263a1.75 1.75 0 0 0 0-2.478Z" />
                      <path d="M2.25 8.5a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75ZM2.25 12A.75.75 0 0 1 3 11.25h10a.75.75 0 0 1 0 1.5H3A.75.75 0 0 1 2.25 12Z" />
                    </svg>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }}
              />

              {editing && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {imagePreview ? "Change Photo" : "Upload Photo"}
                  </button>
                  {(imagePreview || image) && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setFields((f) => ({ ...f, image: "" }));
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-red-500 hover:bg-gray-50"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              )}
            </div>

            <h2 className="mb-5 text-base font-semibold text-gray-900">Profile Details</h2>
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              <ProfileField label="Full Name" value={fields.fullName} editing={editing} onChange={(event) => setFields({ ...fields, fullName: event.target.value })} icon={FaUser} />
              <ProfileField label="Email Address" value={fields.email} editing={editing} onChange={(event) => setFields({ ...fields, email: event.target.value })} type="email" icon={FaEnvelope} />
              <ProfileField label="Mobile Number" value={fields.mobile} editing={editing} onChange={(event) => setFields({ ...fields, mobile: event.target.value })} icon={FaPhone} />
              {!editing ? <ProfileField label="Password" value="" editing={false} type="password" icon={FaLock} /> : null}
            </div>

            <div className="flex flex-col justify-end gap-3 sm:flex-row">
              {!editing ? (
                <>
                  <button type="button" onClick={() => setPasswordOpen(true)} className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Change Password
                  </button>
                  <button type="button" onClick={() => setEditing(true)} className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-black">
                    Edit Details
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => { setEditing(false); setImageFile(null); setImagePreview(null); loadProfile(); }} className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" disabled={saving}>
                    Cancel
                  </button>
                  <button type="button" onClick={saveDetails} className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              )}
            </div>
          </>
        ) : tab === "payment" ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
            {accessStatus?.accessRestricted ? (
              <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-5">
                <p className="font-semibold text-red-700">Installment overdue</p>
                <p className="mt-2 text-sm text-red-700">
                  {accessStatus.message || "Please clear your overdue installment to restore course access."}
                </p>
              </div>
            ) : (
              <p className="mt-3 max-w-xl text-sm text-gray-500">
                Your course payment access is active.
              </p>
            )}
            <Link
              href="/student/fees"
              className="mt-5 inline-flex rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              Go to Fees &amp; Payments
            </Link>
            <p className="mt-3 text-xs text-gray-500">
              Dues, receipts and installment history all live on the Fees &amp; Payments page.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Certificates</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
              Certificates remain a dashboard-style placeholder until certificate generation APIs are available.
            </p>
          </div>
        )}
      </main>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} onSubmit={changePassword} loading={saving} />
    </StudentShell>
  );
}
