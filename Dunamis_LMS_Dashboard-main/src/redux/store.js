import { configureStore } from "@reduxjs/toolkit";
import { clearAuthSession } from "../utils/authSession";
import applicationReducer from "./Intructor/teacherApplication";
import teacherReducer from "./Intructor/teacherSlice";
import branchReducer from "./Branch/branchSlice";
import cityReducer from "./City/CitySlice";
import zoneReducer from "./Zone/ZoneSlice";
import courseReducer from "./Course/CourseSlice";
import categoryReducer from "./Category/CategorySlice";
import subCategoryReducer from "./SubCategory/SubCategorySlice";
import contentReducer from "./Content/ContentSlice";
import adminReducer from "./Admin/AdminSlice";
import userReducer from "./User/UserSlice";
import studentReducer from "./Student/StudentSlice";
import authReducer from "./authSlice";
import demoBookingReducer from "./DemoBooking/DemoBookingSlice";
import enquiryReducer from "./Enquiry/EnquirySlice";
import noticeReducer from "./AdminNotice/AdminNoticeSlice";
import remunerationReducer from "./Remuneration/RemunerationSlice";
import feedbackReducer from "./Feedback/FeedbackSlice";
import assignmentReducer from "./Assignment/AssignmentSlice";
import attendanceHomeworkReducer from "./AttendanceHomework/AttendanceHomeworkSlice";
import assessmentReducer from "./Assesment/AssesmentSlice";
import siteContentReducer from "./SiteContent/SiteContentSlice";

const AUTH_ERROR_MESSAGES = new Set([
  "Access denied. No token provided.",
  "Access token has expired",
  "Invalid or expired token",
]);

const sessionExpiredMiddleware = () => (next) => (action) => {
  if (
    action.type?.endsWith("/rejected") &&
    action.type !== "auth/hydrateSession/rejected" &&
    typeof action.payload === "string" &&
    AUTH_ERROR_MESSAGES.has(action.payload)
  ) {
    clearAuthSession();
    window.location.replace("/");
    return;
  }
  return next(action);
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    application: applicationReducer,
    branch: branchReducer,
    city: cityReducer,
    zone: zoneReducer,
    course: courseReducer,
    category: categoryReducer,
    subCategory: subCategoryReducer,
    teachers: teacherReducer,
    content: contentReducer,
    admin: adminReducer,
    user: userReducer,
    student: studentReducer,
    demoBookings: demoBookingReducer,
    enquiry: enquiryReducer,
    notice: noticeReducer,
    remuneration: remunerationReducer,
    feedback: feedbackReducer,
    assignment: assignmentReducer,
    attendanceHomework: attendanceHomeworkReducer,
    assessment: assessmentReducer,
    siteContent: siteContentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sessionExpiredMiddleware),
});
