import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";
import { FiInbox, FiSearch, FiThumbsDown, FiThumbsUp, FiMessageSquare } from "react-icons/fi";
import PageTabBar from "../../components/PageTabBar";
import Pagination from "../../components/Pagination";
import SlideOver from "../../components/SlideOver";
import SavingOverlay from "../../components/SavingOverlay";
import AnimatedNumber from "../../components/AnimatedNumber";
import {
  useChatbotConversation,
  useChatbotGroups,
  useChatbotSummary,
  useResolveChatbotGroup,
} from "../../hooks/useChatbotInsights";
import { createSiteContent, fetchSiteContent } from "../../redux/SiteContent/SiteContentSlice";

const RANGES = [7, 30, 90];

const TABS = [
  { id: "unanswered", label: "Needs an answer" },
  { id: "thumbsDown", label: "Thumbs down" },
  { id: "resolved", label: "Resolved" },
];

const INTENT_LABELS = {
  greeting: "Greeting",
  thanks: "Thanks",
  goodbye: "Goodbye",
  menu: "Show the menu",
  "courses.list": "List all courses",
  "courses.byCategory": "Courses in a category",
  "course.info": "About a course",
  "course.fees": "Course fees",
  "course.modes": "Online or offline",
  "course.languages": "Teaching languages",
  "branches.list": "Centre locations",
  "branches.inCity": "Centres in a city",
  "branch.timings": "Centre timings & address",
  "instructors.forCourse": "Instructors for a course",
  "instructor.info": "About an instructor",
  "instructors.byLanguage": "Instructors by language",
  "instructors.atBranch": "Instructors at a centre",
  "demo.book": "Book a free demo",
  "enroll.how": "How to enrol",
  "contact.human": "Contact the team",
  "chat.end": "Ended the chat",
};

const REASON_LABELS = {
  wrong: "Wrong answer",
  notUnderstood: "Didn't understand",
  missingInfo: "Needed more details",
  other: "Other",
};

const MODES = [
  { id: "faq", label: "Answer as FAQ" },
  { id: "teach", label: "Teach existing answer" },
  { id: "ignore", label: "Ignore" },
];

const whenLabel = (value) => (value ? dayjs(value).format("D MMM, h:mm A") : "");

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

const Pill = ({ className, children }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${className}`}>
    {children}
  </span>
);

const AudiencePill = ({ audience }) =>
  audience === "student" ? (
    <Pill className="bg-violet-50 text-violet-700 ring-violet-200">Student</Pill>
  ) : (
    <Pill className="bg-slate-50 text-slate-600 ring-slate-200">Guest</Pill>
  );

const EmptyBox = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-slate-400">
    <FiInbox className="text-2xl" />
    <p className="text-sm">{text}</p>
  </div>
);

const Tile = ({ label, value, format, hint, index }) => (
  <div
    className="rounded-2xl border border-slate-200 bg-white p-5 motion-safe:animate-fade-in-up"
    style={{ animationDelay: `${index * 40}ms` }}
  >
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
      {value == null ? "—" : <AnimatedNumber value={value} format={format} />}
    </p>
    {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
  </div>
);

function intentLabel(intent, faqs) {
  if (!intent) return "No answer";
  if (intent.startsWith("faq.")) {
    const faq = faqs.find((item) => item._id === intent.slice(4));
    return faq ? `FAQ: ${faq.title}` : "An FAQ";
  }
  return INTENT_LABELS[intent] || intent;
}

function Transcript({ conversationId, highlight }) {
  const { data, isLoading, isError } = useChatbotConversation(conversationId);
  if (isLoading) return <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />;
  if (isError || !data) return <p className="text-xs text-slate-400">Conversation no longer available.</p>;
  return (
    <div className="space-y-2.5">
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        <AudiencePill audience={data.conversation.audience} />
        Started on {data.conversation.startPath || "/"} · {whenLabel(data.conversation.createdAt)}
        {data.conversation.outcome ? ` · ended with a ${data.conversation.outcome} request` : ""}
      </p>
      {data.turns.map((turn) => (
        <div key={turn._id} className="space-y-1.5">
          <div className="flex justify-end">
            <p
              className={`max-w-[85%] rounded-2xl rounded-tr-md px-3 py-2 text-sm ${
                turn.text === highlight ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-900"
              }`}
            >
              {turn.text}
              {turn.source === "button" && <span className="ml-1.5 text-[10px] uppercase opacity-70">button</span>}
            </p>
          </div>
          <div className="max-w-[90%] whitespace-pre-line rounded-2xl rounded-tl-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {turn.reply?.text || "—"}
            {turn.feedback?.rating && (
              <span
                className={`ml-2 inline-flex align-middle ${
                  turn.feedback.rating === "up" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {turn.feedback.rating === "up" ? <FiThumbsUp size={12} /> : <FiThumbsDown size={12} />}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ChatbotInsightsPage() {
  const dispatch = useDispatch();
  const faqs = useSelector((state) => state.siteContent.items).filter((item) => item.type === "faq");

  const [days, setDays] = useState(30);
  const [kind, setKind] = useState("unanswered");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [slideOver, setSlideOver] = useState({ open: false, row: null });
  const [mode, setMode] = useState("faq");
  const [faqForm, setFaqForm] = useState({ title: "", body: "", category: "" });
  const [teachIntent, setTeachIntent] = useState("");
  const [note, setNote] = useState("");
  const [creatingFaq, setCreatingFaq] = useState(false);

  useEffect(() => {
    dispatch(fetchSiteContent("faq"));
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const summary = useChatbotSummary(days);
  const groupParams = useMemo(() => ({ kind, days, q: query || undefined, page, limit: 20 }), [kind, days, query, page]);
  const groups = useChatbotGroups(groupParams);
  const resolve = useResolveChatbotGroup();

  const teachOptions = useMemo(
    () => [
      ...(summary.data?.teachableIntents || []).map((intent) => ({
        value: intent,
        label: INTENT_LABELS[intent] || intent,
      })),
      ...faqs.map((faq) => ({ value: `faq:${faq._id}`, label: `FAQ: ${faq.title}` })),
    ],
    [summary.data, faqs]
  );

  const openRow = (row) => {
    setSlideOver({ open: true, row });
    setMode("faq");
    setFaqForm({ title: row.text, body: "", category: "" });
    setTeachIntent("");
    setNote("");
  };
  const closeSlideOver = useCallback(() => setSlideOver((prev) => ({ ...prev, open: false })), []);

  const row = slideOver.row;
  const isOpenItem = row && kind !== "resolved";

  const runResolve = async (payload, successMessage) => {
    try {
      await resolve.mutateAsync({ normalizedText: row.normalizedText, kind, ...payload });
      toast.success(successMessage);
      closeSlideOver();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (mode === "ignore") {
      await runResolve({ status: "ignored", note }, "Question ignored.");
      return;
    }
    if (mode === "teach") {
      if (!teachIntent) return;
      const payload = teachIntent.startsWith("faq:")
        ? { faqId: teachIntent.slice(4) }
        : { teachIntent };
      await runResolve({ status: "resolved", note, ...payload }, "Taught — the bot answers this now.");
      return;
    }
    if (!faqForm.title.trim() || !faqForm.body.trim()) return;
    setCreatingFaq(true);
    try {
      const faq = await dispatch(
        createSiteContent({
          type: "faq",
          title: faqForm.title.trim(),
          body: faqForm.body.trim(),
          category: faqForm.category.trim(),
          status: "published",
        })
      ).unwrap();
      await runResolve({ status: "resolved", faqId: faq._id, note }, "FAQ published — the bot answers this now.");
    } catch (err) {
      toast.error(typeof err === "string" ? err : err.message);
    } finally {
      setCreatingFaq(false);
    }
  };

  const saving = resolve.isPending || creatingFaq;
  const stats = summary.data;
  const leads = stats ? stats.leads.demo + stats.leads.callback : null;
  const rows = groups.data?.rows || [];

  return (
    <div className="space-y-6">
      <SavingOverlay show={saving} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Website chatbot</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Chatbot insights</h1>
          <p className="mt-1 text-sm text-slate-500">
            What visitors ask the assistant, where it falls short, and how to teach it better answers.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => {
                setDays(range);
                setPage(1);
              }}
              className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                days === range
                  ? "border-orange-300 bg-orange-50 text-orange-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-orange-200"
              }`}
            >
              {range} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          index={0}
          label="Conversations"
          value={stats?.conversations ?? null}
          hint={stats ? `${stats.studentConversations} from logged-in students` : ""}
        />
        <Tile
          index={1}
          label="Answered"
          value={stats?.answeredRate == null ? null : Math.round(stats.answeredRate * 100)}
          format={(v) => `${v}%`}
          hint={stats ? `${stats.answered} of ${stats.questions} typed questions` : ""}
        />
        <Tile
          index={2}
          label="Rated helpful"
          value={stats?.helpfulRate == null ? null : Math.round(stats.helpfulRate * 100)}
          format={(v) => `${v}%`}
          hint={stats ? `${stats.thumbsUp} 👍 · ${stats.thumbsDown} 👎` : ""}
        />
        <Tile
          index={3}
          label="Leads from chat"
          value={leads}
          hint={stats ? `${stats.leads.demo} demos · ${stats.leads.callback} callbacks` : ""}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTabBar
          tabs={TABS}
          activeTab={kind}
          onChange={(next) => {
            setKind(next);
            setPage(1);
          }}
        />
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search questions"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>
      </div>

      {groups.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100 motion-safe:animate-fade-in" />
          ))}
        </div>
      ) : groups.isError ? (
        <EmptyBox text={groups.error.message} />
      ) : rows.length ? (
        <div className="space-y-3">
          {rows.map((item, index) => (
            <button
              key={item.normalizedText}
              type="button"
              onClick={() => openRow(item)}
              style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
              className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.3)] motion-safe:animate-fade-in-up"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">“{item.text}”</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <AudiencePill audience={item.audience} />
                  <Pill className="bg-sky-50 text-sky-700 ring-sky-200">
                    asked {item.count}×
                  </Pill>
                  {kind === "resolved" && (
                    <Pill
                      className={
                        item.status === "ignored"
                          ? "bg-slate-50 text-slate-600 ring-slate-200"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      }
                    >
                      {item.status === "ignored" ? "Ignored" : "Resolved"}
                    </Pill>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>Last asked {whenLabel(item.lastAskedAt)}</span>
                <span>Bot answered: {intentLabel(item.intent, faqs)}</span>
                {item.teachIntent && <span className="text-emerald-700">Taught: {intentLabel(item.teachIntent, faqs)}</span>}
              </div>
              {Object.keys(item.reasonCounts || {}).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(item.reasonCounts).map(([reason, count]) => (
                    <Pill key={reason} className="bg-rose-50 text-rose-700 ring-rose-200">
                      {REASON_LABELS[reason] || reason} · {count}
                    </Pill>
                  ))}
                </div>
              )}
              {item.comments?.[0] && <p className="text-xs italic text-slate-500">“{item.comments[0]}”</p>}
            </button>
          ))}
          {groups.data.totalPages > 1 && (
            <Pagination currentPage={page} totalPages={groups.data.totalPages} onPageChange={setPage} />
          )}
        </div>
      ) : (
        <EmptyBox text="Nothing here yet" />
      )}

      <SlideOver
        open={slideOver.open}
        onClose={closeSlideOver}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeSlideOver}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            {isOpenItem && (
              <button
                type="submit"
                form="chatbot-resolve-form"
                disabled={
                  saving ||
                  (mode === "teach" && !teachIntent) ||
                  (mode === "faq" && (!faqForm.title.trim() || !faqForm.body.trim()))
                }
                className="rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] active:scale-[0.97] disabled:opacity-50"
              >
                {mode === "faq" ? "Publish FAQ" : mode === "teach" ? "Teach the bot" : "Ignore question"}
              </button>
            )}
          </div>
        }
      >
        {row && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#FF6B35] to-[#fd8c5f] px-6 py-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                {TABS.find((tab) => tab.id === kind)?.label}
              </p>
              <h2 className="mt-2 text-lg font-semibold">“{row.text}”</h2>
              <p className="mt-1 text-sm text-white/80">
                Asked {row.count} time{row.count === 1 ? "" : "s"} · last {whenLabel(row.lastAskedAt)}
              </p>
            </div>

            <div className="space-y-5 px-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">What the bot said</h3>
                <p className="mt-1 text-sm font-medium text-slate-700">{intentLabel(row.intent, faqs)}</p>
                <p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 px-3.5 py-3 text-sm text-slate-700">
                  {row.replyText || "—"}
                </p>
              </section>

              {(Object.keys(row.reasonCounts || {}).length > 0 || row.comments?.length > 0) && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Visitor feedback</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(row.reasonCounts || {}).map(([reason, count]) => (
                      <Pill key={reason} className="bg-rose-50 text-rose-700 ring-rose-200">
                        {REASON_LABELS[reason] || reason} · {count}
                      </Pill>
                    ))}
                  </div>
                  {row.comments?.map((comment) => (
                    <p key={comment} className="mt-2 text-sm italic text-slate-600">“{comment}”</p>
                  ))}
                </section>
              )}

              {kind === "resolved" && row.note && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Note</h3>
                  <p className="mt-1 text-sm text-slate-700">{row.note}</p>
                </section>
              )}

              {isOpenItem && (
                <form id="chatbot-resolve-form" onSubmit={submit} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fix it</h3>
                  <div className="flex flex-wrap gap-2">
                    {MODES.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setMode(option.id)}
                        className={`rounded-2xl border px-3.5 py-2 text-sm font-medium transition ${
                          mode === option.id
                            ? "border-orange-300 bg-orange-50 text-orange-700"
                            : "border-slate-200 text-slate-600 hover:border-orange-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {mode === "faq" && (
                    <div className="space-y-2.5 motion-safe:animate-fade-in">
                      <p className="text-xs text-slate-500">
                        Publishes to the website FAQ page too. Visitors asking this — in these words or close to them — get your answer.
                      </p>
                      <input
                        value={faqForm.title}
                        onChange={(event) => setFaqForm((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="Question"
                        className={inputClass}
                      />
                      <textarea
                        value={faqForm.body}
                        onChange={(event) => setFaqForm((prev) => ({ ...prev, body: event.target.value }))}
                        rows={4}
                        placeholder="Answer"
                        className={inputClass}
                      />
                      <input
                        value={faqForm.category}
                        onChange={(event) => setFaqForm((prev) => ({ ...prev, category: event.target.value }))}
                        placeholder="Category (optional, e.g. Payments)"
                        className={inputClass}
                      />
                    </div>
                  )}

                  {mode === "teach" && (
                    <div className="space-y-2.5 motion-safe:animate-fade-in">
                      <p className="text-xs text-slate-500">
                        The bot already has the right answer but missed this wording. Pick the answer it should give.
                      </p>
                      <select
                        value={teachIntent}
                        onChange={(event) => setTeachIntent(event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Choose an answer…</option>
                        {teachOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {mode === "ignore" && (
                    <p className="text-xs text-slate-500 motion-safe:animate-fade-in">
                      For spam or questions the bot shouldn&apos;t answer. It stays in Resolved for reference.
                    </p>
                  )}

                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={300}
                    placeholder="Note for the team (optional)"
                    className={inputClass}
                  />
                </form>
              )}

              <section className="pb-6">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <FiMessageSquare /> Latest conversation
                </h3>
                <Transcript conversationId={row.conversationId} highlight={row.text} />
              </section>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
