import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getStoredToken } from "../../../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const IT_SUPPORT = import.meta.env.VITE_IT_SUPPORT_EMAIL || "support@dunamisindia.co.in";

const getAuthHeaders = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const SESSION_TYPES = ["standard", "premium"];
const PLAN_TYPES = ["monthly", "full"];
const TENURE_OPTIONS = [3, 6, 12];

const ErrorBox = ({ message, hint }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    <p className="font-semibold">{message}</p>
    {hint && <p className="mt-1 text-red-600">{hint}</p>}
    <p className="mt-2 text-xs text-red-500">
      Need help?{" "}
      <a href={`mailto:${IT_SUPPORT}`} className="underline">
        Contact IT support
      </a>
    </p>
  </div>
);

export default function ManualEnrollForm({ onSuccess }) {
  // Student lookup
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundStudent, setFoundStudent] = useState(null);
  const [studentError, setStudentError] = useState("");

  // Course / slot data
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Form selections
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [sessionType, setSessionType] = useState("standard");
  const [planType, setPlanType] = useState("full");
  const [planMonths, setPlanMonths] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptRef, setReceiptRef] = useState("");
  const [referralCode, setReferralCode] = useState("");

  // Slots
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load offline courses once
  useEffect(() => {
    setCoursesLoading(true);
    axios
      .get(`${BASE_URL}/course/get`, {
        params: { mode: "offline", status: "published" },
        headers: getAuthHeaders(),
      })
      .then((res) => {
        const all = Array.isArray(res.data?.courses)
          ? res.data.courses
          : Array.isArray(res.data)
          ? res.data
          : [];
        setCourses(all.filter((c) => c.mode === "offline"));
      })
      .catch(() => {
        toast.error("Failed to load courses.");
      })
      .finally(() => setCoursesLoading(false));
  }, []);

  // Load slots when course + branch are selected
  useEffect(() => {
    if (!selectedCourseId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    const params = {
      courseId: selectedCourseId,
      slotType: "enrolled",
    };
    if (selectedBranchId) params.branchId = selectedBranchId;
    if (selectedTeacherId) params.teacherId = selectedTeacherId;

    axios
      .get(`${BASE_URL}/slots/available`, { params, headers: getAuthHeaders() })
      .then((res) => {
        setSlots(Array.isArray(res.data?.slots) ? res.data.slots : []);
      })
      .catch(() => {
        toast.error("Failed to load batch slots.");
        setSlots([]);
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedCourseId, selectedBranchId, selectedTeacherId]);

  // Sync selectedCourse object
  useEffect(() => {
    const course = courses.find((c) => c._id === selectedCourseId || c.id === selectedCourseId);
    setSelectedCourse(course || null);
    setSelectedBranchId("");
    setSelectedTeacherId("");
    setSelectedSlotId("");
    setSlots([]);
  }, [selectedCourseId, courses]);

  const handleStudentSearch = async () => {
    const query = searchInput.trim();
    if (!query) return;

    setSearching(true);
    setStudentError("");
    setFoundStudent(null);

    try {
      const res = await axios.get(`${BASE_URL}/student/search`, {
        params: { q: query },
        headers: getAuthHeaders(),
      });
      const student = res.data?.student || res.data?.students?.[0] || null;
      if (!student) {
        setStudentError(
          `No student account found for "${query}". Ask the student to register on the website first.`
        );
      } else {
        setFoundStudent(student);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        `Student not found for "${query}". Please verify the email or phone number.`;
      setStudentError(msg);
    } finally {
      setSearching(false);
    }
  };

  const branchOptions = Array.isArray(selectedCourse?.branches)
    ? selectedCourse.branches
    : [];

  const teacherOptions = Array.isArray(selectedCourse?.teacher)
    ? selectedCourse.teacher
    : [];

  const slotLabel = (slot) => {
    const days =
      slot.batchLabel ||
      slot.dayPairLabel ||
      (Array.isArray(slot.recurringDays) ? slot.recurringDays.join(" / ") : "");
    const time = `${slot.startTime || ""}–${slot.endTime || ""}`;
    const seats = slot.availableSeats != null ? ` · ${slot.availableSeats} seats left` : "";
    return [days, time, seats].filter(Boolean).join("  ");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!foundStudent) {
      setSubmitError({ message: "Please search for and select a student first." });
      return;
    }
    if (!selectedCourseId) {
      setSubmitError({ message: "Please select a course." });
      return;
    }
    if (!selectedSlotId) {
      setSubmitError({ message: "Please select a batch slot." });
      return;
    }
    if (!selectedTeacherId) {
      setSubmitError({ message: "Please select an instructor." });
      return;
    }
    if (!selectedBranchId) {
      setSubmitError({ message: "Please select a branch." });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setSubmitError({ message: "Please enter a valid cash amount." });
      return;
    }

    const slot = slots.find((s) => (s._id || s.id) === selectedSlotId);

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/enrollment/admin-enroll`,
        {
          studentId: foundStudent._id || foundStudent.id,
          courseId: selectedCourseId,
          slotId: selectedSlotId,
          teacherId: selectedTeacherId,
          branchId: selectedBranchId,
          sessionType,
          planType,
          planMonths: planType === "monthly" && planMonths ? Number(planMonths) : undefined,
          amount: Number(amount),
          paymentDate,
          receiptRef: receiptRef || undefined,
          referralCode: referralCode.trim().toUpperCase() || undefined,
        },
        { headers: getAuthHeaders() }
      );

      setSuccess(res.data);
      toast.success("Student enrolled successfully!");
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      const data = err.response?.data || {};
      setSubmitError({
        message: data.message || "Enrollment failed. Please try again.",
        hint: data.hint || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
          ✓
        </div>
        <h3 className="text-lg font-bold text-emerald-800">Enrollment Successful</h3>
        <p className="mt-1 text-sm text-emerald-700">
          {success.student?.name} has been enrolled. A confirmation email has been sent.
        </p>
        <p className="mt-1 text-xs text-emerald-600">
          Transaction ID: {success.transaction?.merchantOrderId}
        </p>
        <button
          onClick={() => {
            setSuccess(null);
            setFoundStudent(null);
            setSearchInput("");
            setSelectedCourseId("");
            setSelectedSlotId("");
            setAmount("");
            setReceiptRef("");
          }}
          className="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Enroll Another Student
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1: Find student */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          1. Find Student
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleStudentSearch())}
            placeholder="Email or phone number"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-400"
          />
          <button
            type="button"
            onClick={handleStudentSearch}
            disabled={searching || !searchInput.trim()}
            className="rounded-xl bg-gray-800 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 hover:bg-gray-700"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>

        {studentError && (
          <div className="mt-3">
            <ErrorBox
              message={studentError}
              hint="If the student is new, ask them to register at dunamisindia.co.in first."
            />
          </div>
        )}

        {foundStudent && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              {(foundStudent.name || foundStudent.userId?.name?.firstName || "S")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                {foundStudent.name ||
                  `${foundStudent.userId?.name?.firstName || ""} ${foundStudent.userId?.name?.lastName || ""}`.trim() ||
                  "Student"}
              </p>
              <p className="truncate text-xs text-gray-500">
                {foundStudent.email || foundStudent.userId?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setFoundStudent(null); setSearchInput(""); }}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Course */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          2. Select Course
        </h3>
        {coursesLoading ? (
          <p className="text-sm text-gray-400">Loading courses…</p>
        ) : courses.length === 0 ? (
          <ErrorBox
            message="No published offline courses found."
            hint="Create and publish an offline course first, or contact IT support."
          />
        ) : (
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400"
          >
            <option value="">— Choose a course —</option>
            {courses.map((c) => (
              <option key={c._id || c.id} value={c._id || c.id}>
                {c.name || c.title} {c.code ? `(${c.code})` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Step 3: Branch + Instructor */}
      {selectedCourse && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            3. Branch & Instructor
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Branch</label>
              {branchOptions.length === 0 ? (
                <ErrorBox
                  message="No branches assigned to this course."
                  hint="Assign at least one branch to the course before enrolling."
                />
              ) : (
                <select
                  value={selectedBranchId}
                  onChange={(e) => { setSelectedBranchId(e.target.value); setSelectedSlotId(""); }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400"
                >
                  <option value="">— Select branch —</option>
                  {branchOptions.map((b) => {
                    const id = b._id || b.id || b;
                    const name = b.branchName || b.name || id;
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Instructor</label>
              {teacherOptions.length === 0 ? (
                <ErrorBox
                  message="No instructors assigned to this course."
                  hint="Assign an instructor to the course before enrolling."
                />
              ) : (
                <select
                  value={selectedTeacherId}
                  onChange={(e) => { setSelectedTeacherId(e.target.value); setSelectedSlotId(""); }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400"
                >
                  <option value="">— Select instructor —</option>
                  {teacherOptions.map((t) => {
                    const id = t._id || t.id || t;
                    const firstName = t.userId?.name?.firstName || t.name?.firstName || "";
                    const lastName = t.userId?.name?.lastName || t.name?.lastName || "";
                    const name = `${firstName} ${lastName}`.trim() || t.userId?.email || String(id);
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Batch slot */}
      {selectedCourse && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            4. Select Batch
          </h3>
          {slotsLoading ? (
            <p className="text-sm text-gray-400">Loading batches…</p>
          ) : slots.length === 0 ? (
            <ErrorBox
              message="No enrolled batch slots found for this course / branch / instructor."
              hint="The instructor must create enrolled slots (batches) at this branch before enrollment is possible."
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {slots.map((slot) => {
                const id = slot._id || slot.id;
                const label = slotLabel(slot);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedSlotId(id)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedSlotId === id
                        ? "border-orange-400 bg-orange-50 font-semibold text-orange-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-orange-200"
                    }`}
                  >
                    {label || "Batch slot"}
                    {slot.availableSeats === 0 && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                        Full
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 5: Session + Payment plan */}
      {selectedCourse && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            5. Session & Payment Plan
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Session type</label>
              <div className="flex gap-2">
                {SESSION_TYPES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSessionType(s)}
                    className={`flex-1 rounded-xl border py-2 text-sm capitalize transition ${
                      sessionType === s
                        ? "border-orange-400 bg-orange-50 font-semibold text-orange-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-orange-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Plan type</label>
              <div className="flex gap-2">
                {PLAN_TYPES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlanType(p)}
                    className={`flex-1 rounded-xl border py-2 text-sm capitalize transition ${
                      planType === p
                        ? "border-orange-400 bg-orange-50 font-semibold text-orange-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-orange-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {planType === "monthly" && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Duration (months)</label>
              <div className="flex gap-2">
                {TENURE_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPlanMonths(m)}
                    className={`flex-1 rounded-xl border py-2 text-sm transition ${
                      planMonths === m
                        ? "border-orange-400 bg-orange-50 font-semibold text-orange-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-orange-200"
                    }`}
                  >
                    {m} mo
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 6: Cash payment details */}
      {selectedCourse && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            6. Cash Payment Details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Amount collected (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Payment date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Receipt / reference number (optional)
              </label>
              <input
                type="text"
                value={receiptRef}
                onChange={(e) => setReceiptRef(e.target.value)}
                placeholder="Cash receipt number"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Referral code (optional)
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Employee ID or freelancer code, e.g. DSMI001"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-mono text-sm uppercase outline-none focus:border-orange-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <ErrorBox message={submitError.message} hint={submitError.hint} />
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !foundStudent || !selectedSlotId || !amount}
        className="w-full rounded-2xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-40"
      >
        {submitting ? "Enrolling…" : "Enroll Student (Cash Payment)"}
      </button>
    </form>
  );
}
