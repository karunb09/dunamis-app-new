import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiUsers, FiVideo } from "react-icons/fi";
import MeetingLinkBlock from "../../../components/MeetingLinkBlock";
import { getStoredToken } from "../../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const DAY_LABELS = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const formatDays = (days = []) =>
  days.map((d) => DAY_LABELS[String(d).toLowerCase()] || d).join(" · ");

// Join links for the teacher's recurring classes. The link is stored on the
// batch, not the dated slot, so it survives the weekly slot regeneration and
// only has to be entered once.
const ClassLinksPanel = ({ courseId }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/slots/my-classes`, {
        headers: { Authorization: `Bearer ${getStoredToken()}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to load classes");
      setClasses(data.classes || []);
    } catch (err) {
      toast.error(err.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveLink = async (parentAvailabilityId, meetingLink) => {
    setSavingId(parentAvailabilityId);
    try {
      const res = await fetch(
        `${BASE_URL}/slots/class/${parentAvailabilityId}/meeting-link`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getStoredToken()}`,
          },
          body: JSON.stringify({ meetingLink }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save link");
      setClasses((prev) =>
        prev.map((cls) =>
          cls.parentAvailabilityId === parentAvailabilityId
            ? { ...cls, meetingLink: data.meetingLink }
            : cls
        )
      );
      toast.success(data.message);
    } catch (err) {
      toast.error(err.message || "Failed to save link");
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
              saving={savingId === cls.parentAvailabilityId}
              onSave={(next) => saveLink(cls.parentAvailabilityId, next)}
              savedHint="Students are emailed this 15 minutes before class."
              emptyHint="Add a link so students can join this class."
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassLinksPanel;
