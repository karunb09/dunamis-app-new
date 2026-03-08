import React, { useState, useEffect } from "react";
import CourseInfoForm from "./CourseForms/CourseInfoForm";
import CourseInstructorsForm from "./CourseForms/CourseInstructorForm";
import CoursePricingForm from "./CourseForms/CoursePricingForm";
import CourseContentForm from "./CourseForms/CourseContentForm";
import CourseMediaForm from "./CourseForms/CourseMediaForm";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createCourse, updateCourse, getCourseDetails } from "../../redux/Course/CourseSlice";
import toast from "react-hot-toast";

const AddCoursePage = () => {
    const tabs = ["Course Info", "Instructors", "Pricing", "Content", "Media"];
    const [activeTab, setActiveTab] = useState(tabs[0]);

    const { courseId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const passedCourseData = useSelector((state) => state.course.course.info);
    const status = useSelector((state) => state.course.status);

    const formatDateForInput = (isoDate) => {
        if (!isoDate) return "";
        const date = new Date(isoDate);
        if (isNaN(date)) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const [courseData, setCourseData] = useState({
        info: {},
        instructors: [],
        pricing: {
            standard: {
                enabled: false,
                monthlyFee: "",
                fullPayment: "",
                discount: "",
                totalInstallments: 1,
            },
            premium: {
                enabled: false,
                monthlyFee: "",
                fullPayment: "",
                discount: "",
                totalInstallments: 1,
            },
        },
        objectives: [],
        branches: [],
        content: [],
        media: null,
        existingImage: null,
    });

    useEffect(() => {
        if (courseId) {
            dispatch(getCourseDetails(courseId));
        }
        return () => {
            localStorage.removeItem("selectedCourseId");
        };
    }, [courseId, dispatch]);

    useEffect(() => {
        if (passedCourseData && Object.keys(passedCourseData).length > 0) {
            const rawBranches = passedCourseData.branches || [];
            const mappedBranches = rawBranches.map((b) => ({
                label: b?.branchName || "Branch",
                value: b?._id || b,
            }));

            const subCategoryId =
                Array.isArray(passedCourseData.subCategory) && passedCourseData.subCategory.length > 0
                    ? passedCourseData.subCategory[0]._id
                    : (passedCourseData.subCategory?._id || "");

            setCourseData({
                info: {
                    name: passedCourseData.name || "",
                    courseCode: passedCourseData.code || "",
                    certification: passedCourseData.certification || "",
                    startDate: formatDateForInput(passedCourseData.startDate),
                    endDate: formatDateForInput(passedCourseData.endDate),
                    mode: passedCourseData.mode || "",
                    level: passedCourseData.level || "",
                    category: passedCourseData.category?._id || "",
                    subCategory: subCategoryId,
                    courseType: passedCourseData.courseType || "",
                    description: passedCourseData.description || "",
                },
                instructors: (passedCourseData.teacher || []).map((t) => ({
                    label: `${t?.teacherDetail?.name?.firstName || ""} ${t?.teacherDetail?.name?.lastName || ""}`.trim(),
                    value: t?._id,
                })),
                pricing: (() => {
                    const pricing = {
                        standard: { enabled: false, monthlyFee: "", fullPayment: "", discount: "", totalInstallments: 1 },
                        premium: { enabled: false, monthlyFee: "", fullPayment: "", discount: "", totalInstallments: 1 },
                    };
                    (passedCourseData.price || []).forEach((p) => {
                        if (pricing[p.sessionType]) {
                            pricing[p.sessionType] = {
                                enabled: true,
                                monthlyFee: p.monthlyFee || "",
                                fullPayment: p.fullPayment || "",
                                discount: p.discount || "",
                                totalInstallments: p.totalInstallments || 1,
                            };
                        }
                    });
                    return pricing;
                })(),

                branches: mappedBranches,
                objectives: passedCourseData.objectives || [],
                content: passedCourseData.content || [],
                media: null,
                existingImage: passedCourseData.image || null,
            });
        }
    }, [passedCourseData]);

    const handleNext = () => {
        const currentIndex = tabs.indexOf(activeTab);
        if (currentIndex < tabs.length - 1) {
            setActiveTab(tabs[currentIndex + 1]);
        }
    };

    const handleCancel = () => {
        navigate("/admin/course-management");
    };

    const handleUpdateFormData = (newData, key) => {
        if (key === "media") {
            if (newData !== null && !(newData instanceof File)) {
                toast.error("Invalid image file format");
                return;
            }
        }

        setCourseData((prevData) => ({
            ...prevData,
            [key]: newData,
        }));
    };

    const saveCourse = async ({ isPublished }) => {
        if (!courseData.info.courseCode || courseData.info.courseCode.trim() === "") {
            toast.error("Course Code is required");
            return;
        }

        if (!courseData.info.name || courseData.info.name.trim() === "") {
            toast.error("Course Name is required");
            return;
        }

        let payload = {
            name: courseData.info.name,
            code: courseData.info.courseCode,
            description: courseData.info.description || "",
            category: courseData.info.category,
            subCategory: courseData.info.subCategory,
            mode: courseData.info.mode,
            level: courseData.info.level,
            certification: courseData.info.certification,
            courseType: courseData.info.courseType,
            startDate: courseData.info.startDate || null,
            endDate: courseData.info.endDate || null,
            teacher: courseData.instructors.map((i) => i.value),
            branches: Array.isArray(courseData.branches) && courseData.branches.length > 0
                ? courseData.branches.map(b => b.value || b)
                : [],
            price: Object.entries(courseData.pricing || {})
                .filter(([_, session]) => session.enabled)
                .map(([type, session]) => ({
                    sessionType: type,
                    monthlyFee: parseFloat(session.monthlyFee) || 0,
                    fullPayment: parseFloat(session.fullPayment) || 0,
                    discount: parseFloat(session.discount) || 0,
                    totalInstallments: parseInt(session.totalInstallments, 10) || 1,
                    isActive: true,
                    isSelected: type === "standard",
                })),
            content: Array.isArray(courseData.content) && courseData.content.length > 0
                ? courseData.content.map(c => c._id || c)
                : [],
            objectives: Array.isArray(courseData.objectives) ? courseData.objectives : [],
            isPublished,
        };

        const formData = new FormData();

        // Append regular fields
        Object.entries(payload).forEach(([key, value]) => {
            if (["teacher", "price", "content", "objectives", "branches"].includes(key)) {
                formData.append(key, JSON.stringify(value ?? []));
            } else if (value === null) {
                formData.append(key, "");
            } else {
                formData.append(key, value ?? "");
            }
        });
        if (courseData.media instanceof File) {
            formData.append("image", courseData.media);
        }

        let resultAction;

        if (courseId) {
            formData.append("_id", courseId);
            resultAction = await dispatch(updateCourse({ courseId, updates: formData }));
        } else {
            resultAction = await dispatch(createCourse(formData));
        }

        if (
            (courseId && updateCourse.fulfilled.match(resultAction)) ||
            (!courseId && createCourse.fulfilled.match(resultAction))
        ) {
            localStorage.setItem(
                "activeTab",
                isPublished ? "Active Courses" : "Draft Courses"
            );
            toast.success(isPublished ? "Course saved successfully" : "Course draft saved successfully");
            navigate("/admin/course-management");
        } else {
            const errorMsg = resultAction?.payload?.message || "Course save failed.";
            toast.error(errorMsg);
        }
    };

    const handleSaveDraft = async () => {
        await saveCourse({ isPublished: false });
    };

    const handleSubmit = async () => {
        await saveCourse({ isPublished: true });
    };

    const renderTabContent = () => (
        <>
            <div style={{ display: activeTab === "Course Info" ? "block" : "none" }}>
                <CourseInfoForm
                    courseInfo={courseData.info}
                    setCourseInfo={(info) => handleUpdateFormData(info, "info")}
                    setContent={(content) => handleUpdateFormData(content, "content")}
                    branches={courseData.branches}
                    setBranches={(branches) => handleUpdateFormData(branches, "branches")}
                />
            </div>
            <div style={{ display: activeTab === "Instructors" ? "block" : "none" }}>
                <CourseInstructorsForm
                    instructors={courseData.instructors}
                    setInstructors={(instructors) => handleUpdateFormData(instructors, "instructors")}
                    selectedMode={courseData.info.mode}
                />
            </div>
            <div style={{ display: activeTab === "Pricing" ? "block" : "none" }}>
                <CoursePricingForm
                    pricing={courseData.pricing}
                    setPricing={(pricing) => handleUpdateFormData(pricing, "pricing")}
                />
            </div>
            <div style={{ display: activeTab === "Content" ? "block" : "none" }}>
                <CourseContentForm content={courseData} setContent={setCourseData} />
            </div>
            <div style={{ display: activeTab === "Media" ? "block" : "none" }}>
                <CourseMediaForm
                    media={courseData.media}
                    setMedia={(media) => handleUpdateFormData(media, "media")}
                    existingImage={courseData.existingImage}
                />
            </div>
        </>
    );

    return (
        <div className="p-6 bg-white rounded shadow">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-gray-800">
                    {courseId ? "Edit Course" : "Create New Course"}
                </h1>
            </div>

            <div className="flex border-b mb-4 gap-4 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-2 px-4 text-sm whitespace-nowrap border-b-2 ${activeTab === tab
                                ? "border-gray-800 text-gray-800 font-medium"
                                : "border-transparent text-gray-500"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div>{renderTabContent()}</div>

            <div className="col-span-full flex justify-between mt-6">
                <button onClick={handleCancel} className="px-4 py-2 border bg-gray-50 rounded-2xl hover:bg-gray-100">
                    Cancel
                </button>

                <div className="flex gap-2">
                    <button
                        onClick={handleSaveDraft}
                        className="px-4 py-2 border bg-gray-50 rounded-2xl hover:bg-gray-100"
                    >
                        Save Draft
                    </button>

                    {activeTab !== tabs[tabs.length - 1] ? (
                        <button
                            onClick={handleNext}
                            className="px-4 py-2 rounded-2xl text-white bg-black hover:bg-gray-800"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={status === "loading"}
                            className={`px-4 py-2 rounded-2xl text-white ${status === "loading" ? "bg-gray-300 cursor-not-allowed" : "bg-black hover:bg-gray-900"
                                }`}
                        >
                            {status === "loading" ? "Submitting..." : "Submit Course"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddCoursePage;
