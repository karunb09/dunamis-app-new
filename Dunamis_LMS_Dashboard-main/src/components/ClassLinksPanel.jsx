import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiUsers, FiVideo } from "react-icons/fi";
import MeetingLinkBlock from "./MeetingLinkBlock";
import { fetchClassLinks, saveClassLink } from "../api/classLinksApi";
import { formatDays } from "../utils/formatDays";

// Join links for an instructor's recurring classes. The link is stored on the
// batch, not the dated slot, so it survives the weekly slot regeneration and
// only has to be entered once. Instructors see their own classes; admins pass
// `teacherId` to see (and, unless `readOnly`, change) someone else's.
const ClassLinksPanel = ({ courseId, teacherId, readOnly = false }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setClasses(await fetchClassLinks(teacherId));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveLink = async (parentAvailabilityId, meetingLink) => {
    setSavingId(parentAvailabilityId);
    try {
      const data = await saveClassLink(parentAvailabilityId, meetingLink);
      setClasses((prev) =>
        prev.map((cls) =>
          cls.parentAvailabilityId === parentAvailabilityId
            ? { ...cls, meetingLink: data.meetingLink }
            : cls
        )
      );
      toast.success(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const visible = courseId
    ? classes.filter((cls) => String(cls.course?._id || cls.course) === String(courseId))
    : classes;

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        Loading class links…
      </div>
    );
  }

  if (!visible.length) return null;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-sm font-semibold text-slate-700">Class join links</h3>
      <p className="mt-1 text-xs text-slate-500">
        Students are emailed this link 15 minutes before each session starts.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {visible.map((cls) => (
          <div
            key={cls.parentAvailabilityId}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                {cls.sessionType === "premium" ? "One-to-one" : "Group"}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <FiUsers className="h-3 w-3" />
                {cls.studentCount}
              </span>
              {cls.branch?.branchName && (
                <span className="text-xs text-slate-500">{cls.branch.branchName}</span>
              )}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">{cls.course?.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <FiVideo className="h-3 w-3" />
              {[formatDays(cls.recurringDays), `${cls.startTime} – ${cls.endTime}`]
                .filter(Boolean)
                .join(" · ")}
            </p>

            <MeetingLinkBlock
              link={cls.meetingLink}
              readOnly={readOnly}
              saving={savingId === cls.parentAvailabilityId}
              onSave={(next) => saveLink(cls.parentAvailabilityId, next)}
              savedHint="Students are emailed this 15 minutes before class."
              emptyHint={
                readOnly
                  ? "No link added yet."
                  : "Add a link so students can join this class."
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassLinksPanel;
