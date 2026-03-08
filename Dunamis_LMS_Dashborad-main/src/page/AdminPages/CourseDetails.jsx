import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { FaStar, FaClock, FaUsers } from "react-icons/fa";
import { CheckCircle } from "react-feather";
import { getCourseDetails } from "../../redux/Course/CourseSlice";
import { DEFAULT_AVATAR, resolveImageUrl } from "../../utils/resolveImageUrl";

const DEFAULT_COURSE_IMAGE = "https://placehold.co/960x540?text=Course";
// CourseDetailPage Component
const CourseDetailPage = () => {
    const dispatch = useDispatch();
    const { courseId } = useParams();

    // Local tab state
    const [activeTab, setActiveTab] = useState("Overview");

    // Global state from Redux
    const { course, status, error } = useSelector((state) => state.course);
    const courseData = course?.info || {}; // Flattened course object

    useEffect(() => {
        if (courseId) {
            dispatch(getCourseDetails(courseId));
        }
    }, [courseId, dispatch]);

    // Conditional UI
    if (status === "loading") return <div>Loading...</div>;
    if (status === "failed") return <div>Error: {error}</div>;
    if (!courseData?._id) return <div>Course not found!</div>;

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {/* Top Section */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-start">
                {/* Course Image */}
                <div className="rounded-xl overflow-hidden shadow-lg">
                    <img
                        src={resolveImageUrl(courseData.image, DEFAULT_COURSE_IMAGE)}
                        alt={courseData.name}
                        className="w-full h-60 sm:h-72 md:h-96 object-cover"
                    />
                </div>

                {/* Course Details */}
                <div>
                    {/* Category Tag */}
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                        {courseData.category?.icon} {courseData.category?.name}
                    </span>

                    {/* Course Title */}
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-3">
                        {courseData.name}
                    </h1>

                    {/* Description */}
                    <p className="text-gray-600 mt-3 sm:mt-4 leading-relaxed text-sm sm:text-base">
                        {courseData.description}
                    </p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 sm:mt-5 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                            <FaUsers className="w-4 h-4" /> {courseData.level}
                        </div>
                        {courseData.startDate && (
                            <div className="flex items-center gap-1">
                                <FaClock className="w-4 h-4" />
                                Start: {new Date(courseData.startDate).toLocaleDateString()}
                            </div>
                        )}

                        {courseData.endDate && (
                            <div className="flex items-center gap-1">
                                <FaClock className="w-4 h-4" />
                                End: {new Date(courseData.endDate).toLocaleDateString()}
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mt-10 border-b border-gray-200 flex gap-4 sm:gap-8 overflow-x-auto text-xs sm:text-sm font-medium relative">
                {["Overview", "Curriculum", "Instructors", "Fee Structure"].map((tab) => (
                    <button
                        key={tab}
                        className={`cursor-pointer shrink-0 pb-3 relative ${activeTab === tab ? "text-black font-semibold" : "text-gray-500"
                            }`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                        {activeTab === tab && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-6 sm:mt-8">
                {/* Overview */}
                {activeTab === "Overview" && (
                    <div>
                        <h2 className="text-2xl font-bold mb-3">About the Course</h2>
                        <p className="text-gray-600">{courseData.description}</p>
                    </div>
                )}

                {/* Curriculum */}
                {activeTab === "Curriculum" && (
                    <div>
                        <h2 className="text-2xl font-bold mb-3">Course Objectives</h2>
                        {courseData.objectives && courseData.objectives.length > 0 ? (
                            <ul className="list-disc pl-5 space-y-2 mb-6">
                                {courseData.objectives.map((obj, idx) => (
                                    <li key={idx} className="text-gray-700">{obj}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-600 mb-6">No objectives added yet.</p>
                        )}

                        <h2 className="text-2xl font-bold mb-3">Course Content</h2>
                        {courseData.content && courseData.content.length > 0 ? (
                            <div>
                                {courseData.content.map((contentItem) => (
                                    <div key={contentItem._id} className="mb-5">
                                        <h3 className="text-xl font-semibold mb-1">{contentItem.courseName}</h3>
                                        <p className="mb-2 text-gray-600">{contentItem.courseDescription}</p>

                                        {/* You can expand this to show modules, lessons, topics etc */}
                                        {contentItem.modules && contentItem.modules.length > 0 && (
                                            <div className="pl-5">
                                                {contentItem.modules.map((module) => (
                                                    <div key={module._id} className="mb-3">
                                                        <h4 className="font-semibold">{module.title} - {module.duration}</h4>
                                                        {module.lessons && module.lessons.length > 0 && (
                                                            <ul className="list-disc pl-5">
                                                                {module.lessons.map((lesson) => (
                                                                    <li key={lesson._id}>
                                                                        <strong>{lesson.title}</strong>
                                                                        {lesson.topics && lesson.topics.length > 0 && (
                                                                            <ul className="list-disc pl-5">
                                                                                {lesson.topics.map((topic) => (
                                                                                    <li key={topic._id}>
                                                                                        <span className="font-medium">{topic.title}:</span> {topic.description}
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
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
                        <h2 className="text-2xl font-bold mb-3">Instructors</h2>
                        {courseData.teacher?.length ? (
                            courseData.teacher.map((instructor, idx) => (
                                <div key={idx} className="mb-4 flex items-center gap-4">
                                    {/* Teacher Image */}
                                    <img
                                        src={resolveImageUrl(
                                            instructor?.teacherDetail?.profilePicture || instructor?.userId?.image,
                                            DEFAULT_AVATAR
                                        )}
                                        alt={`${instructor.teacherDetail?.name?.firstName} ${instructor.teacherDetail?.name?.lastName}`}
                                        className="w-14 h-14 rounded-full object-cover border border-gray-300"
                                    />
                                    {/* Teacher Name */}
                                    <p className="font-medium text-lg">
                                        {instructor.teacherDetail?.name?.firstName} {instructor.teacherDetail?.name?.lastName}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-600">No instructors listed.</p>
                        )}
                    </div>
                )}


                {/* Fee Structure */}
                {activeTab === "Fee Structure" && (
                    <div>
                        <h2 className="text-2xl font-bold mb-3">Pricing</h2>
                        {courseData.price?.length ? (
                            <div className="grid sm:grid-cols-2 gap-6">
                                {courseData.price.map((plan) => (
                                    <div
                                        key={plan._id}
                                        className="border p-4 rounded-xl shadow-sm bg-white"
                                    >
                                        <h4 className="font-semibold capitalize">
                                            {plan.sessionType} Plan
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            Monthly Fee: ₹{plan.monthlyFee}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Full Payment: ₹{plan.fullPayment}
                                        </p>
                                        <p className="text-sm text-green-600">
                                            Discount: {plan.discount}%
                                        </p>
                                        {/* {plan.isSelected && (
                                            <span className="text-xs text-white bg-green-500 px-2 py-1 rounded">
                                                Selected
                                            </span>
                                        )} */}
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
