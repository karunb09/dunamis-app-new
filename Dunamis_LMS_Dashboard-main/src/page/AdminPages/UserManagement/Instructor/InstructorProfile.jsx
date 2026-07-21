import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiMapPin,
  FiMail,
  FiPhone,
  FiUsers,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiStar,
  FiWifi,
  FiMoreHorizontal,
  FiFileText,
  FiClock,
  FiMessageSquare,
  FiCompass,
  FiDollarSign,
  FiTrendingUp,
  FiFolder,
} from "react-icons/fi";
import { FaMusic, FaLanguage, FaPersonBooth } from "react-icons/fa";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

import DataTable from "../../../../components/Table";
import IconTabBar from "../../../../components/IconTabBar";
import PageTabBar from "../../../../components/PageTabBar";
import EditInstructorModal from "./EditInstructorModal";
import CoursesTab from "./TabContent/CoursesTab";
import ScheduleTab from "./TabContent/ScheduleTab";
import StudentsTab from "./TabContent/StudentsTab";
import ReviewsTab from "./TabContent/ReviewsTab";
import OrientationsTab from "./TabContent/Orientationstab";
import RemunerationTab from "./TabContent/RemunerationTab";
import { fetchTeacherById, updateTeacher } from "../../../../redux/Intructor/teacherSlice";
import { DEFAULT_AVATAR, resolveImageUrl } from "../../../../utils/resolveImageUrl";
import { getStoredToken } from "../../../../utils/authSession";

const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;

const InstructorProfile = () => {
  const { instructorId } = useParams();
  const dispatch = useDispatch();

  const { selectedTeacher, loading, error } = useSelector((state) => state.teachers);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    mode: selectedTeacher?.teacherDetails?.mode,
    branch: selectedTeacher?.teacherDetails?.branch,
    courses: selectedTeacher?.courses?.map((c) => c.name) || [],
    profilePicture: selectedTeacher?.teacherDetails?.profilePicture,
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [activeTab, setActiveTab] = useState("Courses");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [instructorDocs, setInstructorDocs] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [courseDocs, setCourseDocs] = useState(null);

  useEffect(() => {
    if (instructorId) {
      dispatch(fetchTeacherById(instructorId));
    }
  }, [dispatch, instructorId]);

  useEffect(() => {
    if (!selectedTeacher) return;

    setEditData({
      mode: selectedTeacher.teacherDetails?.mode || "online",
      branch: selectedTeacher.teacherDetails?.branch || "",
      courses: selectedTeacher.courses?.map((c) => c.name) || [],
      profilePicture:
        selectedTeacher.teacherDetails?.profilePicture ||
        selectedTeacher.user?.image ||
        "",
    });
  }, [selectedTeacher]);

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!selectedTeacher) return <div className="p-6 text-red-500">Instructor not found.</div>;

  const instructor = selectedTeacher.teacherDetails;
  const instructorAvatar = resolveImageUrl(
    instructor?.profilePicture || selectedTeacher.user?.image,
    DEFAULT_AVATAR
  );

  const joiningDate = new Date(instructor?.createdAt);
  const formattedDate =
    joiningDate instanceof Date && !isNaN(joiningDate)
      ? joiningDate.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })
      : "Invalid Date";

  const joiningYear = joiningDate.getFullYear();
  const currentYear = new Date().getFullYear();
  // const yearsOfExperience = isNaN(joiningYear) ? "Invalid" : currentYear - joiningYear;

  const categoryConfig = {
    Music: { icon: <FaMusic className="text-2xl" />, bg: "bg-blue-100 text-blue-700" },
    Dance: { icon: <FaPersonBooth className="text-2xl" />, bg: "bg-yellow-100 text-yellow-800" },
    Language: { icon: <FaLanguage className="text-2xl" />, bg: "bg-green-100 text-green-700" },
  };

  const tabs = [
    { id: "Courses", label: "Courses", icon: FiBookOpen },
    { id: "Schedule", label: "Schedule", icon: FiClock },
    { id: "Students", label: "Students", icon: FiUsers },
    { id: "Reviews", label: "Reviews", icon: FiMessageSquare },
    { id: "Orientations", label: "Orientations", icon: FiCompass },
    { id: "Remuneration", label: "Remuneration", icon: FiDollarSign },
    { id: "Financial History", label: "Financial History", icon: FiTrendingUp },
    { id: "Documents", label: "Documents", icon: FiFolder },
  ];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "Documents" && !instructorDocs && !docsLoading) {
      setDocsLoading(true);
      const teacherId = selectedTeacher.id || selectedTeacher._id;
      const headers = { Authorization: `Bearer ${getStoredToken()}` };
      Promise.all([
        fetch(`${VITE_BASE_URL}/teachers/${teacherId}/documents`, { headers, credentials: "include" }).then((r) => r.json()),
        fetch(`${VITE_BASE_URL}/teachers/${teacherId}/course-media`, { headers, credentials: "include" }).then((r) => r.json()),
      ])
        .then(([docsData, courseData]) => {
          if (docsData.success) setInstructorDocs(docsData.data);
          if (courseData.success) setCourseDocs(courseData.data);
        })
        .catch(() => {})
        .finally(() => setDocsLoading(false));
    }
  };

  const columns = [
    { key: "timeDate", header: "Time & Date" },
    { key: "workDays", header: "Work days" },
    { key: "transactionId", header: "Transaction ID" },
    { key: "percentage", header: "Percentage" },
    { key: "basic", header: "Basic" },
    { key: "deductions", header: "Deductions" },
    { key: "totalEarnings", header: "Total Earnings" },
    { key: "totalEarningsWords", header: "Total Earnings (in words)" },
    {
      key: "status",
      header: "Status",
      render: (value) => (
        <span
          className={`inline-block px-2 py-1 rounded-full text-xs ${value === "Paid" ? "text-green-600" : "text-orange-600"
            }`}
        >
          {value}
        </span>
      ),
    },
  ];

  const filteredFinancialData =
    selectedTeacher.financialData?.filter(
      (data) =>
        data.timeDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.status.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const handleSaveInstructor = async (updated) => {
    const payload = new FormData();
    payload.append(
      "teacherDetails",
      JSON.stringify({
        mode: updated.mode || instructor?.mode || "online",
      })
    );

    if (updated.profilePictureFile) {
      payload.append("profilePicture", updated.profilePictureFile);
    }

    setIsSavingProfile(true);
    try {
      await dispatch(
        updateTeacher({
          id: instructorId,
          updatedData: payload,
        })
      ).unwrap();
      await dispatch(fetchTeacherById(instructorId)).unwrap();
      toast.success("Instructor profile updated successfully.");
      setIsEditing(false);
    } catch (saveError) {
      toast.error(saveError || "Failed to update instructor profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleEditEmployeeId = async () => {
    setMenuOpen(false);
    const { value: employeeId, isConfirmed } = await Swal.fire({
      title: "Edit Employee ID",
      input: "text",
      inputValue: selectedTeacher.user?.employeeId || "",
      inputPlaceholder: "e.g. DSMI001",
      showCancelButton: true,
      confirmButtonText: "Save",
      confirmButtonColor: "#FF6B35",
    });
    if (!isConfirmed || !employeeId?.trim()) return;

    const token = getStoredToken();
    try {
      const res = await fetch(`${VITE_BASE_URL}/user/${selectedTeacher.user._id}/employee-id`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ employeeId: employeeId.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to update employee ID");
      toast.success(`Employee ID updated to ${data.user.employeeId}`);
      dispatch(fetchTeacherById(instructorId));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 sm:gap-6 items-start md:items-center">
        <div className="flex flex-row items-start gap-3 sm:gap-4 w-full">
          <img
            src={instructorAvatar}
            alt={instructor.name?.firstName}
            className="w-16 h-16 sm:w-28 sm:h-28 rounded-full object-cover object-top flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold leading-tight">{`${instructor.name?.firstName} ${instructor.name?.lastName}`}</h1>
                <p className="text-sm text-gray-600 mt-0.5">{instructor.areaOfExpertise || "Instructor"}</p>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600 mt-2 sm:mt-3">
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <FiMapPin className="text-base sm:text-xl text-gray-500" />
                    <span>{instructor.currentAddress || "—"}</span>
                  </span>
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <FiMail className="shrink-0 text-base sm:text-xl text-gray-500" />
                    <span className="break-all">{selectedTeacher.user?.email || "—"}</span>
                  </span>
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <FiPhone className="text-base sm:text-xl text-gray-500" />
                    <span>{selectedTeacher.user?.mobileNo || "—"}</span>
                  </span>
                </div>

                <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2 items-center">
                  {selectedTeacher.user?.employeeId && (
                    <span className="px-2 py-0.5 sm:py-1 bg-slate-100 text-slate-700 text-xs sm:text-sm rounded-full font-mono">
                      {selectedTeacher.user.employeeId}
                    </span>
                  )}
                  <span className="px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-600 text-xs sm:text-sm rounded-full">
                    {instructor.areaOfExpertise}
                  </span>
                  <span className="px-2 py-0.5 sm:py-1 bg-yellow-100 text-yellow-600 text-xs sm:text-sm rounded-full flex items-center gap-1">
                    <FiWifi className="text-sm sm:text-lg" /> {instructor.mode}
                  </span>
                  <span className="px-2 py-0.5 sm:py-1 bg-orange-100 text-orange-600 text-xs sm:text-sm rounded-full flex items-center gap-1">
                    <FiStar className="text-sm sm:text-lg text-orange-400" /> {selectedTeacher.averageRating || 0}
                  </span>
                </div>

                {instructor.bio && <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 max-w-xl line-clamp-2 sm:line-clamp-none">{instructor.bio}</p>}

                <div className="mt-2 sm:mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <FiBriefcase className="text-sm sm:text-lg" /> {selectedTeacher.teacherDetails?.yearOfExperience} years of experience
                  </span>

                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <FiCalendar className="text-sm sm:text-lg" /> Joined: {formattedDate}
                  </span>
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <FiBookOpen className="text-sm sm:text-lg" /> {selectedTeacher.courses?.length} active courses
                  </span>
                </div>
              </div>

              {/* Menu */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setMenuOpen((s) => !s)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  aria-label="open menu"
                >
                  <FiMoreHorizontal className="text-xl" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setIsEditing(true);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleEditEmployeeId}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50"
                    >
                      Edit Employee ID
                    </button>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-50">Disable</button>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-50">Block</button>
                    <button className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50">Delete</button>
                  </div>
                )}

                {isEditing && (
                  <EditInstructorModal
                    open={isEditing}
                    onClose={() => {
                      if (!isSavingProfile) setIsEditing(false);
                    }}
                    data={editData}
                    onSave={handleSaveInstructor}
                    saving={isSavingProfile}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 sm:gap-4">
        {[
          { icon: <FiUsers className="text-2xl text-cyan-600 sm:text-3xl" />, value: selectedTeacher.studentCount, label: "Total Students" },
          { icon: <FiBookOpen className="text-2xl text-cyan-600 sm:text-3xl" />, value: selectedTeacher.courses?.length, label: "Active Courses" },
          { icon: <FiBriefcase className="text-2xl text-cyan-600 sm:text-3xl" />, value: selectedTeacher.teacherDetails?.yearOfExperience, label: "Experience (yrs)" },
          { icon: <FiCalendar className="text-2xl text-cyan-600 sm:text-3xl" />, value: formattedDate, label: "Joining Date" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-center shadow-sm sm:p-6 sm:gap-2"
          >
            {stat.icon}
            <p className="text-lg font-bold sm:text-2xl">{stat.value}</p>
            <p className="text-xs text-gray-500 sm:text-base">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="md:hidden">
          <PageTabBar tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
        </div>
        <div className="hidden md:block md:shrink-0">
          <IconTabBar orientation="vertical" tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
        </div>

        <div className="min-w-0 flex-1">
          {activeTab === "Courses" && <CoursesTab instructor={selectedTeacher} categoryConfig={categoryConfig} />}
          {activeTab === "Schedule" && <ScheduleTab teacher={selectedTeacher} />}
          {activeTab === "Students" && <StudentsTab instructor={selectedTeacher} />}
          {activeTab === "Reviews" && <ReviewsTab instructor={selectedTeacher} />}
          {activeTab === "Orientations" && <OrientationsTab />}
          {activeTab === "Remuneration" && <RemunerationTab remunerations={selectedTeacher.remunerations} employeeId={selectedTeacher.user?.employeeId} />}
          {activeTab === "Financial History" && (
            <DataTable columns={columns} data={filteredFinancialData} selectable={false} />
          )}
          {activeTab === "Documents" && (
            <DocumentsTab docs={instructorDocs} courseDocs={courseDocs} loading={docsLoading} />
          )}
        </div>
      </div>
    </div>
  );
};

const DOC_SECTIONS = [
  { key: "certificates", label: "Certificates" },
  { key: "profileVideos", label: "Profile Videos" },
  { key: "profilePictures", label: "Profile Pictures" },
];

const DocumentsTab = ({ docs, courseDocs, loading }) => {
  if (loading) return <p className="py-8 text-center text-sm text-slate-400">Loading documents…</p>;
  if (!docs) return <p className="py-8 text-center text-sm text-slate-400">No documents found.</p>;

  const { originalApplicationDocs } = docs;

  return (
    <div className="space-y-8 py-2">
      {/* Original application documents */}
      {originalApplicationDocs && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Original Application Documents</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Certificate / CV", path: originalApplicationDocs.relevantCertificate },
              { label: "Profile Video", path: originalApplicationDocs.profileVideo },
              { label: "Profile Picture", path: originalApplicationDocs.profilePicture },
            ].map(({ label, path }) => (
              <div key={label} className="rounded-[16px] border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-600">{label}</p>
                {path ? (
                  <a
                    href={resolveImageUrl(path)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-orange-600 hover:underline"
                  >
                    <FiFileText size={11} />
                    {path.split("/").pop()}
                  </a>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-400">Not provided</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Version history per document type */}
      {DOC_SECTIONS.map(({ key, label }) => {
        const history = docs[key] || [];
        if (history.length === 0) return null;
        return (
          <div key={key}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{label} History</p>
            <div className="overflow-hidden rounded-[16px] border border-slate-100">
              {[...history].reverse().map((entry, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 text-sm ${i !== 0 ? "border-t border-slate-100" : ""}`}>
                  {entry.isActive && (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      Active
                    </span>
                  )}
                  <a
                    href={resolveImageUrl(entry.filePath)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-1.5 truncate text-slate-700 hover:text-orange-600 hover:underline"
                  >
                    <FiFileText size={12} className="shrink-0" />
                    {entry.filePath.split("/").pop()}
                  </a>
                  <span className="ml-auto shrink-0 text-xs text-slate-400">
                    {new Date(entry.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Per-course media */}
      {courseDocs && courseDocs.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Course Media</p>
          <div className="space-y-4">
            {courseDocs.map((course) => {
              const activeVid = course.demoVideos?.find((v) => v.isActive);
              return (
                <div key={course.courseId} className="rounded-[16px] border border-slate-100 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-800">{course.courseName}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Demo videos */}
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Demo Videos</p>
                      {course.demoVideos?.length > 0 ? (
                        <ul className="space-y-1.5">
                          {[...course.demoVideos].reverse().map((v, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                              {v.isActive && (
                                <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Active</span>
                              )}
                              <a href={resolveImageUrl(v.filePath)} target="_blank" rel="noreferrer" className="min-w-0 truncate text-orange-600 hover:underline flex items-center gap-1">
                                <FiFileText size={11} className="shrink-0" />
                                {v.filePath?.split("/").pop()}
                              </a>
                              <span className="ml-auto shrink-0 text-slate-400">{new Date(v.uploadedAt).toLocaleDateString()}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400">No demo video uploaded</p>
                      )}
                    </div>
                    {/* Certificates */}
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Certificates</p>
                      {course.certificates?.length > 0 ? (
                        <ul className="space-y-1.5">
                          {course.certificates.map((c, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                              <a href={resolveImageUrl(c.filePath)} target="_blank" rel="noreferrer" className="min-w-0 truncate text-orange-600 hover:underline flex items-center gap-1">
                                <FiFileText size={11} className="shrink-0" />
                                {c.filePath?.split("/").pop()}
                              </a>
                              <span className="ml-auto shrink-0 text-slate-400">{new Date(c.uploadedAt).toLocaleDateString()}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400">No certificates uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorProfile;
