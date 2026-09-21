"use client";

import { useCallback, useEffect, useState } from "react";
import { HiBadgeCheck, HiClipboardCheck, HiExternalLink } from "react-icons/hi";
import StudentShell from "@/components/student/StudentShell";
import { getWebsiteToken } from "@/lib/authSession";
import { API_BASE } from "@/lib/apiBase";

// Authenticated calls go through the BFF proxy (JWT injected from httpOnly cookie).
const BASE_URL = API_BASE;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const authHeaders = () => {
  const token = getWebsiteToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const RATINGS = [
  ["Homework", "homework"],
  ["Practice", "practice"],
  ["Learning speed", "learningSpeed"],
  ["Performance", "performanceSkills"],
];

export default function StudentAssessmentsPage() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/v1/assessment/student`, {
        credentials: "include",
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to load your assessments.");
      }
      setAssessments(Array.isArray(data.data) ? data.data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load your assessments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const actionNeeded = assessments.filter((a) => a.status === "Sent");
  const submitted = assessments.filter((a) => a.status === "Submitted");
  const completed = assessments.filter((a) => a.status === "Completed");
  const upcoming = assessments.filter((a) => ["Pending", "Overdue"].includes(a.status));

  return (
    <StudentShell
      title="Assessments"
      description="Every six months your instructor sends a short questionnaire. Answer it, add a video of your playing or practice, and they will assess your progress to the next level."
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-[2rem] border border-orange-100 bg-white p-10 text-center text-sm text-slate-500">
          Loading your assessments...
        </div>
      ) : assessments.length === 0 ? (
        <div className="rounded-[2rem] border border-orange-100 bg-white p-10 text-center">
          <HiClipboardCheck className="mx-auto h-8 w-8 text-orange-400" />
          <h2 className="mt-3 text-lg font-bold text-slate-950">No assessments yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Your first assessment is scheduled six months into your course. It will appear here when your instructor sends it.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {actionNeeded.length > 0 && (
            <Section title="Needs your answer">
              {actionNeeded.map((a) => (
                <ResponseForm key={a._id} assessment={a} onSubmitted={load} />
              ))}
            </Section>
          )}

          {submitted.length > 0 && (
            <Section title="Sent to your instructor">
              {submitted.map((a) => (
                <ResponseForm key={a._id} assessment={a} onSubmitted={load} revising />
              ))}
            </Section>
          )}

          {upcoming.length > 0 && (
            <Section title="Coming up">
              {upcoming.map((a) => (
                <div key={a._id} className="rounded-[1.5rem] border border-stone-200 bg-white p-5">
                  <p className="font-bold text-slate-950">{a.course}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Due around {formatDate(a.dueDate)} — your instructor will send the questionnaire.
                  </p>
                </div>
              ))}
            </Section>
          )}

          {completed.length > 0 && (
            <Section title="Assessed">
              {completed.map((a) => (
                <div key={a._id} className="rounded-[1.5rem] border border-stone-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-950">{a.course}</p>
                      <p className="text-sm text-slate-500">
                        Assessed {formatDate(a.assessmentDate)}
                        {a.teacherName ? ` by ${a.teacherName}` : ""}
                      </p>
                    </div>
                    {a.certificateId ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <HiBadgeCheck className="h-4 w-4" />
                        Certificate awarded — see your Profile
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {RATINGS.map(([label, key]) => (
                      <div key={key} className="rounded-2xl bg-stone-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
                        <p className="text-sm font-bold text-slate-900">{a[key] ?? "—"}/5</p>
                      </div>
                    ))}
                    <div className="rounded-2xl bg-orange-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-orange-500">Total</p>
                      <p className="text-sm font-bold text-orange-700">{a.totalScore ?? "—"}/20</p>
                    </div>
                  </div>
                  {a.trainerFeedback ? (
                    <p className="mt-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-slate-700">
                      <span className="font-semibold">Instructor feedback: </span>
                      {a.trainerFeedback}
                    </p>
                  ) : null}
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
    </StudentShell>
  );
}

const Section = ({ title, children }) => (
  <section>
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">{title}</h2>
    <div className="space-y-4">{children}</div>
  </section>
);

// Answers are positional against the questionnaire the instructor sent, so the
// form is rebuilt from that snapshot, pre-filled with anything already sent.
const ResponseForm = ({ assessment, onSubmitted, revising = false }) => {
  const questions = assessment.questionnaire?.questions || [];
  const previous = assessment.submission?.answers || [];

  const [videoUrl, setVideoUrl] = useState(assessment.submission?.videoUrl || "");
  const [answers, setAnswers] = useState(
    questions.map((q, index) => ({
      text: previous[index]?.text || "",
      selected: previous[index]?.selected || [],
    }))
  );
  const [open, setOpen] = useState(!revising);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ tone: "", text: "" });

  const setAnswer = (index, patch) =>
    setAnswers((list) => list.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const toggleOption = (index, option) => {
    const current = answers[index]?.selected || [];
    setAnswer(index, {
      selected: current.includes(option) ? current.filter((o) => o !== option) : [...current, option],
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ tone: "", text: "" });
    try {
      const response = await fetch(`${BASE_URL}/v1/assessment/${assessment._id}/submit-response`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ videoUrl: videoUrl.trim(), answers }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Could not send your answers.");
      }
      setMessage({ tone: "ok", text: "Sent to your instructor. You can still change it until they assess it." });
      await onSubmitted();
    } catch (err) {
      setMessage({ tone: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-slate-950">{assessment.questionnaire?.title || "Assessment"}</p>
          <p className="text-sm text-slate-500">
            {assessment.course}
            {assessment.teacherName ? ` · ${assessment.teacherName}` : ""} · due {formatDate(assessment.dueDate)}
          </p>
        </div>
        {revising ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-full border border-orange-200 px-4 py-1.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
          >
            {open ? "Close" : "Review or change"}
          </button>
        ) : null}
      </div>

      {revising && !open ? (
        <p className="mt-3 text-sm text-slate-500">
          Answered {formatDate(assessment.submission?.submittedAt)} — waiting for your instructor to assess it.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {questions.map((q, index) => (
            <fieldset key={index}>
              <legend className="mb-2 text-sm font-semibold text-slate-900">
                {index + 1}. {q.prompt}
                {q.required ? <span className="text-rose-500"> *</span> : null}
              </legend>
              {q.type === "checkbox" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-2 rounded-2xl border border-stone-200 px-3 py-2 text-sm text-slate-700 transition hover:border-orange-200"
                    >
                      <input
                        type="checkbox"
                        checked={(answers[index]?.selected || []).includes(option)}
                        onChange={() => toggleOption(index, option)}
                        className="h-4 w-4 accent-orange-600"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  rows={2}
                  value={answers[index]?.text || ""}
                  onChange={(e) => setAnswer(index, { text: e.target.value })}
                  maxLength={2000}
                  className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              )}
            </fieldset>
          ))}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-900">
              Video link
              <span className="ml-1 font-normal text-slate-500">— YouTube, Drive, or any link your instructor can open</span>
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://"
              className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
            {assessment.submission?.videoUrl ? (
              <a
                href={assessment.submission.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600"
              >
                Open what you sent <HiExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>

          {message.text ? (
            <p className={`text-sm ${message.tone === "error" ? "text-rose-600" : "text-emerald-700"}`}>{message.text}</p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? "Sending..." : revising ? "Send changes" : "Send to instructor"}
          </button>
        </div>
      )}
    </form>
  );
};
