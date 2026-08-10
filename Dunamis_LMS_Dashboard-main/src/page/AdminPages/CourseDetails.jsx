import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaBookOpen, FaClock, FaEdit, FaMapMarkerAlt, FaRupeeSign, FaUsers } from "react-icons/fa";
import { FiCheckCircle } from "react-icons/fi";
import { useCourseDetailsQuery } from "../../hooks/useCourses";
import { DEFAULT_AVATAR, resolveImageUrl } from "../../utils/resolveImageUrl";

const DEFAULT_COURSE_IMAGE = "https://placehold.co/960x540?text=Course";
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : "Not set");

const toDisplayText = (value) => {
    const text = String(value || "").trim();
    return OBJECT_ID_PATTERN.test(text) ? "" : text;
};

const getBranchName = (branch) => {
    if (!branch || typeof branch !== "object") return "Branch";
    return (
        toDisplayText(branch.branchName) ||
        toDisplayText(branch.name) ||
        toDisplayText(branch.label) ||
        "Branch"
    );
};

const getBranchCityName = (branch) => {
    if (!branch || typeof branch !== "object") return "City not assigned";
    return (
        toDisplayText(branch.city?.cityName) ||
        toDisplayText(branch.city?.name) ||
        toDisplayText(branch.cityName) ||
        toDisplayText(branch.city) ||
        "City not assigned"
    );
};

// CourseDetailPage Component
const CourseDetailPage = () => {
    const { courseId } = useParams();

    // Local tab state
    const [activeTab, setActiveTab] = useState("Overview");

    // Server data via TanStack Query (replaces the course slice's detail cache).
    const { data: courseData = {}, isLoading, isError, error } = useCourseDetailsQuery(courseId);
    const contentItems = Array.isArray(courseData.content) ? courseData.content : [];
    const instructors = Array.isArray(courseData.teacher) ? courseData.teacher : [];
    const prices = Array.isArray(courseData.price) ? courseData.price : [];
    const branches = Array.isArray(courseData.branches) ? courseData.branches : [];

    const totalModules = contentItems.reduce(
        (count, item) => count + (Array.isArray(item.modules) ? item.modules.length : 0),
        0
    );

    const selectedPrice = prices.find((plan) => plan.isSelected) || prices[0];

    // Conditional UI
    if (isLoading) {
        return (
            <div className="min-h-[60vh] rounded-3xl bg-[#f6f3ee] p-8 text-gray-500">
                Loading course details...
            </div>
        );
    }
    if (isError) return <div className="p-6 text-red-600">Error: {error?.message || "Failed to load course."}</div>;
    if (!courseData?._id) return <div className="p-6 text-gray-600">Course not found!</div>;

    return (
        <section className="min-h-screen rounded-[2rem] bg-[#f6f3ee] p-4 sm:p-6">
            <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-orange-100">
                <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="relative min-h-[320px] overflow-hidden bg-gray-900">
                        <img
                            src={resolveImageUrl(courseData.image, DEFAULT_COURSE_IMAGE)}
                            alt={courseData.name}
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                        <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-950">
                                {courseData.category?.icon} {courseData.category?.name || "Uncategorized"}
                            </span>
                            <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold capitalize text-white">
                                {courseData.mode || "online"}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${courseData.isPublished ? "bg-emerald-400 text-emerald-950" : "bg-amber-300 text-amber-950"}`}>
                                {courseData.isPublished ? "Published" : "Draft"}
                            </span>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-orange-500">
                                    Course Details
                                </p>
                                <h1 className="mt-3 text-3xl font-semibold leading-tight text-gray-950 sm:text-4xl">
                                    {courseData.name}
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                                    {courseData.description || "No description added yet."}
                                </p>
                            </div>
                            <Link
                                to={`/admin/edit-course/${courseData._id}`}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                            >
                                <FaEdit /> Edit Course
                            </Link>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {[
                                { label: "Level", value: courseData.level || "N/A", icon: <FaUsers /> },
                                { label: "Modules", value: totalModules, icon: <FaBookOpen /> },
                                { label: "Instructors", value: instructors.length, icon: <FaUsers /> },
                                {
                                    label: "Monthly Fee",
                                    value: selectedPrice?.monthlyFee ? `₹${selectedPrice.monthlyFee}` : "N/A",
                                    icon: <FaRupeeSign />,
                                },
                            ].map((item) => (
                                <div key={item.label} className="rounded-2xl bg-[#f8f4ee] p-4 ring-1 ring-orange-100">
                                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-gray-500">
                                        <span>{item.label}</span>
                                        {item.icon}
                                    </div>
                                    <p className="mt-2 text-lg font-semibold text-gray-950">{item.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Start Date</span>
                                <p className="mt-1 flex items-center gap-2 font-medium text-gray-900">
                                    <FaClock className="text-orange-500" /> {formatDate(courseData.startDate)}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">End Date</span>
                                <p className="mt-1 flex items-center gap-2 font-medium text-gray-900">
                                    <FaClock className="text-orange-500" /> {formatDate(courseData.endDate)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {courseData.mode === "offline" && (
                <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">Offline Availability</p>
                            <h2 className="mt-1 text-xl font-semibold text-gray-950">Branches</h2>
                        </div>
                        <span className="rounded-full bg-[#f8f4ee] px-3 py-1 text-xs font-semibold text-gray-700">
                            {branches.length} selected
                        </span>
                    </div>
                    {branches.length ? (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {branches.map((branch) => (
                                <div key={branch._id || branch} className="rounded-2xl border border-gray-100 bg-[#fbfaf7] p-4">
                                    <p className="font-semibold text-gray-950">{getBranchName(branch)}</p>
                                    <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                                        <FaMapMarkerAlt className="text-orange-500" />
                                        {getBranchCityName(branch)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No offline branches selected for this course.</p>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div className="mt-6 flex gap-2 overflow-x-auto rounded-3xl bg-white p-2 text-xs font-semibold shadow-sm ring-1 ring-orange-100 sm:text-sm">
                {["Overview", "Curriculum", "Instructors", "Fee Structure"].map((tab) => (
                    <button
                        key={tab}
                        className={`shrink-0 rounded-2xl px-4 py-3 transition ${activeTab === tab ? "bg-gray-950 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
                            }`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100 sm:p-6">
                {/* Overview */}
                {activeTab === "Overview" && (
                    <div>
                        <h2 className="mb-3 text-2xl font-semibold text-gray-950">About the Course</h2>
                        <p className="leading-7 text-gray-600">{courseData.description || "No description added yet."}</p>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {[
                                { label: "Course Code", value: courseData.code || "N/A" },
                                { label: "Type", value: courseData.courseType || "N/A" },
                                { label: "Certification", value: courseData.certification || "N/A" },
                            ].map((item) => (
                                <div key={item.label} className="rounded-2xl bg-[#f8f4ee] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{item.label}</p>
                                    <p className="mt-2 font-semibold capitalize text-gray-950">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Curriculum */}
                {activeTab === "Curriculum" && (
                    <div>
                        <h2 className="mb-3 text-2xl font-semibold text-gray-950">Course Objectives</h2>
                        {courseData.objectives && courseData.objectives.length > 0 ? (
                            <div className="mb-6 grid gap-3 sm:grid-cols-2">
                                {courseData.objectives.map((obj, idx) => (
                                    <div key={idx} className="flex gap-3 rounded-2xl bg-[#f8f4ee] p-4 text-gray-700">
                                        <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                        <span>{obj}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600 mb-6">No objectives added yet.</p>
                        )}

                        <h2 className="mb-3 text-2xl font-semibold text-gray-950">Course Content</h2>
                        {contentItems.length > 0 ? (
                            <div className="space-y-4">
                                {contentItems.map((contentItem) => (
                                    <div key={contentItem._id} className="rounded-3xl border border-gray-100 bg-[#fbfaf7] p-5">
                                        <h3 className="text-xl font-semibold text-gray-950">{contentItem.courseName}</h3>
                                        <p className="mt-1 text-sm leading-6 text-gray-600">{contentItem.courseDescription}</p>

                                        {/* You can expand this to show modules, lessons, topics etc */}
                                        {contentItem.modules && contentItem.modules.length > 0 && (
                                            <div className="mt-4 space-y-3">
                                                {contentItem.modules.map((module) => (
                                                    <div key={module._id} className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                                                        <h4 className="font-semibold text-gray-950">{module.title} - {module.duration}</h4>
                                                        {module.lessons && module.lessons.length > 0 && (
                                                            <div className="mt-3 space-y-2">
                                                                {module.lessons.map((lesson) => (
                                                                    <div key={lesson._id} className="rounded-xl bg-gray-50 p-3">
                                                                        <strong className="text-sm text-gray-900">{lesson.title}</strong>
                                                                        {lesson.topics && lesson.topics.length > 0 && (
                                                                            <div className="mt-2 space-y-2">
                                                                                {lesson.topics.map((topic) => (
                                                                                    <p key={topic._id} className="text-sm text-gray-600">
                                                                                        <span className="font-medium text-gray-900">{topic.title}:</span> {topic.description}
                                                                                    </p>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600">No content added yet.</p>
                        )}
                    </div>
                )}


                {/* Instructors */}
                {activeTab === "Instructors" && (
                    <div>
                        <h2 className="mb-3 text-2xl font-semibold text-gray-950">Instructors</h2>
                        {instructors.length ? (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {instructors.map((instructor, idx) => (
                                    <div key={idx} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-[#fbfaf7] p-4">
                                        {/* Teacher Image */}
                                        <img
                                            src={resolveImageUrl(
                                                instructor?.teacherDetail?.profilePicture || instructor?.userId?.image,
                                                DEFAULT_AVATAR
                                            )}
                                            alt={`${instructor?.teacherDetail?.name?.firstName || ""} ${instructor?.teacherDetail?.name?.lastName || ""}`}
                                            className="w-14 h-14 rounded-full object-cover object-top border border-gray-300"
                                        />
                                        {/* Teacher Name */}
                                        <p className="font-semibold text-gray-950">
                                            {instructor?.teacherDetail?.name?.firstName} {instructor?.teacherDetail?.name?.lastName}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600">No instructors listed.</p>
                        )}
                    </div>
                )}


                {/* Fee Structure */}
                {activeTab === "Fee Structure" && (
                    <div>
                        <h2 className="mb-3 text-2xl font-semibold text-gray-950">Pricing</h2>
                        {prices.length ? (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {prices.map((plan) => (
                                    <div
                                        key={plan._id}
                                        className="rounded-3xl border border-orange-100 bg-[#fbfaf7] p-5 shadow-sm"
                                    >
                                        <h4 className="font-semibold capitalize text-gray-950">
                                            {plan.sessionType} Plan
                                        </h4>
                                        <p className="mt-3 text-sm text-gray-600">
                                            Monthly Fee: ₹{plan.monthlyFee}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Full Payment: ₹{plan.fullPayment}
                                        </p>
                                        <p className="text-sm text-green-600">
                                            Discount: {plan.discount}%
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Installments: {plan.installments || 1}
                                        </p>
                                        {plan.isSelected && (
                                            <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                Selected Plan
                                            </span>
                                        )}

                                        {plan.tenurePlans?.length > 0 && (
                                            <div className="mt-4 border-t border-orange-100 pt-3">
                                                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                                                    Tenure plans
                                                </p>
                                                <ul className="mt-2 space-y-1">
                                                    {plan.tenurePlans.map((tenure) => (
                                                        <li
                                                            key={tenure.months}
                                                            className="flex items-center justify-between gap-3 text-sm text-gray-600"
                                                        >
                                                            <span>{tenure.months} months</span>
                                                            <span className="font-medium text-gray-900">
                                                                ₹{Number(tenure.monthlyFee || 0).toLocaleString("en-IN")}/mo
                                                                {" · "}
                                                                ₹{Number(tenure.fullPayment || 0).toLocaleString("en-IN")} full
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {plan.customPlans?.length > 0 && (
                                            <div className="mt-4 border-t border-orange-100 pt-3">
                                                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                                                    Special offers
                                                </p>
                                                <ul className="mt-2 space-y-2">
                                                    {plan.customPlans.map((offer) => (
                                                        <li key={offer._id} className="text-sm">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="font-medium text-gray-900">
                                                                    {offer.name}
                                                                </span>
                                                                <span className="shrink-0 text-gray-600">
                                                                    ₹{Number(offer.fullPayment || 0).toLocaleString("en-IN")}
                                                                </span>
                                                            </div>
                                                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                                <span
                                                                    className={`inline-flex rounded-full px-2 py-0.5 font-semibold ring-1 ${
                                                                        offer.isActive
                                                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                                            : "bg-rose-50 text-rose-700 ring-rose-200"
                                                                    }`}
                                                                >
                                                                    {offer.isActive ? "Shown" : "Hidden"}
                                                                </span>
                                                                {offer.durationMonths ? (
                                                                    <span>{offer.durationMonths} months access</span>
                                                                ) : null}
                                                                {offer.perks?.length > 0 ? (
                                                                    <span>{offer.perks.join(", ")}</span>
                                                                ) : null}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600">No pricing data available.</p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default CourseDetailPage;
