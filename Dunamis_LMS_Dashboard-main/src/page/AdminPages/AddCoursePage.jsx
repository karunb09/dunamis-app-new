import React, { useState, useEffect } from "react";
import CourseInfoForm from "./CourseForms/CourseInfoForm";
import CourseInstructorsForm from "./CourseForms/CourseInstructorForm";
import CoursePricingForm from "./CourseForms/CoursePricingForm";
import CourseContentForm from "./CourseForms/CourseContentForm";
import CourseMediaForm from "./CourseForms/CourseMediaForm";
import { useNavigate, useParams } from "react-router-dom";
import { useCourseDetailsQuery, useCreateCourse, useUpdateCourse } from "../../hooks/useCourses";
import toast from "react-hot-toast";

const AddCoursePage = () => {
    const tabs = ["Course Info", "Instructors", "Pricing", "Content", "Media"];
    const [activeTab, setActiveTab] = useState(tabs[0]);

    const { courseId } = useParams();
    const navigate = useNavigate();

    const createCourseMutation = useCreateCourse();
    const updateCourseMutation = useUpdateCourse();
    // Edit mode loads the course detail from the query cache (replaces the slice).
    const { data: passedCourseData = {} } = useCourseDetailsQuery(courseId);
    const isSubmitting = createCourseMutation.isPending || updateCourseMutation.isPending;

    const formatDateForInput = (isoDate) => {
        if (!isoDate) return "";
        const date = new Date(isoDate);
        if (isNaN(date)) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const resolveInstallments = (pricingItem) => {
        const raw =
            pricingItem?.installments ??
            pricingItem?.totalInstallments ??
            pricingItem?.total_installments;
        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 6;
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
                totalInstallments: 6,
            },
            premium: {
                enabled: false,
                monthlyFee: "",
                fullPayment: "",
                discount: "",
                totalInstallments: 6,
            },
        },
        objectives: [],
        branches: [],
        content: [],
        media: null,
        existingImage: null,
        initialImage: null,
    });

    useEffect(() => {
        return () => {
            localStorage.removeItem("selectedCourseId");
        };
    }, []);

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
                        standard: { enabled: false, monthlyFee: "", fullPayment: "", discount: "", totalInstallments: 6 },
                        premium: { enabled: false, monthlyFee: "", fullPayment: "", discount: "", totalInstallments: 6 },
                    };
                    (passedCourseData.price || []).forEach((p) => {
                        if (pricing[p.sessionType]) {
                            pricing[p.sessionType] = {
                                enabled: true,
                                monthlyFee: p.monthlyFee || "",
                                fullPayment: p.fullPayment || "",
                                discount: p.discount || "",
                                totalInstallments: resolveInstallments(p),
                                installments: resolveInstallments(p),
                                tenurePlans: Array.isArray(p.tenurePlans) ? p.tenurePlans : [],
                                customPlans: Array.isArray(p.customPlans) ? p.customPlans : [],
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
                initialImage: passedCourseData.image || null,
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

    const firstInvalidPricingMessage = () => {
        const enabledPricing = Object.entries(courseData.pricing || {}).filter(
            ([, session]) => session.enabled
        );

        if (enabledPricing.length === 0) {
            return "Enable at least one pricing option";
        }

        for (const [type, session] of enabledPricing) {
            const label = type === "standard" ? "standard" : "premium";
            const monthlyFee = Number(session.monthlyFee);
            const fullPayment = Number(session.fullPayment);
            const installments = Number(session.totalInstallments ?? session.installments);

            if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) {
                return `Monthly fee is required for ${label} pricing`;
            }

            if (!Number.isFinite(fullPayment) || fullPayment <= 0) {
                return `Full payment is required for ${label} pricing`;
            }

            if (!Number.isInteger(installments) || installments <= 0) {
                return `Installments must be a positive number for ${label} pricing`;
            }

            // Incomplete offers are dropped by the payload mapper — say so
            // rather than letting the admin's work disappear on save.
            const offers = Array.isArray(session.customPlans) ? session.customPlans : [];
            for (const offer of offers) {
                const name = String(offer.name || "").trim();
                const price = Number(offer.fullPayment);
                if (!name) {
                    return `Every ${label} special offer needs a name`;
                }
                if (!Number.isFinite(price) || price <= 0) {
                    return `"${name}" needs a price above 0`;
                }
            }
        }

        return "";
    };

    const validateCourse = ({ isPublished }) => {
        const info = courseData.info || {};
        const requiredFields = [
            [info.courseCode, "Course Code is required", "Course Info"],
            [info.name, "Course Name is required", "Course Info"],
        ];

        if (isPublished) {
            requiredFields.push(
                [info.description, "Course Description is required", "Course Info"],
                [info.mode, "Course Mode is required", "Course Info"],
                [info.courseType, "Course Type is required", "Course Info"],
                [info.level, "Course Level is required", "Course Info"],
                [info.certification, "Certification type is required", "Course Info"],
                [courseData.media || courseData.existingImage, "Course Image is required", "Media"]
            );

            if (info.courseType === "fixed") {
                requiredFields.push(
                    [info.startDate, "Start Date is required for fixed courses", "Course Info"],
                    [info.endDate, "End Date is required for fixed courses", "Course Info"]
                );

                if (info.startDate && info.endDate && new Date(info.endDate) < new Date(info.startDate)) {
                    toast.error("End Date cannot be before Start Date");
                    setActiveTab("Course Info");
                    return false;
                }
            }

            if (info.mode === "offline" && (!Array.isArray(courseData.branches) || courseData.branches.length === 0)) {
                toast.error("At least one branch is required for offline courses");
                setActiveTab("Course Info");
                return false;
            }

            const pricingMessage = firstInvalidPricingMessage();
            if (pricingMessage) {
                toast.error(pricingMessage);
                setActiveTab("Pricing");
                return false;
            }
        }

        const missingField = requiredFields.find(([value]) => {
            if (value instanceof File) return false;
            return !String(value || "").trim();
        });

        if (missingField) {
            toast.error(missingField[1]);
            setActiveTab(missingField[2]);
            return false;
        }

        return true;
    };

    const saveCourse = async ({ isPublished }) => {
        const selectedInstructors = Array.isArray(courseData.instructors)
            ? courseData.instructors
            : [];

        if (!validateCourse({ isPublished })) {
            return;
        }

        let payload = {
            name: courseData.info.name.trim(),
            code: courseData.info.courseCode.trim(),
            description: courseData.info.description?.trim() || "",
            category: courseData.info.category,
            subCategory: courseData.info.subCategory,
            mode: courseData.info.mode,
            level: courseData.info.level,
            certification: courseData.info.certification,
            courseType: courseData.info.courseType,
            startDate: courseData.info.startDate || null,
            endDate: courseData.info.endDate || null,
            teacher: selectedInstructors.map((instructor) => instructor.value),
            branches: Array.isArray(courseData.branches) && courseData.branches.length > 0
                ? courseData.branches.map(b => b.value || b)
                : [],
            price: Object.entries(courseData.pricing || {})
                .filter(([, session]) => session.enabled)
                .map(([type, session]) => ({
                    sessionType: type,
                    monthlyFee: parseFloat(session.monthlyFee) || 0,
                    fullPayment: parseFloat(session.fullPayment) || 0,
                    discount: parseFloat(session.discount) || 0,
                    totalInstallments: parseInt(session.totalInstallments ?? session.installments, 10) || 1,
                    installments: parseInt(session.totalInstallments ?? session.installments, 10) || 1,
                    isActive: true,
                    isSelected: type === "standard",
                    tenurePlans: (Array.isArray(session.tenurePlans) ? session.tenurePlans : []).map((plan) => ({
                        months: parseInt(plan.months, 10) || 0,
                        monthlyFee: parseFloat(plan.monthlyFee) || 0,
                        discount: parseFloat(plan.discount) || 0,
                        fullPayment: parseFloat(plan.fullPayment) || 0,
                        isActive: plan.isActive ?? true,
                    })).filter((plan) => plan.months > 0),
                    // _id must survive: it is how the enroll flow and paid
                    // transactions reference a specific offer.
                    customPlans: (Array.isArray(session.customPlans) ? session.customPlans : []).map((plan) => ({
                        ...(plan._id ? { _id: plan._id } : {}),
                        name: String(plan.name || "").trim(),
                        description: String(plan.description || "").trim(),
                        fullPayment: parseFloat(plan.fullPayment) || 0,
                        originalPrice: parseFloat(plan.originalPrice) || null,
                        durationMonths: parseInt(plan.durationMonths, 10) || null,
                        perks: Array.isArray(plan.perks) ? plan.perks : [],
                        isActive: plan.isActive ?? true,
                    })).filter((plan) => plan.name && plan.fullPayment > 0),
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
        if (
            courseId &&
            !courseData.media &&
            !courseData.existingImage &&
            courseData.initialImage
        ) {
            formData.append("removeImage", "true");
        }

        try {
            if (courseId) {
                formData.append("_id", courseId);
                await updateCourseMutation.mutateAsync({ courseId, updates: formData });
            } else {
                await createCourseMutation.mutateAsync(formData);
            }
            localStorage.setItem(
                "activeTab",
                isPublished ? "Active Courses" : "Draft Courses"
            );
            toast.success(isPublished ? "Course saved successfully" : "Course draft saved successfully");
            navigate("/admin/course-management");
        } catch (err) {
            toast.error(err?.message || "Course save failed.");
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
                    onRemoveExistingImage={() =>
                        setCourseData((prevData) => ({
                            ...prevData,
                            existingImage: null,
                        }))
                    }
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

            <div className="col-span-full flex flex-wrap justify-between gap-3 mt-6">
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
                            disabled={isSubmitting}
                            className={`px-4 py-2 rounded-2xl text-white ${isSubmitting ? "bg-gray-300 cursor-not-allowed" : "bg-black hover:bg-gray-900"
                                }`}
                        >
                            {isSubmitting ? "Submitting..." : "Submit Course"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddCoursePage;
