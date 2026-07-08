import { configureStore } from "@reduxjs/toolkit";
import { clearAuthSession } from "../utils/authSession";
import applicationReducer from "./Intructor/teacherApplication";
import teacherReducer from "./Intructor/teacherSlice";
import branchReducer from "./Branch/branchSlice";
import cityReducer from "./City/CitySlice";
import zoneReducer from "./Zone/ZoneSlice";
import subCategoryReducer from "./SubCategory/SubCategorySlice";
import contentReducer from "./Content/ContentSlice";
import adminReducer from "./Admin/AdminSlice";
import userReducer from "./User/UserSlice";
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
import courseRequestReducer from "./courseRequests/courseRequestSlice";
import referralReducer from "./Referral/ReferralSlice";

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
    subCategory: subCategoryReducer,
    teachers: teacherReducer,
    content: contentReducer,
    admin: adminReducer,
    user: userReducer,
    demoBookings: demoBookingReducer,
    enquiry: enquiryReducer,
    notice: noticeReducer,
    remuneration: remunerationReducer,
    feedback: feedbackReducer,
    assignment: assignmentReducer,
    attendanceHomework: attendanceHomeworkReducer,
    assessment: assessmentReducer,
    siteContent: siteContentReducer,
    courseRequests: courseRequestReducer,
    referral: referralReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sessionExpiredMiddleware),
});
