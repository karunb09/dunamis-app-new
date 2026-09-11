import React, { useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import {
  FiArrowDown,
  FiArrowUp,
  FiCopy,
  FiEdit2,
  FiInbox,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import {
  useCreateQuestionnaire,
  useDeleteQuestionnaire,
  useDuplicateQuestionnaire,
  useQuestionnaires,
  useUpdateQuestionnaire,
} from "../../hooks/useQuestionnaires";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100";

const blankQuestion = () => ({ prompt: "", type: "fill_blank", options: [], required: false });

const emptyDraft = () => ({ title: "", description: "", questions: [blankQuestion()] });

const Questionnaires = () => {
  const [editing, setEditing] = useState(null);
  const { data, isLoading, isError, error } = useQuestionnaires();
  const duplicate = useDuplicateQuestionnaire();
  const remove = useDeleteQuestionnaire();

  const questionnaires = data?.questionnaires || [];

  const runDuplicate = async (q) => {
    try {
      await duplicate.mutateAsync(q._id);
      toast.success("Copied as a new draft");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const runDelete = async (q) => {
    const { isConfirmed } = await Swal.fire({
      title: `Delete "${q.title}"?`,
      text: "Assessments already sent keep their own copy of the questions.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
    });
    if (!isConfirmed) return;

    try {
      await remove.mutateAsync(q._id);
      toast.success("Questionnaire deleted");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (editing) {
    return <Builder initial={editing} onClose={() => setEditing(null)} />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Questionnaires</p>
          <h1 className="text-2xl font-bold text-slate-900">Your questionnaires</h1>
          <p className="text-sm text-slate-500">
            Build a form once, then send it with any assessment — to a whole class or one learner.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(emptyDraft())}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
        >
          <FiPlus />
          New questionnaire
        </button>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error?.message}</div>
      ) : questionnaires.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-slate-400">
          <FiInbox className="text-2xl" />
          <p className="text-sm">Nothing here yet — build your first questionnaire.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {questionnaires.map((q) => (
            <div key={q._id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{q.title}</p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                    q.status === "published"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-amber-200"
                  }`}
                >
                  {q.status === "published" ? "Published" : "Draft"}
                </span>
              </div>
              {q.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{q.description}</p>
              ) : null}
              <p className="mt-2 text-xs text-slate-400">
                {q.questions.length} question{q.questions.length === 1 ? "" : "s"}
                {q.courseId?.name ? ` · ${q.courseId.name}` : ""} · updated {dayjs(q.updatedAt).format("D MMM")}
              </p>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditing(q)}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
                >
                  <FiEdit2 />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => runDuplicate(q)}
                  disabled={duplicate.isPending}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-200 hover:text-orange-600 disabled:opacity-50"
                >
                  <FiCopy />
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => runDelete(q)}
                  disabled={remove.isPending}
                  className="ml-auto rounded-2xl border border-rose-100 p-1.5 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                  aria-label="Delete questionnaire"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Builder = ({ initial, onClose }) => {
  const [form, setForm] = useState({
    title: initial.title || "",
    description: initial.description || "",
    questions: (initial.questions?.length ? initial.questions : [blankQuestion()]).map((q) => ({
      prompt: q.prompt || "",
      type: q.type || "fill_blank",
      options: q.options || [],
      required: Boolean(q.required),
    })),
  });
  const create = useCreateQuestionnaire();
  const update = useUpdateQuestionnaire();
  const saving = create.isPending || update.isPending;

  const setQuestion = (index, patch) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }));

  const move = (index, delta) =>
    setForm((f) => {
      const next = [...f.questions];
      const target = index + delta;
      if (target < 0 || target >= next.length) return f;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, questions: next };
    });

  const save = async (status) => {
    const questions = form.questions
      .map((q) => ({
        ...q,
        prompt: q.prompt.trim(),
        options: q.type === "checkbox" ? q.options.map((o) => o.trim()).filter(Boolean) : [],
      }))
      .filter((q) => q.prompt);

    if (!form.title.trim()) return toast.error("Give the questionnaire a title.");
    if (status === "published") {
      if (!questions.length) return toast.error("Add at least one question before publishing.");
      const bare = questions.find((q) => q.type === "checkbox" && !q.options.length);
      if (bare) return toast.error(`"${bare.prompt}" needs at least one option.`);
    }

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      questions,
      status,
    };

    try {
      if (initial._id) await update.mutateAsync({ id: initial._id, ...body });
      else await create.mutateAsync(body);
      toast.success(status === "published" ? "Published — ready to send" : "Draft saved");
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
            {initial._id ? "Edit questionnaire" : "New questionnaire"}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">{form.title || "Untitled"}</h1>
          {initial._id && initial.status === "published" ? (
            <p className="text-xs text-slate-500">
              Changes here do not affect assessments already sent — each kept its own copy.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <FiX size={18} />
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Title — e.g. Beginner vocals, month 6"
          maxLength={200}
          className={inputClass}
        />
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Instructions for the learner (optional)"
          maxLength={1000}
          className={inputClass}
        />
      </div>

      {form.questions.map((q, index) => (
        <div key={index} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Q{index + 1}</span>
            <select
              value={q.type}
              onChange={(e) =>
                setQuestion(index, {
                  type: e.target.value,
                  options: e.target.value === "checkbox" && !q.options.length ? [""] : q.options,
                })
              }
              className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-orange-400 focus:outline-none"
            >
              <option value="fill_blank">Fill in the blank</option>
              <option value="checkbox">Checkboxes</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => setQuestion(index, { required: e.target.checked })}
                className="h-3.5 w-3.5 accent-orange-500"
              />
              Required
            </label>
            <div className="ml-auto flex gap-1">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up">
                <FiArrowUp />
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === form.questions.length - 1} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down">
                <FiArrowDown />
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== index) }))}
                className="rounded-xl p-1.5 text-rose-500 hover:bg-rose-50"
                aria-label="Remove question"
              >
                <FiTrash2 />
              </button>
            </div>
          </div>

          <input
            value={q.prompt}
            onChange={(e) => setQuestion(index, { prompt: e.target.value })}
            placeholder={q.type === "fill_blank" ? "e.g. The raga we practised this month was ______" : "e.g. Which of these did you practise?"}
            maxLength={500}
            className={inputClass}
          />

          {q.type === "checkbox" && (
            <div className="space-y-2 pl-4">
              {q.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 shrink-0 rounded border border-slate-300" />
                  <input
                    value={option}
                    onChange={(e) =>
                      setQuestion(index, {
                        options: q.options.map((o, i) => (i === optionIndex ? e.target.value : o)),
                      })
                    }
                    placeholder={`Option ${optionIndex + 1}`}
                    maxLength={200}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuestion(index, { options: q.options.filter((_, i) => i !== optionIndex) })}
                    className="rounded-xl p-1 text-slate-400 hover:text-rose-600"
                    aria-label="Remove option"
                  >
                    <FiX />
                  </button>
                </div>
              ))}
              {q.options.length < 20 && (
                <button
                  type="button"
                  onClick={() => setQuestion(index, { options: [...q.options, ""] })}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  + Add option
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {form.questions.length < 50 && (
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, questions: [...f.questions, blankQuestion()] }))}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition hover:border-orange-300 hover:text-orange-600"
        >
          <FiPlus />
          Add question
        </button>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => save("draft")}
          disabled={saving}
          className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Save as draft
        </button>
        <button
          type="button"
          onClick={() => save("published")}
          disabled={saving}
          className="rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Publish"}
        </button>
      </div>
    </div>
  );
};

export default Questionnaires;
