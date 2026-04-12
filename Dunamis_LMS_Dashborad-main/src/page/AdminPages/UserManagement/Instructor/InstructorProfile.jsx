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
} from "react-icons/fi";
import { FaMusic, FaLanguage, FaPersonBooth } from "react-icons/fa";
import toast from "react-hot-toast";

import DataTable from "../../../../components/Table";
import EditInstructorModal from "./EditInstructorModal";
import CoursesTab from "./TabContent/CoursesTab";
import ScheduleTab from "./TabContent/ScheduleTab";
import StudentsTab from "./TabContent/StudentsTab";
import ReviewsTab from "./TabContent/ReviewsTab";
import OrientationsTab from "./TabContent/Orientationstab";
import RemunerationTab from "./TabContent/RemunerationTab";
import { fetchTeacherById, updateTeacher } from "../../../../redux/Intructor/teacherSlice";
import { DEFAULT_AVATAR, resolveImageUrl } from "../../../../utils/resolveImageUrl";

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

  const tabs = ["Courses", "Schedule", "Students", "Reviews", "Orientations", "Remuneration", "Financial History"];

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex items-start gap-4 w-full">
          <img
            src={instructorAvatar}
            alt={instructor.name?.firstName}
            className="w-28 h-28 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold leading-tight">{`${instructor.name?.firstName} ${instructor.name?.lastName}`}</h1>
                <p className="text-sm text-gray-600 mt-1">{instructor.areaOfExpertise || "Instructor"}</p>

                <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-3">
                  <span className="flex items-center gap-2">
                    <FiMapPin className="text-xl text-gray-500" />
                    <span>{instructor.currentAddress || "—"}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <FiMail className="text-xl text-gray-500" />
                    <span>{selectedTeacher.user?.email || "—"}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <FiPhone className="text-xl text-gray-500" />
                    <span>{selectedTeacher.user?.mobileNo || "—"}</span>
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <span className="px-2 py-1 bg-blue-100 text-blue-600 text-sm rounded-full">
                    {instructor.areaOfExpertise}
                  </span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-600 text-sm rounded-full flex items-center gap-1">
                    <FiWifi className="text-lg" /> {instructor.mode}
                  </span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-600 text-sm rounded-full flex items-center gap-1">
                    <FiStar className="text-lg text-orange-400" /> {selectedTeacher.averageRating || 0}
                  </span>
                </div>

                {instructor.bio && <p className="mt-3 text-sm text-gray-600 max-w-xl">{instructor.bio}</p>}

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-2">
                    <FiBriefcase className="text-lg" /> {selectedTeacher.teacherDetails?.yearOfExperience} years of experience
                  </span>

                  <span className="flex items-center gap-2">
                    <FiCalendar className="text-lg" /> Joined: {formattedDate}
                  </span>
                  <span className="flex items-center gap-2">
                    <FiBookOpen className="text-lg" /> {selectedTeacher.courses?.length} active courses
                  </span>
                </div>
              </div>

              {/* Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((s) => !s)}
                  className="p-2 rounded-full hover:bg-gray-100"
                  aria-label="open menu"
                >
                  <FiMoreHorizontal className="text-2xl text-gray-600" />
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-cyan-50 border border-cyan-200 p-6 rounded-xl shadow-sm text-center flex flex-col items-center gap-2">
          <FiUsers className="text-3xl text-cyan-600" />
          <p className="text-2xl font-bold">{selectedTeacher.studentCount}</p>
          <p className="text-gray-500">Total Students</p>
        </div>

        <div className="bg-cyan-50 border border-cyan-200 p-6 rounded-xl shadow-sm text-center flex flex-col items-center gap-2">
          <FiBookOpen className="text-3xl text-cyan-600" />
          <p className="text-2xl font-bold">{selectedTeacher.courses?.length}</p>
          <p className="text-gray-500">Active Courses</p>
        </div>

        <div className="bg-cyan-50 border border-cyan-200 p-6 rounded-xl shadow-sm text-center flex flex-col items-center gap-2">
          <FiBriefcase className="text-3xl text-cyan-600" />
          <p className="text-2xl font-bold">{selectedTeacher.teacherDetails?.yearOfExperience}</p>
          <p className="text-gray-500">Experience (yrs)</p>
        </div>

        <div className="bg-cyan-50 border border-cyan-200 p-6 rounded-xl shadow-sm text-center flex flex-col items-center gap-2">
          <FiCalendar className="text-3xl text-cyan-600" />
          <p className="text-2xl font-bold">{formattedDate}</p>
          <p className="text-gray-500">Joining Date</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t pt-4">
        <div className="flex border-b mb-4 space-x-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm whitespace-nowrap ${activeTab === tab ? "border-b-2 border-black font-semibold" : "text-gray-500 hover:text-black"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Courses" && <CoursesTab instructor={selectedTeacher} categoryConfig={categoryConfig} />}
        {activeTab === "Schedule" && <ScheduleTab teacher={selectedTeacher} />}
        {activeTab === "Students" && <StudentsTab instructor={selectedTeacher} />}
        {activeTab === "Reviews" && <ReviewsTab instructor={selectedTeacher} />}
        {activeTab === "Orientations" && <OrientationsTab />}
        {activeTab === "Remuneration" && <RemunerationTab remunerations={selectedTeacher.remunerations} />}
        {activeTab === "Financial History" && (
          <DataTable columns={columns} data={filteredFinancialData} selectable={false} />
        )}
      </div>
    </div>
  );
};

export default InstructorProfile;
