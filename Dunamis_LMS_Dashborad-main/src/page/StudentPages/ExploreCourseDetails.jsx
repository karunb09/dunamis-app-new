import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getCourseDetails } from "../../redux/Course/CourseSlice";
import BookingWizardModal from "./BookingWizardModal.jsx";
import CourseDetail from "./CourseDetails.jsx";
import ExploreCourseDetailsSecond from "./ExploreCourseDetailsSecond.jsx";
import { resolveImageUrl } from "../../utils/resolveImageUrl";

const DEFAULT_COURSE_IMAGE = "https://placehold.co/960x540?text=Course";

export default function ExploreCourseDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();

  const courseFromState = location.state?.course;
  const { course: courseFromRedux, status, error } = useSelector((state) => state.course);
  
  const course = courseFromState || courseFromRedux?.info;

  useEffect(() => {
    if (!courseFromState && id) {
      dispatch(getCourseDetails(id));
    }
  }, [id, courseFromState, dispatch]);

  useEffect(() => {
    if (!course && status === "failed") {
      navigate("/explore-courses", { replace: true });
    }
  }, [course, status, navigate]);

  const [showSchedule, setShowSchedule] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [selectedSessionType, setSelectedSessionType] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);

  const [formData, setFormData] = useState({});
  const [step, setStep] = useState(0);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedSlot, setSelectedSlot] = useState({ date: "", time: "" });

  const closePlanModal = (e) => {
    if (e.target.id === "modal-bg" || e.target.id === "modal-x") {
      setShowPlanModal(false);
      setModalStep(1);
      setSelectedSessionType(null);
    }
  };

  const closeBookModal = () => {
    setShowBookModal(false);
    setStep(0);
    setSelectedBranch("");
    setSelectedSlot({ date: "", time: "" });
    setFormData({});
  };

  const handleBooking = (e) => {
    e.preventDefault();
    alert(
      `Booked!\nBranch: ${selectedBranch}\nDate: ${selectedSlot.date}\nTime: ${selectedSlot.time}`
    );
    closeBookModal();
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  const categoryName = course.category?.name || "General";
  const courseImage = resolveImageUrl(course.image, DEFAULT_COURSE_IMAGE);
  const courseName = course.name || "Course Name";
  const courseDescription = course.description || "No description available";
  
  const startDate = course.startDate ? new Date(course.startDate) : null;
  const endDate = course.endDate ? new Date(course.endDate) : null;
  const duration = startDate && endDate 
    ? `${Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30))} months`
    : "Not specified";
  
  const level = course.level?.charAt(0).toUpperCase() + course.level?.slice(1) || "Beginner";
  const totalStudents = course.enrolledStudents?.length || 0;
  
  const teacher = course.teacher?.[0];
  const teacherName = teacher?.teacherDetail?.name 
    ? `${teacher.teacherDetail.name.firstName} ${teacher.teacherDetail.name.lastName}` 
    : "Instructor";
  const teacherRating = teacher?.averageRating || 4.8;

  const priceData = course.price || [];
  const selectedPrice = priceData.find(p => p.isSelected) || priceData[0];
  const monthlyPrice = selectedPrice?.monthlyFee || 0;
  const fullPayment = selectedPrice?.fullPayment || 0;
  const discount = selectedPrice?.discount || 0;

  const branches = course.branches || [];
  const branchCount = course.branchCount || branches.length || 0;

  const mode = course.mode || "online";

  const sessionPlans = priceData
    .filter(p => p.isActive)
    .map((priceItem, index) => {
      const isGroup = priceItem.sessionType === "standard";
      return {
        label: isGroup ? "Group Sessions" : "One-on-One Sessions",
        price: priceItem.monthlyFee.toLocaleString(),
        badge: isGroup ? "Popular" : "Personalized",
        badgeExtra: isGroup ? null : "Premium",
        badgeColor: "bg-purple-200 text-purple-800",
        badgeExtraColor: "bg-green-200 text-green-800",
        description: isGroup
          ? [
              "Learn with 3-4 other students",
              "1 hour class duration",
              "Interactive group discussions",
              "Peer learning opportunities",
            ]
          : [
              "Personal attention from instructor",
              "40 minute focused sessions",
              "Customized learning pace",
              "Immediate feedback & corrections",
            ],
        priceType: "/month",
        outline: isGroup ? "border-2 border-[#262c53]" : "border-2 border-green-400",
        sessionType: isGroup ? "group" : "oneonone",
        fullPayment: priceItem.fullPayment,
        discount: priceItem.discount,
      };
    });

  const choosePlanOptions = {};
  priceData.forEach((priceItem) => {
    const type = priceItem.sessionType === "standard" ? "group" : "oneonone";
    const basePrice = priceItem.monthlyFee;
    const fullPrice = priceItem.fullPayment;
    const discountAmount = priceItem.discount || 0;
    const discountedPrice = fullPrice - discountAmount;

    if (!choosePlanOptions[type]) {
      choosePlanOptions[type] = [];
    }

    choosePlanOptions[type].push(
      {
        label: "Monthly Plan",
        price: basePrice.toLocaleString(),
        priceType: "/month",
        sub: "Pay as you go • Cancel anytime",
        badge: "Flexible",
      },
      {
        label: "Full Course Plan",
        price: discountedPrice.toLocaleString(),
        priceType: "one-time",
        sub: `${discountAmount > 0 ? Math.round((discountAmount/fullPrice)*100) + '% discount • ' : ''}Priority support • Certificate`,
        badge: "Best Value",
        save: discountAmount > 0 ? `Save ${Math.round((discountAmount/fullPrice)*100)}%` : null,
        old: discountAmount > 0 ? fullPrice.toLocaleString() : null,
      }
    );
  });

  const scheduleData = teacher?.weeklyAvailability?.map(slot => ({
    day: slot.days ? slot.days.join(", ") : slot.day,
    time: `${slot.startTime} - ${slot.endTime}`,
    type: slot.sessionType?.charAt(0).toUpperCase() + slot.sessionType?.slice(1) || "Standard"
  })) || [];

  const demoSlots = Object.values(
    scheduleData.reduce((groups, slot) => {
      const date = slot.day || "Available slots";
      if (!groups[date]) {
        groups[date] = { date, slots: [] };
      }

      if (slot.time && !groups[date].slots.includes(slot.time)) {
        groups[date].slots.push(slot.time);
      }

      return groups;
    }, {})
  );

  const scheduleNote =
    "Schedule may vary based on instructor availability and student preferences. Final schedule will be confirmed after enrollment.";

  return (
    <div className="w-full min-h-screen bg-[#ffffff] font-sans">
      {showPlanModal && (
        <div
          id="modal-bg"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={closePlanModal}
        >
          <div 
            className="relative w-full max-w-5xl mx-auto bg-white rounded-3xl p-6 md:p-10 shadow-2xl overflow-y-auto max-h-[calc(100vh-60px)] scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              id="modal-x"
              className="absolute top-5 right-5 text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors z-10"
              onClick={closePlanModal}
            >
              ×
            </button>

            {modalStep === 2 && (
              <button
                className="absolute top-5 left-5 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
                onClick={() => {
                  setModalStep(1);
                  setSelectedSessionType(null);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                <span>Back</span>
              </button>
            )}

            {modalStep === 1 && (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-extrabold mb-2 text-gray-900">
                    Choose Your Learning Style
                  </h2>
                  <p className="text-gray-600 text-base">
                    Select the type of session that best fits your learning preferences
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sessionPlans.map((plan, idx) => (
                    <div
                      key={idx}
                      className={`relative rounded-2xl bg-gray-50 ${plan.outline} p-6 flex flex-col transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
                      onClick={() => {
                        setSelectedSessionType(plan.sessionType);
                        setModalStep(2);
                      }}
                    >
                      {plan.badgeExtra && (
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold absolute left-1/2 top-[-12px] -translate-x-1/2 ${plan.badgeExtraColor} shadow-md`}
                        >
                          {plan.badgeExtra}
                        </span>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xl font-bold text-gray-900">
                          {plan.label}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${plan.badgeColor}`}
                        >
                          {plan.badge}
                        </span>
                      </div>

                      <div className="flex items-end gap-2 mb-4">
                        <span className="text-4xl font-extrabold text-gray-900">
                          ₹{plan.price}
                        </span>
                        <span className="font-semibold text-lg text-gray-500 mb-1">
                          {plan.priceType}
                        </span>
                      </div>

                      <ul className="space-y-2.5 flex-1">
                        {plan.description.map((desc, i) => (
                          <li
                            key={i}
                            className="flex gap-2.5 items-start text-gray-700 text-sm"
                          >
                            <span className="text-green-500 text-xl leading-none flex-shrink-0">
                              ✓
                            </span>
                            <span>{desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <p className="text-center text-gray-500 mt-8 text-sm">
                  Click any option to continue with plan selection
                </p>
              </>
            )}

            {modalStep === 2 && selectedSessionType && (
              <>
                <div className="text-center mb-8 mt-8">
                  <h2 className="text-3xl font-extrabold mb-2 text-gray-900">
                    Choose Your Plan
                  </h2>
                  <p className="text-gray-600 text-base">
                    {selectedSessionType === "group"
                      ? "Group Sessions (3-4 students, 1 hour)"
                      : "One-on-One (40 min, personalized)"}
                  </p>
                </div>

                <div className="flex flex-col gap-6 max-w-2xl mx-auto">
                  {(choosePlanOptions[selectedSessionType] || []).map((opt, i) => (
                    <div
                      key={i}
                      className="relative rounded-2xl bg-gray-50 p-6 flex flex-col transition-all duration-200 hover:shadow-xl hover:-translate-y-1 border border-gray-200 cursor-pointer"
                      onClick={() => {
                        setShowPlanModal(false);
                        setModalStep(1);
                        setSelectedSessionType(null);
                        const planType = /monthly/i.test(opt.label) ? "monthly" : "full";
                        const sessionTypeLabel = selectedSessionType === "oneonone" ? "Individual Sessions" : "Group Sessions";
                        
          
                        navigate("/payment/confirm", {
                          state: {
                            courseId: course._id,
                            course: course,
                            sessionType: sessionTypeLabel,
                            planType,
                            selectedSessionTypeKey: selectedSessionType,
                          },
                        });
                      }}
                    >
                      <div className="flex items-center flex-wrap gap-2 mb-3">
                        <span className="text-xl font-bold text-gray-900">{opt.label}</span>
                        {opt.save && (
                          <span className="rounded-full px-3 py-1.5 text-xs font-bold bg-green-200 text-green-800">
                            {opt.save}
                          </span>
                        )}
                        <span className="ml-auto rounded-full px-3 py-1.5 text-xs font-bold bg-purple-200 text-purple-800">
                          {opt.badge}
                        </span>
                      </div>

                      <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-extrabold text-gray-900">
                          ₹{opt.price}
                        </span>
                        <span className="font-semibold text-lg text-gray-500 mb-1">
                          {opt.priceType}
                        </span>
                        {opt.old && (
                          <span className="ml-2 text-base line-through text-gray-400">
                            ₹{opt.old}
                          </span>
                        )}
                      </div>

                      <div className="text-gray-600 text-sm">{opt.sub}</div>
                    </div>
                  ))}
                </div>

                <p className="text-center text-gray-500 mt-8 text-sm">
                  Click any plan to continue with enrollment
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <BookingWizardModal
        open={showBookModal}
        onClose={closeBookModal}
        step={step}
        setStep={setStep}
        formData={formData}
        setFormData={setFormData}
        selectedBranch={selectedBranch}
        setSelectedBranch={setSelectedBranch}
        selectedSlot={selectedSlot}
        setSelectedSlot={setSelectedSlot}
        handleBooking={handleBooking}
        branches={branches}
        demoSlots={demoSlots}
      />

      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row bg-white px-8 py-6 gap-8 md:gap-12">
        <div className="w-full md:w-1/2 flex flex-col items-start">
          <span className="bg-purple-200 text-purple-800 px-5 py-1 rounded-full mb-4 font-semibold text-base">
            {categoryName}
          </span>
          <div className="w-full h-28 sm:h-36 md:h-56 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
            <img
              src={courseImage}
              alt={categoryName}
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col justify-between">
          <h1 className="text-3xl sm:text-4xl lg:text-4xl font-extrabold mb-2 text-gray-900">
            {courseName}
          </h1>
          <p className="text-gray-700 mb-3 text-base sm:text-lg">
            {courseDescription}
          </p>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-yellow-400 text-2xl">★ ★ ★ ★ ☆</span>
            <span className="text-gray-800 text-base font-semibold">
              {teacherRating.toFixed(1)} <span className="font-normal">({totalStudents} students)</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-gray-100 rounded-2xl px-6 py-4 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-2 text-black text-sm rounded-full px-4 py-1 w-fit font-normal">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#2e3a59]">
                    <path d="M12 6v6l4 2"></path>
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                </span>
                <span className="text-gray-500 text-base font-medium">Duration</span>
              </div>
              <span className="text-xl font-bold text-[#181D27]">{duration}</span>
            </div>
            <div className="bg-gray-100 rounded-2xl px-6 py-4 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-2 text-black text-sm rounded-full px-4 py-1 w-fit font-normal">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#2e3a59]">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                  </svg>
                </span>
                <span className="text-gray-500 text-base font-medium">Level</span>
              </div>
              <span className="text-xl font-bold text-[#181D27]">{level}</span>
            </div>
          </div>
          
          <div className="mb-6 w-full">
            <button
              className="flex items-center w-full bg-gray-100 rounded-xl px-5 py-4 text-lg font-semibold hover:bg-gray-200 transition justify-between"
              onClick={() => setShowSchedule((v) => !v)}
            >
              <span>
                <span className="inline-flex items-center gap-2 text-black text-sm rounded-full px-4 py-1 w-fit font-normal">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#2e3a59]">
                    <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                    <path d="M3 10h18"></path>
                  </svg>
                </span>
                View Course Schedule
              </span>
              <span
                className={`transform transition-transform duration-300 ${
                  showSchedule ? "rotate-180" : ""
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#2e3a59]">
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </span>
            </button>
            {showSchedule && scheduleData.length > 0 && (
              <div className="w-full mt-3 bg-gray-50 rounded-2xl p-6 shadow border border-gray-100">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Weekly Schedule</h3>
                <div className="flex flex-col gap-3">
                  {scheduleData.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl bg-white px-5 py-3 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-green-400 inline-block"></span>
                        <span className="font-semibold text-gray-800">{item.day}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold">{item.time}</span>
                        <span className="text-xs text-gray-500">{item.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-xl bg-purple-200 text-purple-900 text-sm">
                  <span className="font-bold">Note: </span>
                  {scheduleNote}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-100 w-full rounded-2xl px-7 py-7 flex flex-col gap-3 mt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                ₹{monthlyPrice}
                <span className="text-lg font-normal text-gray-600">/month</span>
              </span>
              <span className={`px-4 py-1 rounded-xl text-xs font-bold ${
                mode === "online" 
                  ? "bg-purple-200 text-purple-800" 
                  : "bg-green-200 text-green-800"
              }`}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </span>
            </div>
            <button
              className="bg-[#232C53] text-white font-bold rounded-full px-8 py-3 mt-4 hover:bg-[#101943] transition-all duration-200 w-full"
              onClick={() => setShowPlanModal(true)}
            >
              Enroll Now
            </button>
            <button
              className="border-2 border-[#232C53] text-[#232C53] rounded-full px-8 py-3 font-bold w-full hover:bg-[#232C53] hover:text-white transition-all duration-200"
              onClick={() => {
                setShowBookModal(true);
                setStep(0);
              }}
            >
              Book Demo Slot
            </button>
          </div>
        </div>
      </div>
      
    <ExploreCourseDetailsSecond course={course} showHeader={false} />
    </div>
  );
}
