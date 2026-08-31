import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FiCopy, FiExternalLink } from "react-icons/fi";

// Shared by demo bookings and enrolled classes. `onSave(nextLink)` is called
// only when the value actually changed.
const MeetingLinkBlock = ({
  link = "",
  saving = false,
  onSave,
  label = "Class Link",
  savedHint = "Student was emailed this link.",
  emptyHint = "Saving a link emails it to the student straight away.",
}) => {
  const savedLink = link || "";
  const [editing, setEditing] = useState(!savedLink);
  const [draft, setDraft] = useState(savedLink);

  useEffect(() => {
    setDraft(savedLink);
    setEditing(!savedLink);
  }, [savedLink]);

  const submit = () => {
    const next = draft.trim();
    if (next === savedLink) {
      setEditing(!next);
      return;
    }
    if (next && !/^https:\/\/\S+$/.test(next)) {
      toast.error("Enter a valid https:// link");
      return;
    }
    onSave(next);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(savedLink);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={draft}
            disabled={saving}
            placeholder="https://meet.google.com/…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") {
                setDraft(savedLink);
                setEditing(!savedLink);
              }
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-orange-400 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="shrink-0 rounded-xl bg-[#FF6B35] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={savedLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
          >
            <FiExternalLink className="h-3.5 w-3.5" />
            Join class
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
          >
            <FiCopy className="h-3.5 w-3.5" />
            Copy
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-200 hover:text-orange-600 disabled:opacity-50"
          >
            Edit
          </button>
        </div>
      )}

      <p className="mt-1.5 text-[11px] text-slate-400">{savedLink ? savedHint : emptyHint}</p>
    </div>
  );
};

export default MeetingLinkBlock;
