import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { PiStar } from "react-icons/pi";
import { getFeedbackByTeacher } from "../../../../../redux/Feedback/FeedbackSlice";

export default function ReviewsTab({ instructor }) {
    const dispatch = useDispatch();

    const { feedbackList, loading, error } = useSelector((state) => state.feedback);

    useEffect(() => {
        if (instructor?.id) {
            const token = localStorage.getItem("token");
            dispatch(getFeedbackByTeacher({ teacherId: instructor.id, token }));
        }
    }, [instructor, dispatch]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {loading ? (
                <div className="col-span-full text-center text-gray-500">Loading reviews...</div>
            ) : error ? (
                <div className="col-span-full text-center text-red-500">Failed to load reviews.</div>
            ) : feedbackList?.length > 0 ? (
                feedbackList.map((review) => {
                    const user = review?.studentId?.userId;
                    const name = user?.name || {};
                    const firstName = name?.firstName || "Student";
                    const lastName = name?.lastName || "";
                    const avatarLetter = firstName.charAt(0).toUpperCase();

                    return (
                        <div
                            key={review._id}
                            className="bg-white rounded-xl shadow-sm p-5 border hover:shadow-md transition"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <PiStar className="text-yellow-500" />
                                <span className="font-semibold">{review.instructorRating}/5</span>
                            </div>

                            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                “{review.additionalFeedback}”
                            </p>

                            <div className="flex items-center gap-3 mt-auto">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
                                    {avatarLetter}
                                </div>

                                <div>
                                    <h4 className="font-semibold text-gray-900">
                                        {firstName} {lastName}
                                    </h4>
                                    <p className="text-xs text-gray-500">{review.courseId?.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="col-span-full bg-white rounded-xl shadow-sm p-10 text-center border">
                    <p className="text-gray-500">🚫 No reviews yet.</p>
                </div>
            )}
        </div>
    );
}
