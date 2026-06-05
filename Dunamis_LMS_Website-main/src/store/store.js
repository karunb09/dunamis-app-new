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
export const makeStore = (preloadedState) =>
  configureStore({
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
    preloadedState,
  });

// Kept for any legacy direct import; prefer makeStore() via Providers.
const store = makeStore();

export default store;
