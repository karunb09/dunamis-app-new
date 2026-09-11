import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { FiAward, FiDownload, FiExternalLink, FiFileText, FiInbox, FiSend } from "react-icons/fi";
import PageTabBar from "../../components/PageTabBar";
import SlideOver from "../../components/SlideOver";
import {
  useIssueCertificate,
  useScoreAssessment,
  useSendQuestionnaire,
  useTeacherAssessments,
} from "../../hooks/useAssessments";
import { useQuestionnaires } from "../../hooks/useQuestionnaires";
import { downloadCertificate } from "../../api/assessmentsApi";

const RATINGS = [
  { key: "homework", label: "Homework" },
  { key: "practice", label: "Practice" },
  { key: "speed", label: "Learning speed" },
  { key: "performance", label: "Performance" },
];

const fullName = (name) =>
  [name?.firstName, name?.lastName].filter(Boolean).join(" ") || "Learner";

const formatDate = (value) => (value ? dayjs(value).format("D MMM YYYY") : "—");

const EmptyState = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-slate-400">
    <FiInbox className="text-2xl" />
    <p className="text-sm">{text}</p>
  </div>
);

const StatusPill = ({ status }) => {
  const tone = {
    Pending: "bg-sky-50 text-sky-700 ring-sky-200",
    Overdue: "bg-rose-50 text-rose-700 ring-rose-200",
    Sent: "bg-amber-50 text-amber-700 ring-amber-200",
    Submitted: "bg-orange-50 text-orange-700 ring-orange-200",
    Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  }[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tone || ""}`}>
      {status}
    </span>
  );
};

const Assessment = () => {
  const [tab, setTab] = useState("to-send");
  const [selectedIds, setSelectedIds] = useState([]);
  const [questionnaireId, setQuestionnaireId] = useState("");
  const [scoring, setScoring] = useState({ open: false, row: null });
  const [downloadingId, setDownloadingId] = useState(null);

  const { data, isLoading, isError, error } = useTeacherAssessments();
  const { data: libraryData } = useQuestionnaires({ status: "published" });
  const sendQuestionnaire = useSendQuestionnaire();
  const issueCertificate = useIssueCertificate();

  const grouped = data?.data || {};
  const toSend = [...(grouped.overdue || []), ...(grouped.pending || [])];
  const rowsByTab = {
    "to-send": toSend,
    sent: grouped.sent || [],
    submitted: grouped.submitted || [],
    completed: grouped.completed || [],
  };
  const rows = rowsByTab[tab] || [];
  const published = libraryData?.questionnaires || [];

  const tabs = [
    { id: "to-send", label: `To send (${toSend.length})` },
    { id: "sent", label: `Awaiting learner (${rowsByTab.sent.length})` },
    { id: "submitted", label: `Ready to score (${rowsByTab.submitted.length})` },
    { id: "completed", label: `Completed (${rowsByTab.completed.length})` },
  ];

  const toggle = (id) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const allSelected = toSend.length > 0 && toSend.every((row) => selectedIds.includes(row._id));

  const runSend = async () => {
    if (!questionnaireId) return toast.error("Pick a published questionnaire first.");
    if (!selectedIds.length) return toast.error("Pick at least one learner.");

    const questionnaire = published.find((q) => q._id === questionnaireId);
    const { isConfirmed } = await Swal.fire({
      title: `Send "${questionnaire?.title}"?`,
      text: `${selectedIds.length} learner${selectedIds.length === 1 ? "" : "s"} will be asked to answer it and add a video link.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Send",
      confirmButtonColor: "#FF6B35",
    });
    if (!isConfirmed) return;

    try {
      const result = await sendQuestionnaire.mutateAsync({
        questionnaireId,
        assessmentIds: selectedIds,
      });
      toast.success(result.message);
      setSelectedIds([]);
      setTab("sent");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const runIssue = async (row) => {
    const { isConfirmed } = await Swal.fire({
      title: `Award a certificate to ${fullName(row.studentName)}?`,
      text: `For completing ${row.courseTitle}. It carries the school's name and a unique number, and cannot be withdrawn from here.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Issue certificate",
      confirmButtonColor: "#FF6B35",
    });
    if (!isConfirmed) return;

    try {
      const result = await issueCertificate.mutateAsync(row._id);
      toast.success(`Certificate ${result.certificate.certificateNumber} issued`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const runDownload = async (row) => {
    setDownloadingId(row.certificateId);
    try {
      const blob = await downloadCertificate(row.certificateId);
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `certificate-${fullName(row.studentName).replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Assessments</p>
          <h1 className="text-2xl font-bold text-slate-900">Six-month assessments</h1>
          <p className="text-sm text-slate-500">
            Send a questionnaire, read what your learners send back, score it, and award the level certificate.
          </p>
        </div>
        <Link
          to="/teacher/questionnaires"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
        >
          <FiFileText />
          Questionnaires
        </Link>
      </div>

      <PageTabBar tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === "to-send" && toSend.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelectedIds(allSelected ? [] : toSend.map((row) => row._id))}
              className="h-4 w-4 accent-orange-500"
            />
            Select all
          </label>
          <select
            value={questionnaireId}
            onChange={(e) => setQuestionnaireId(e.target.value)}
            className="min-w-[220px] flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          >
            <option value="">
              {published.length ? "Choose a published questionnaire" : "No published questionnaires yet"}
            </option>
            {published.map((q) => (
              <option key={q._id} value={q._id}>
                {q.title} · {q.questions.length} question{q.questions.length === 1 ? "" : "s"}
              </option>
            ))}
          </select>
          {published.length === 0 && (
            <Link
              to="/teacher/questionnaires"
              className="text-sm font-semibold text-orange-600 hover:text-orange-700"
            >
              Create one →
            </Link>
          )}
          <button
            type="button"
            onClick={runSend}
            disabled={sendQuestionnaire.isPending || !selectedIds.length || !questionnaireId}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
          >
            <FiSend />
            {sendQuestionnaire.isPending
              ? "Sending..."
              : `Send to ${selectedIds.length || ""} learner${selectedIds.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error?.message}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          text={
            {
              "to-send": "Nothing here yet — assessments appear when a learner reaches six months.",
              sent: "Nothing here yet — nobody is working on a questionnaire.",
              submitted: "Nothing here yet — no answers waiting to be scored.",
              completed: "Nothing here yet — no assessments scored.",
            }[tab]
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((row) => (
            <div key={row._id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-3">
                {tab === "to-send" && (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row._id)}
                    onChange={() => toggle(row._id)}
                    className="mt-1 h-4 w-4 accent-orange-500"
                    aria-label={`Select ${fullName(row.studentName)}`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{fullName(row.studentName)}</p>
                    <StatusPill status={row.status} />
                  </div>
                  <p className="text-sm text-slate-500">{row.courseTitle}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Due {formatDate(row.dueDate)}
                    {row.sentAt ? ` · sent ${formatDate(row.sentAt)}` : ""}
                    {row.questionnaire?.title ? ` · ${row.questionnaire.title}` : ""}
                  </p>
                </div>
              </div>

              {tab === "completed" && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {[
                    ["Homework", row.homework],
                    ["Practice", row.practice],
                    ["Speed", row.learningSpeed],
                    ["Performance", row.performanceSkills],
                    ["Total", row.totalScore != null ? `${row.totalScore}/20` : null],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="text-sm font-semibold text-slate-800">{value ?? "—"}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {(tab === "sent" || tab === "submitted") && (
                  <button
                    type="button"
                    onClick={() => setScoring({ open: true, row })}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      tab === "submitted"
                        ? "bg-[#FF6B35] text-white hover:bg-[#fd5a1f]"
                        : "border border-slate-200 text-slate-600 hover:border-orange-200 hover:text-orange-600"
                    }`}
                  >
                    {tab === "submitted" ? "Read & score" : "Score without a response"}
                  </button>
                )}
                {tab === "completed" && !row.certificateId && (
                  <button
                    type="button"
                    onClick={() => runIssue(row)}
                    disabled={issueCertificate.isPending}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
                  >
                    <FiAward />
                    Issue certificate
                  </button>
                )}
                {tab === "completed" && row.certificateId && (
                  <button
                    type="button"
                    onClick={() => runDownload(row)}
                    disabled={downloadingId === row.certificateId}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <FiDownload />
                    {downloadingId === row.certificateId ? "Preparing..." : "Certificate issued"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SlideOver open={scoring.open} onClose={() => setScoring((prev) => ({ ...prev, open: false }))}>
        {scoring.row ? (
          <ScorePanel
            key={scoring.row._id}
            row={scoring.row}
            onDone={() => {
              setScoring((prev) => ({ ...prev, open: false }));
              setTab("completed");
            }}
          />
        ) : null}
      </SlideOver>
    </div>
  );
};

const ScorePanel = ({ row, onDone }) => {
  const [ratings, setRatings] = useState({ homework: "", practice: "", speed: "", performance: "" });
  const [feedback, setFeedback] = useState("");
  const scoreAssessment = useScoreAssessment();

  const complete = RATINGS.every(({ key }) => ratings[key] !== "");
  const total = useMemo(
    () => RATINGS.reduce((sum, { key }) => sum + (Number(ratings[key]) || 0), 0),
    [ratings]
  );

  const submit = async () => {
    try {
      await scoreAssessment.mutateAsync({
        id: row._id,
        homework: Number(ratings.homework),
        practice: Number(ratings.practice),
        speed: Number(ratings.speed),
        performance: Number(ratings.performance),
        trainerFeedback: feedback.trim(),
      });
      toast.success("Assessment scored");
      onDone();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submission = row.submission;

  return (
    <div className="space-y-5 px-6 pb-6 pt-16">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">{row.courseTitle}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">{fullName(row.studentName)}</h2>
        <p className="text-sm text-slate-500">
          {submission ? `Answered ${formatDate(submission.submittedAt)}` : "No response from the learner yet"}
        </p>
      </div>

      {submission?.videoUrl ? (
        <a
          href={submission.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
        >
          <span className="truncate">Watch the learner's video</span>
          <FiExternalLink className="shrink-0" />
        </a>
      ) : null}

      {submission?.answers?.length ? (
        <div className="space-y-3">
          {submission.answers.map((answer, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">
                {index + 1}. {answer.prompt}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-800">
                {answer.type === "checkbox"
                  ? answer.selected?.length
                    ? answer.selected.join(", ")
                    : "Nothing ticked"
                  : answer.text || "Left blank"}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Your assessment</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {RATINGS.map(({ key, label }) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs text-slate-500">{label} (0–5)</span>
              <select
                value={ratings[key]}
                onChange={(e) => setRatings((r) => ({ ...r, [key]: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="">—</option>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <textarea
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback for the learner (optional)"
          className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Total <span className="font-semibold text-slate-900">{complete ? `${total}/20` : "—"}</span>
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={!complete || scoreAssessment.isPending}
            className="rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
          >
            {scoreAssessment.isPending ? "Saving..." : "Save score"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Assessment;
