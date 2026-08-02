'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';
import { HiX, HiCheckCircle } from 'react-icons/hi';
import { API_BASE } from '@/lib/apiBase';

const PREFERRED_TIME_OPTIONS = [
  { value: '', label: 'Select a preferred time' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'anytime', label: 'Anytime' },
];

const INITIAL_FORM = { name: '', phone: '', preferredTime: '' };

const toId = (value) => {
  if (!value && value !== 0) return '';
  if (typeof value === 'object') return String(value._id || value.id || '');
  return String(value);
};

export default function CallbackRequestModal({ isOpen, onClose, course }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [phase, setPhase] = useState('editing');
  const [error, setError] = useState('');

  const courseId = toId(course?._id || course?.id);
  const courseTitle = course?.name || course?.title || '';

  useEffect(() => {
    if (!isOpen) return;
    setForm(INITIAL_FORM);
    setPhase('editing');
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit = form.name.trim() && form.phone.trim() && phase !== 'submitting';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setPhase('submitting');
    setError('');

    try {
      await axios.post(`${API_BASE}/v1/callback-request/create`, {
        courseId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        preferredTime: form.preferredTime,
      });
      setPhase('confirmed');
    } catch (remoteError) {
      setPhase('editing');
      setError(
        remoteError?.response?.data?.message ||
          remoteError?.message ||
          'Failed to submit callback request.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close"
        >
          <HiX className="text-xl" />
        </button>

        {phase === 'confirmed' ? (
          <div className="py-6 text-center">
            <HiCheckCircle className="mx-auto text-5xl text-emerald-500" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">Request received!</h2>
            <p className="mt-1 text-sm text-gray-500">
              Our team will call you back{form.preferredTime ? ` in the ${form.preferredTime}` : ''} shortly.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-2xl bg-[#CC3700] py-3 text-sm font-bold text-white transition hover:bg-[#B83100]"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <p className="pr-8 text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">
              Request a callback
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">We&apos;ll call you back</h2>
            {courseTitle ? (
              <p className="mt-1 text-sm text-gray-500">About: {courseTitle}</p>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Phone number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value.replace(/[^\d+]/g, '') }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  placeholder="+91 93982 46083"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Preferred time</label>
                <select
                  value={form.preferredTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, preferredTime: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                >
                  {PREFERRED_TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-2 w-full rounded-2xl bg-[#CC3700] py-3 text-sm font-bold text-white transition hover:bg-[#B83100] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {phase === 'submitting' ? 'Submitting…' : 'Request Callback'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
