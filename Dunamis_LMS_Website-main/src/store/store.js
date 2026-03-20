import { configureStore } from "@reduxjs/toolkit";
import applicationReducer from "./applicationSlice";
import signupReducer from "./signupSlice";
import courseReducer from "./courseSlice";
import categoryReducer from "./categorySlice";
import MentorReducer from "./mentorSlice";
import offlineCenterReducer from "./centerSlice";
import authReducer from "./authSlice";
import enquiryReducer from "./enquirySlice";
import enrollmentReducer from "./enrollmentSlice";
import demoBookingReducer from "./demoBookingSlice";
const store = configureStore({
  reducer: {
    application: applicationReducer,
    signup: signupReducer,
    course: courseReducer,
    category: categoryReducer,
    mentor: MentorReducer,
    offlineCenters: offlineCenterReducer,
    enquiry: enquiryReducer,
    auth: authReducer,
    enrollment: enrollmentReducer,
    demoBooking: demoBookingReducer,
  },
});

export default store;
