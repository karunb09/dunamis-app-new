import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTeacherById } from "../../../redux/Intructor/teacherSlice";
import { submitCourseRequest, fetchMyRequests } from "../../../redux/courseRequests/courseRequestSlice";
import { useCategoriesQuery } from "../../../hooks/useCategories";
import StudentTable from "./StudentTable";
import Curriculum from "./Curriculum";
import toast from "react-hot-toast";
import DynamicCourseIcon from "../../../components/DynamicCourseIcon";
import { resolveImageUrl } from "../../../utils/resolveImageUrl";
import { getStoredToken } from "../../../utils/authSession";
import { FiPlus, FiX, FiUpload, FiFileText, FiChevronLeft, FiChevronRight } from "react-icons/fi";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  mixed: "bg-sky-50 text-sky-700 ring-sky-200",
};

const emptyItem = () => ({ category: "", subCategory: "", videoFile: null });

const MyCourses = () => {
  const dispatch = useDispatch();
  const { selectedTeacher, loading, error } = useSelector((state) => state.teachers);
  const { myRequests, loading: reqLoading } = useSelector((state) => state.courseRequests);
  const { data: categoryData, isLoading: categoryLoading } = useCategoriesQuery();

  const [activeTab, setActiveTab] = useState("courses");
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Course media state (per-course demo video + certs)
  const [courseMedia, setCourseMedia] = useState({});
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(null);

  // Teacher-level documents (cert + profile video)
  const [docs, setDocs] = useState({ certificates: [], profileVideos: [] });
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState(null);

  // Request modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [requestType, setRequestType] = useState("single");
  const [courseItems, setCourseItems] = useState([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  const teacherId = JSON.parse(localStorage.getItem("user"))?.roleId;

  useEffect(() => {
    if (teacherId) {
      dispatch(fetchTeacherById(teacherId))
        .unwrap()
        .catch((err) => toast.error(typeof err === "string" ? err : err?.message || "Failed to load teacher data"));
    } else {
      toast.error("Teacher ID not found");
    }
  }, [dispatch, teacherId]);

  useEffect(() => {
    dispatch(fetchMyRequests()).unwrap().catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (!teacherId) return;
    setDocsLoading(true);
    fetch(`${BASE_URL}/teachers/${teacherId}/documents`, {
      headers: { Authorization: `Bearer ${getStoredToken()}` },
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setDocs(d.data); })
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, [teacherId]);

  const teacherData = selectedTeacher || {};
  const courses = teacherData?.courses || [];
  const students = teacherData?.students || [];

  useEffect(() => {
    if (courses.length > 0 && !selectedCourse) setSelectedCourse(courses[0]._id);
  }, [courses]);

  useEffect(() => {
    if (!selectedCourse) return;
    setMediaLoading(true);
    const token = getStoredToken();
    fetch(`${BASE_URL}/course/${selectedCourse}/instructor-media`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const myEntry = d.data.find((m) => m.teacher?._id === teacherId || m.teacher === teacherId);
          setCourseMedia((prev) => ({ ...prev, [selectedCourse]: myEntry || null }));
        }
      })
      .catch(() => {})
      .finally(() => setMediaLoading(false));
  }, [selectedCourse, teacherId]);

  const handleMediaUpload = async (type, file) => {
    if (!file || !selectedCourse) return;
    const fd = new FormData();
    fd.append(type, file);
    setUploadingMedia(type);
    try {
      const token = getStoredToken();
      const res = await fetch(`${BASE_URL}/course/${selectedCourse}/instructor-media`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setCourseMedia((prev) => ({ ...prev, [selectedCourse]: data.data }));
      toast.success(type === "demoVideo" ? "Demo video uploaded!" : "Certificate added!");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingMedia(null);
    }
  };

  const handleDocUpload = async (type, file) => {
    if (!file || !teacherId) return;
    const fd = new FormData();
    fd.append("type", type);
    fd.append("file", file);
    setUploadingDocType(type);
    try {
      const res = await fetch(`${BASE_URL}/teachers/${teacherId}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getStoredToken()}` },
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setDocs(data.data);
      toast.success("Document updated!");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingDocType(null);
    }
  };

  const getSelectedMonthlyFee = (priceArr) => {
    if (!Array.isArray(priceArr)) return 0;
    const sel = priceArr.find((p) => p.isSelected);
    return sel ? Number(sel.monthlyFee) : 0;
  };

  const getStudentsForCourse = (courseId) => {
    if (!Array.isArray(students)) return [];
    const catalogCourse = courses.find((c) => c._id === courseId);
    return students
      .map((s, i) => {
        const enrolled = s.courses?.find((c) => (c.id || c._id) === courseId);
        if (!enrolled) return null;
        const name = `${s.name?.firstName || ""} ${s.name?.lastName || ""}`.trim();
        return {
          id: s.id || s._id || `s-${i}`,
          avatar: s.studentDetails?.profilePicture
            ? resolveImageUrl(s.studentDetails.profilePicture)
            : `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`,
          name: name || "Unknown Student",
          course: catalogCourse?.name || "",
          category: catalogCourse?.category,
          mode: catalogCourse?.mode,
          progress: "0%",
          modules: "0 of 0",
          schedule: enrolled.schedule,
          sessionType: enrolled.schedule?.sessionType,
        };
      })
      .filter(Boolean);
  };

  // Modal helpers
  const openModal = () => { setModalStep(1); setRequestType("single"); setCourseItems([emptyItem()]); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); };

  const setItem = (idx, field, val) =>
    setCourseItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));

  const addItem = () => setCourseItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) => setCourseItems((prev) => prev.filter((_, i) => i !== idx));

  const publishedCategories = (categoryData?.categories || []).filter((c) => c.status === "published");
  const subCatsFor = (catId) => (categoryData?.subCategories || []).filter((s) => s.categoryId === catId);

  const step2Valid = courseItems.every((it) => it.category !== "");

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    const fd = new FormData();
    fd.append("requestType", requestType);
    fd.append(
      "courses",
      JSON.stringify(
        courseItems.map((item) => ({
          category: item.category,
          ...(item.subCategory && { subCategory: item.subCategory }),
        }))
      )
    );
    courseItems.forEach((item, i) => {
      if (item.videoFile) fd.append(`demoVideo_${i}`, item.videoFile);
    });
    try {
      await dispatch(submitCourseRequest(fd)).unwrap();
      toast.success("Course request submitted for admin review!");
      closeModal();
    } catch (err) {
      toast.error(err || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900" />
          <p className="mt-4 text-sm text-slate-500">Loading courses…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-rose-600">{error}</p>
          <button
            onClick={() => { if (teacherId) dispatch(fetchTeacherById(teacherId)); }}
            className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const selectedCourseData = courses.find((c) => c._id === selectedCourse);
  const currentMedia = selectedCourse ? courseMedia[selectedCourse] : null;

  return (
    <div className="min-h-screen bg-white p-2">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Instructor</p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-950">My Courses</h1>
        </div>
        {activeTab === "requests" && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
          >
            <FiPlus /> New Request
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[{ key: "courses", label: "My Courses" }, { key: "requests", label: "Course Requests" }, { key: "media", label: "Media & Credentials" }].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-[#FF6B35] text-white shadow-sm"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── MY COURSES TAB ── */}
      {activeTab === "courses" && (
        <>
          {courses.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
              <p className="text-sm font-medium text-slate-700">No courses assigned yet</p>
              <p className="mt-1 text-sm text-slate-400">Switch to Course Requests to request a new course.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {courses.map((course) => {
                  const isSelected = selectedCourse === course._id;
                  return (
                    <button
                      key={course._id}
                      type="button"
                      onClick={() => setSelectedCourse(course._id)}
                      className={`flex overflow-hidden rounded-[24px] border-2 text-left transition ${
                        isSelected ? "border-orange-300 shadow-sm" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <img
                        src={resolveImageUrl(course.image)}
                        alt={course.name}
                        className="h-28 w-2/5 shrink-0 object-cover"
                        onError={(e) => { e.target.src = "/music.png"; }}
                      />
                      <div className="flex flex-col justify-center p-4">
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                            <DynamicCourseIcon category={course.category} />
                            {course.category?.name || "Course"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                            {course.level || "Beginner"}
                          </span>
                        </div>
                        <h3 className="line-clamp-1 text-sm font-semibold text-slate-900">{course.name}</h3>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{course.description || "No description available"}</p>
                        <p className="mt-1 text-xs font-medium text-slate-600">₹{getSelectedMonthlyFee(course.price)}/month</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedCourseData && (
                <div className="space-y-6">
                  {/* Course overview card */}
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        <DynamicCourseIcon category={selectedCourseData.category} />
                        {selectedCourseData.category?.name || "Course"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">{selectedCourseData.level || "Beginner"}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">{selectedCourseData.mode || "Online"}</span>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedCourseData.name}</h2>
                    {selectedCourseData.description && (
                      <p className="mt-2 text-sm text-slate-500">{selectedCourseData.description}</p>
                    )}
                    {selectedCourseData.objectives?.length > 0 && (
                      <div className="mt-4">
                        <h3 className="mb-2 text-sm font-semibold text-slate-700">Learning Objectives</h3>
                        <ul className="space-y-1 text-sm text-slate-600">
                          {selectedCourseData.objectives.map((obj, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: "Total Students", value: getStudentsForCourse(selectedCourseData._id).length },
                        { label: "Course Fee", value: `₹${getSelectedMonthlyFee(selectedCourseData.price)}/mo` },
                        { label: "Modules", value: selectedCourseData.content?.[0]?.modules?.length || 0 },
                        { label: "Certification", value: selectedCourseData.certification === "certification" ? "Yes" : "No" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs text-slate-400">{item.label}</p>
                          <p className="mt-0.5 text-lg font-semibold text-slate-800">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <StudentTable
                    groupStudents={getStudentsForCourse(selectedCourseData._id).filter((s) => s.sessionType !== "premium")}
                    individualStudents={getStudentsForCourse(selectedCourseData._id).filter((s) => s.sessionType === "premium")}
                  />
                  <Curriculum modules={selectedCourseData.content?.[0]?.modules || []} />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── COURSE REQUESTS TAB ── */}
      {activeTab === "requests" && (
        <div>
          {reqLoading ? (
            <p className="text-sm text-slate-400">Loading requests…</p>
          ) : myRequests.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
              <p className="text-sm font-medium text-slate-700">No course requests yet</p>
              <p className="mt-1 text-sm text-slate-400">Click "New Request" to submit one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => (
                <div key={req._id} className="rounded-[20px] border border-slate-100 bg-white px-4 py-3">
                  <p className="mb-2 text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</p>
                  <div className="space-y-2">
                    {req.courses.map((c, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 rounded-[14px] bg-slate-50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-700">
                            {c.category?.name || "Category"}
                            {c.subCategory?.name ? ` — ${c.subCategory.name}` : ""}
                          </p>
                          {c.approvedCourseId?.name && (
                            <p className="mt-0.5 text-xs text-emerald-600">Assigned: {c.approvedCourseId.name}</p>
                          )}
                          {c.status === "rejected" && c.adminNotes && (
                            <p className="mt-0.5 text-xs text-rose-500">{c.adminNotes}</p>
                          )}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ${STATUS_BADGE[c.status] || STATUS_BADGE.pending}`}>
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MEDIA & CREDENTIALS TAB ── */}
      {activeTab === "media" && (
        <div className="space-y-6">
          {/* Part A: Teacher-level credentials */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Credentials & Media</p>
            <h2 className="mt-0.5 text-base font-semibold text-slate-900">My Documents</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Upload a new version to make it active. All previous versions are kept for admin review.
            </p>
            {docsLoading ? (
              <p className="mt-4 text-sm text-slate-400">Loading documents…</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Certificate */}
                {(() => {
                  const history = docs.certificates || [];
                  const active = history.find((h) => h.isActive);
                  return (
                    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-800">Certificate</p>
                      {active ? (
                        <a
                          href={resolveImageUrl(active.filePath)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 flex items-center gap-1.5 truncate text-xs text-orange-600 hover:underline"
                        >
                          <FiFileText size={11} />
                          {active.filePath.split("/").pop()}
                        </a>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">No file uploaded yet</p>
                      )}
                      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
                        <FiUpload size={11} />
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => handleDocUpload("certificate", e.target.files[0])}
                        />
                        {uploadingDocType === "certificate" ? "Uploading…" : "Update"}
                      </label>
                      {history.length > 1 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600">
                            History ({history.length})
                          </summary>
                          <ul className="mt-2 space-y-1.5">
                            {[...history].reverse().map((entry, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                {entry.isActive && (
                                  <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Active</span>
                                )}
                                <a href={resolveImageUrl(entry.filePath)} target="_blank" rel="noreferrer" className="min-w-0 truncate hover:underline">
                                  {entry.filePath.split("/").pop()}
                                </a>
                                <span className="ml-auto shrink-0 text-slate-400">{new Date(entry.uploadedAt).toLocaleDateString()}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  );
                })()}

                {/* Profile Video */}
                {(() => {
                  const history = docs.profileVideos || [];
                  const active = history.find((h) => h.isActive);
                  return (
                    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-800">Profile Video</p>
                      {active ? (
                        <video
                          key={active.filePath}
                          controls
                          className="mt-2 w-full rounded-xl"
                          src={resolveImageUrl(active.filePath)}
                        />
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">No profile video uploaded yet</p>
                      )}
                      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
                        <FiUpload size={11} />
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => handleDocUpload("profileVideo", e.target.files[0])}
                        />
                        {uploadingDocType === "profileVideo" ? "Uploading…" : "Update"}
                      </label>
                      {history.length > 1 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600">
                            History ({history.length})
                          </summary>
                          <ul className="mt-2 space-y-1.5">
                            {[...history].reverse().map((entry, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                {entry.isActive && (
                                  <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Active</span>
                                )}
                                <a href={resolveImageUrl(entry.filePath)} target="_blank" rel="noreferrer" className="min-w-0 truncate hover:underline">
                                  {entry.filePath.split("/").pop()}
                                </a>
                                <span className="ml-auto shrink-0 text-slate-400">{new Date(entry.uploadedAt).toLocaleDateString()}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Part B: Per-course demo videos & certificates */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Course Media</p>
            <h2 className="mt-0.5 text-base font-semibold text-slate-900">My Course Demo Videos & Certificates</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Per-course media shown publicly on the course listing page. Upload a new demo video to replace the active one.
            </p>

            {courses.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No courses assigned yet.</p>
            ) : (
              <>
                {/* Course pill tabs */}
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {courses.map((course) => (
                    <button
                      key={course._id}
                      onClick={() => setSelectedCourse(course._id)}
                      className={`shrink-0 rounded-2xl border px-3 py-1.5 text-sm font-medium transition ${
                        selectedCourse === course._id
                          ? "border-orange-300 bg-orange-50 text-orange-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {course.name}
                    </button>
                  ))}
                </div>

                {mediaLoading ? (
                  <p className="mt-4 text-sm text-slate-400">Loading media…</p>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {/* Demo Video */}
                    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-800">Demo Video</p>
                      {(() => {
                        const activeVideo = currentMedia?.demoVideos?.find((v) => v.isActive);
                        const history = currentMedia?.demoVideos || [];
                        return (
                          <>
                            {activeVideo ? (
                              <video
                                key={activeVideo.filePath}
                                controls
                                className="mt-2 w-full rounded-xl"
                                src={resolveImageUrl(activeVideo.filePath)}
                              />
                            ) : (
                              <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-400">
                                No course video yet. Your profile video shows until you upload one.
                              </div>
                            )}
                            {history.length > 1 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600">
                                  History ({history.length})
                                </summary>
                                <ul className="mt-1.5 space-y-1">
                                  {[...history].reverse().map((v, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                      {v.isActive && (
                                        <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Active</span>
                                      )}
                                      <a href={resolveImageUrl(v.filePath)} target="_blank" rel="noreferrer" className="min-w-0 truncate hover:underline text-orange-600">
                                        {v.filePath?.split("/").pop()}
                                      </a>
                                      <span className="ml-auto shrink-0 text-slate-400">{new Date(v.uploadedAt).toLocaleDateString()}</span>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </>
                        );
                      })()}
                      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
                        <FiUpload size={11} />
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => handleMediaUpload("demoVideo", e.target.files[0])}
                        />
                        {uploadingMedia === "demoVideo" ? "Uploading…" : currentMedia?.demoVideos?.find((v) => v.isActive) ? "Replace Video" : "Upload Video"}
                      </label>
                    </div>

                    {/* Certificates */}
                    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-800">Certificates</p>
                      {currentMedia?.certificates?.length > 0 ? (
                        <ul className="mt-2 space-y-1.5">
                          {currentMedia.certificates.map((c, i) => {
                            const path = typeof c === "string" ? c : c.filePath;
                            const date = c?.uploadedAt;
                            return (
                              <li key={i} className="flex items-center gap-1.5">
                                <a
                                  href={resolveImageUrl(path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex min-w-0 items-center gap-1.5 text-xs text-orange-600 hover:underline truncate"
                                >
                                  <FiFileText size={11} />
                                  {path?.split("/").pop()}
                                </a>
                                {date && <span className="ml-auto shrink-0 text-[10px] text-slate-400">{new Date(date).toLocaleDateString()}</span>}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">No certificates uploaded yet</p>
                      )}
                      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
                        <FiPlus size={12} />
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => handleMediaUpload("certificates", e.target.files[0])}
                        />
                        {uploadingMedia === "certificates" ? "Uploading…" : "Add Certificate"}
                      </label>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── REQUEST MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-t-[32px] bg-white p-6 sm:rounded-[32px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {modalStep === 1 && "Request Type"}
                {modalStep === 2 && "Select Courses"}
                {modalStep === 3 && "Upload Demo Videos"}
              </h2>
              <button onClick={closeModal} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <FiX size={18} />
              </button>
            </div>

            {/* Step dots */}
            <div className="mb-5 flex gap-2">
              {[1, 2, 3].map((s) => (
                <span key={s} className={`h-1.5 flex-1 rounded-full ${s <= modalStep ? "bg-[#FF6B35]" : "bg-slate-200"}`} />
              ))}
            </div>

            {/* Step 1: Single / Multiple */}
            {modalStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">Are you requesting one course or multiple?</p>
                <div className="grid grid-cols-2 gap-3">
                  {["single", "multiple"].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setRequestType(type);
                        if (type === "single") setCourseItems([emptyItem()]);
                      }}
                      className={`rounded-2xl border-2 py-4 text-sm font-semibold capitalize transition ${
                        requestType === type ? "border-[#FF6B35] bg-orange-50 text-[#FF6B35]" : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {type === "single" ? "Single Course" : "Multiple Courses"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Category + Subcategory per course */}
            {modalStep === 2 && (
              <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                {courseItems.map((item, idx) => (
                  <div key={idx} className="rounded-[20px] border border-slate-100 bg-slate-50 p-4">
                    {requestType === "multiple" && (
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Course {idx + 1}</span>
                        {courseItems.length > 1 && (
                          <button onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-600">
                            <FiX size={14} />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <select
                        value={item.category}
                        onChange={(e) => { setItem(idx, "category", e.target.value); setItem(idx, "subCategory", ""); }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">Select category</option>
                        {publishedCategories.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                      {item.category && (
                        <select
                          value={item.subCategory}
                          onChange={(e) => setItem(idx, "subCategory", e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        >
                          <option value="">Select subcategory (optional)</option>
                          {subCatsFor(item.category).map((s) => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
                {requestType === "multiple" && (
                  <button
                    onClick={addItem}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-orange-300 py-3 text-sm font-medium text-orange-500 hover:bg-orange-50"
                  >
                    <FiPlus size={14} /> Add Another Course
                  </button>
                )}
                {categoryLoading && <p className="text-xs text-slate-400">Loading categories…</p>}
              </div>
            )}

            {/* Step 3: Demo video upload per course */}
            {modalStep === 3 && (
              <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                <p className="text-sm text-slate-500">Optionally upload a short demo video for each requested course.</p>
                {courseItems.map((item, idx) => {
                  const catName = publishedCategories.find((c) => c._id === item.category)?.name || `Course ${idx + 1}`;
                  return (
                    <div key={idx} className="rounded-[20px] border border-slate-100 bg-slate-50 p-4">
                      <p className="mb-2 text-sm font-medium text-slate-700">{catName}</p>
                      <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                        <FiUpload size={14} />
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => setItem(idx, "videoFile", e.target.files[0])}
                        />
                        {item.videoFile ? item.videoFile.name : "Choose video (optional)"}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-6 flex gap-3">
              {modalStep > 1 && (
                <button
                  onClick={() => setModalStep((s) => s - 1)}
                  className="flex items-center gap-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FiChevronLeft size={15} /> Back
                </button>
              )}
              <button
                onClick={closeModal}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (modalStep < 3) setModalStep((s) => s + 1);
                  else handleSubmitRequest();
                }}
                disabled={modalStep === 2 && !step2Valid || submitting}
                className="ml-auto flex items-center gap-1 rounded-2xl bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {modalStep < 3 ? (
                  <>Next <FiChevronRight size={15} /></>
                ) : submitting ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;
