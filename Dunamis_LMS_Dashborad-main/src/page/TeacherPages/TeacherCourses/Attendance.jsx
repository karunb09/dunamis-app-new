import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getTeacherHomeworkHistory } from "../../../redux/AttendanceHomework/AttendanceHomeworkSlice";
import toast from "react-hot-toast";
import { IoSearch } from "react-icons/io5";

const tabs = [
  { id: "pending", label: "Pending" },
  { id: "history", label: "History" },
  { id: "homework", label: "Homework" },
];

const getStudentName = (row) => {
  const firstName = row?.studentName?.firstName || "";
  const lastName = row?.studentName?.lastName || "";
  return `${firstName} ${lastName}`.trim() || "Student";
};

const getInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";

const getSlotText = (row) => {
  const days = Array.isArray(row?.slotDetails?.day)
    ? row.slotDetails.day.join(", ")
    : row?.slotDetails?.day || "";
  const start = row?.slotDetails?.startTime;
  const end = row?.slotDetails?.endTime;

  if (days && start && end) return `${days}, ${start} - ${end}`;
  if (start && end) return `${start} - ${end}`;
  return "Not available";
};

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const Avatar = ({ name, src }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-9 w-9 rounded-full object-cover object-top"
      />
    );
  }

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
      {getInitials(name)}
    </span>
  );
};

const EmptyState = ({ title, description }) => (
  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600">
      {description}
    </p>
  </div>
);

const Attendance = () => {
  const dispatch = useDispatch();
  const { homeworkHistory = [], loading, error } = useSelector(
    (state) => state.attendanceHomework || {}
  );

  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(getTeacherHomeworkHistory());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const rows = Array.isArray(homeworkHistory) ? homeworkHistory : [];

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) => {
      const searchable = [
        getStudentName(row),
        row?.categoryName,
        row?.courseName,
        row?.sessionType,
        row?.attendanceStatus,
        row?.homework,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [rows, search]);

  const homeworkRows = filteredRows.filter((row) => row?.homework);

  return (
    <div className="min-h-screen w-full bg-white p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Attendance & Homework
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Fake class rosters and manual attendance submissions have been
          removed. This page now shows only live homework and attendance history
          returned by the backend.
        </p>
      </div>

      <div className="mb-6 flex gap-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 text-sm font-medium ${
              activeTab === tab.id
                ? "border-b-2 border-black text-black"
                : "text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "pending" && (
        <EmptyState
          title="Pending Attendance Needs Live Class Data"
          description="The previous pending list used hardcoded students and class times. Once the live class schedule API is available, pending attendance can be rendered here from real class records."
        />
      )}

      {activeTab !== "pending" && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-500" />
            <input
              type="text"
              placeholder="Search records"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-full border py-2 pl-10 pr-3 text-sm focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => dispatch(getTeacherHomeworkHistory())}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      )}

      {activeTab === "history" && (
        <div className="rounded-lg border bg-white p-2 md:p-4">
          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
              <p className="mt-4 text-gray-600">Loading history...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title="No History Found"
              description="Attendance and homework submissions will appear here after they are created from real class records."
            />
          ) : (
            <div className="overflow-x-auto text-sm">
              <table className="min-w-full border-collapse text-left">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="px-3 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">Course Category</th>
                    <th className="px-3 py-2 font-medium">Course Name</th>
                    <th className="px-3 py-2 font-medium">Slot</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Session Type</th>
                    <th className="px-3 py-2 font-medium">Attendance</th>
                    <th className="px-3 py-2 font-medium">Homework</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const studentName = getStudentName(row);
                    const present =
                      String(row?.attendanceStatus || "").toLowerCase() ===
                      "present";

                    return (
                      <tr
                        key={row?._id || index}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Avatar name={studentName} src={row?.studentProfile} />
                            <span>{studentName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {row?.categoryName || "Not available"}
                        </td>
                        <td className="px-3 py-2">
                          {row?.courseName || "Not available"}
                        </td>
                        <td className="px-3 py-2">{getSlotText(row)}</td>
                        <td className="px-3 py-2">{formatDate(row?.createdAt)}</td>
                        <td className="px-3 py-2">
                          {row?.sessionType || "Not available"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 text-sm capitalize ${
                              present ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            <span className="h-2 w-2 rounded-full bg-current" />
                            {row?.attendanceStatus || "Not available"}
                          </span>
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 text-gray-500">
                          {row?.homework || "No homework"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "homework" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-12 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
              <p className="mt-4 text-gray-600">Loading homework...</p>
            </div>
          ) : homeworkRows.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No Homework Found"
                description="Homework created from live attendance submissions will appear here. No placeholder homework is shown."
              />
            </div>
          ) : (
            homeworkRows.map((row, index) => {
              const studentName = getStudentName(row);
              return (
                <article
                  key={row?._id || index}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar name={studentName} src={row?.studentProfile} />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {studentName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {row?.courseName || "Course not available"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-gray-700">
                    {row.homework}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>{formatDate(row?.createdAt)}</span>
                    <span>{row?.sessionType || "Session not available"}</span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Attendance;
