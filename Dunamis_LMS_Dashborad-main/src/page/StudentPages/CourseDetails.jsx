import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import { PiBookBold } from "react-icons/pi";
import { MdOutlineLibraryBooks } from "react-icons/md";
import { fetchTeacherById } from "../../redux/Intructor/teacherSlice";  
import VideoPlayer from "../StudentPages/VideoPlayer";


function CurriculumSection({ curriculum }) {
  const [openModule, setOpenModule] = useState(0);
  const [openLessons, setOpenLessons] = useState({ 0: [0] });


  const handleModuleToggle = (idx) => {
    setOpenModule(idx === openModule ? null : idx);
    setOpenLessons((prev) => ({
      ...prev,
      [idx]: [0],
    }));
  };


  const handleLessonToggle = (modIdx, lessonIdx) => {
    setOpenLessons((prev) => {
      const inModule = prev[modIdx] || [];
      return {
        ...prev,
        [modIdx]: inModule.includes(lessonIdx)
          ? inModule.filter((i) => i !== lessonIdx)
          : [...inModule, lessonIdx],
      };
    });
  };


  if (!curriculum || curriculum.length === 0) {
    return <div className="text-gray-400 p-4">No curriculum available</div>;
  }


  return (
    <div className="space-y-7">
      {curriculum.map((module, mi) => (
        <div
          key={mi}
          className="border rounded-2xl bg-white shadow-sm transition-shadow duration-150"
        >
          <button
            className="w-full flex items-center gap-3 px-5 py-4 rounded-t-2xl bg-white cursor-pointer border-b select-none focus:outline-none hover:bg-gray-50 transition"
            aria-expanded={openModule === mi}
            onClick={() => handleModuleToggle(mi)}
            type="button"
          >
            <span className="rounded-lg bg-[#FEF6D5] flex items-center justify-center p-3 mr-2">
              <PiBookBold className="text-yellow-500 w-6 h-6" />
            </span>
            <span className="font-semibold text-black text-base md:text-lg">
              {module.title || module.name}
            </span>
            <span className="flex-1" />
            <span className="text-gray-400 transition-transform duration-200">
              {openModule === mi ? (
                <FaChevronDown className="w-5 h-5" />
              ) : (
                <FaChevronRight className="w-5 h-5" />
              )}
            </span>
          </button>


          <div
            className={`overflow-hidden transition-all duration-300 ${
              openModule === mi ? "max-h-[3000px] py-2" : "max-h-0 py-0"
            }`}
          >
            <div className="flex flex-col gap-5 py-3">
              {(module.lessons || []).map((lesson, li) => (
                <div key={li} className="pl-3 sm:pl-8">
                  <button
                    className="w-full flex items-center gap-3 rounded-lg bg-white cursor-pointer select-none text-left mb-1 pr-2 py-3 hover:bg-gray-50 transition"
                    aria-expanded={(openLessons[mi] || []).includes(li)}
                    onClick={() => handleLessonToggle(mi, li)}
                    type="button"
                  >
                    <span className="rounded-lg bg-[#EBF7FE] flex items-center justify-center p-2 mr-2">
                      <MdOutlineLibraryBooks className="text-blue-400 w-6 h-6" />
                    </span>
                    <span className="font-medium text-black text-[15px] md:text-base">
                      {lesson.title || lesson.name}
                    </span>
                    <span className="flex-1" />
                    <span className="text-gray-400 transition-transform duration-200">
                      {(openLessons[mi] || []).includes(li) ? (
                        <FaChevronDown className="w-4 h-4" />
                      ) : (
                        <FaChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  </button>
                  <div
                    className={`pl-5 border-l-2 border-[#E6EAEF] transition-all duration-300 ${
                      (openLessons[mi] || []).includes(li)
                        ? "max-h-[2500px] pt-1 pb-2"
                        : "max-h-0 py-0 overflow-hidden"
                    }`}
                  >
                    <ul className="flex flex-col gap-3">
                      {(lesson.topics || []).map((topic, ti) => (
                        <li
                          key={ti}
                          className="flex gap-3 items-start leading-relaxed"
                        >
                          <span className="rounded-lg bg-[#F6F6F8] flex items-center justify-center p-2 mt-[2px]">
                            <span className="text-gray-600 text-xs">T</span>
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 18 18"
                              fill="none"
                            >
                              <rect width="18" height="18" rx="5" fill="#F6F6F8" />
                              <path
                                d="M6.5 6.5H11.5V7.5H6.5V6.5ZM6.5 8.5H10.5V9.5H6.5V8.5ZM6.5 10.5H9.5V11.5H6.5V10.5Z"
                                fill="#898989"
                              />
                            </svg>
                          </span>
                          <div>
                            <div className="font-medium text-gray-900 text-sm md:text-base mb-0.5">
                              {topic.title || topic.name}
                            </div>
                            {(topic.description || topic.desc) && (
                              <div className="text-gray-600 text-xs sm:text-sm">
                                {topic.description || topic.desc}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


function InstructorsSection({
  instructors,
  selected,
  onSelect,
  byId = {},
  loadingById = {},
  errorById = {},
}) {
  if (!instructors || instructors.length === 0) {
    return <div className="text-gray-400 p-4">No instructors available</div>;
  }


  const [showVideo, setShowVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [selectingMode, setSelectingMode] = useState(false);
  const [tempSelected, setTempSelected] = useState(selected);
  const [showChangeWarning, setShowChangeWarning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false); 


  useEffect(() => {
    setTempSelected(selected);
  }, [selected]);


  const cap = (s) =>
    typeof s === "string" && s.length ? s[0].toUpperCase() + s.slice(1) : s;


  const startSelecting = () => {
    setTempSelected(selected);
    setSelectingMode(true);
    setShowChangeWarning(true);
  };


  const openConfirm = () => {
    if (tempSelected && tempSelected !== selected) {
      setShowConfirm(true);
    } else {
      
      setSelectingMode(false);
      setShowChangeWarning(false);
    }
  };


  const cancelSelecting = () => {
    setTempSelected(selected);
    setSelectingMode(false);
    setShowChangeWarning(false);
    setShowConfirm(false);
  };


  const confirmSelecting = () => {
    if (tempSelected && tempSelected !== selected) {
      onSelect(tempSelected);
    }
    setSelectingMode(false);
    setShowChangeWarning(false);
    setShowConfirm(false);
  };


  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg sm:text-xl font-bold">Instructors</h3>


        {!selectingMode ? (
          <button
            className="bg-black text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-gray-900 transition-all"
            onClick={startSelecting}
            type="button"
          >
            Change Instructor
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-full text-xs font-semibold border border-gray-300 hover:bg-gray-100 transition"
              onClick={cancelSelecting}
              type="button"
            >
              Cancel
            </button>
            <button
              className="bg-black text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-gray-900 transition-all"
              onClick={openConfirm}
              type="button"
            >
              Confirm
            </button>
          </div>
        )}
      </div>


      {showChangeWarning && (
        <div
          role="status"
          className="mb-4 rounded-xl border mb-10 border-yellow-200 bg-yellow-50 text-yellow-900 px-4 py-3 flex items-start gap-3"
        >
          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-yellow-800 text-xs">
            i
          </span>
          <p className="text-sm leading-relaxed">
            Heads up! You can switch your instructor once per course, so try to pick the one that's the best fit for you. If there's a change from the instructor's or admin's side, we'll automatically assign you a new instructor.
          </p>
        </div>
      )}


      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {instructors.map((instructor) => {
          const instructorId = instructor._id;
          const isSelected = selected === instructorId;
          const isTempSelected = tempSelected === instructorId;


          const api = byId?.[instructorId] || null;
          const td = api?.teacherDetails || instructor.teacherDetail;


          const firstName =
            td?.name?.firstName ||
            api?.user?.name?.firstName ||
            instructor.teacherDetail?.name?.firstName ||
            "Unknown";
          const lastName =
            td?.name?.lastName ||
            api?.user?.name?.lastName ||
            instructor.teacherDetail?.name?.lastName ||
            "";
          const fullName = `${firstName} ${lastName}`.trim();


          const avatar =
            td?.profilePicture ||
            api?.user?.image ||
            instructor.teacherDetail?.profilePicture ||
            instructor.userId?.image;


          const rating = api?.averageRating ?? instructor.averageRating ?? 4.8;
          const studentCount = api?.studentCount ?? instructor.studentCount ?? 0;


          const location =
            td?.currentCity && td?.currentState
              ? `${td.currentCity}, ${td.currentState}`
              : "India";
          const years = td?.yearOfExperience ?? 5;
          const mode = td?.mode ? cap(td.mode) : "Online & Offline";


          const isLoading = !!loadingById?.[instructorId];
          const err = errorById?.[instructorId];


          const desc = `Expert instructor with ${years}+ years experience`;
          const introVideoUrl =
            api?.introVideoUrl ||
            instructor.introVideoUrl ||
            instructor.videoUrl ||
            "";


       
         const showCurrentRibbon = selectingMode && isSelected;


          const showPendingRibbon = selectingMode && isTempSelected && tempSelected !== selected;


          return (
            <div
              key={instructorId}
              className={`relative rounded-xl bg-white p-6 py-8 flex flex-col shadow-sm min-h[230px] transition-all hover:shadow-lg ${
                selectingMode && isTempSelected ? "ring-2 ring-black" : ""
              }`}
              style={{ boxShadow: "0px 2px 8px 0px #1A1A1A0A" }}
              onClick={() => {
                if (selectingMode) setTempSelected(instructorId);
              }}
              role={selectingMode ? "button" : undefined}
            >
              {/* Ribbon */}
{showCurrentRibbon && (
  <div className="absolute -top-3 left-4 flex items-center gap-2
                  rounded-full px-3 py-1.5 text-xs font-semibold
                  bg-gradient-to-r from-green-600 to-green-500
                  text-white shadow-md ring-1 ring-white/20">
    <svg width="14" height="14" viewBox="0 0 20 20" className="shrink-0">
      <circle cx="10" cy="10" r="9" fill="white" opacity="0.18" />
      <path d="M6 10.2l2.1 2.1L14 6.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
    Currently Selected
  </div>
)}


{showPendingRibbon && (
  <div className="absolute -top-3 left-4 flex items-center gap-2
                  rounded-full px-3 py-1.5 text-xs font-semibold
                  bg-gradient-to-r from-blue-600 to-blue-500
                  text-white shadow-md ring-1 ring-white/20">
    <svg width="14" height="14" viewBox="0 0 20 20" className="shrink-0">
      <circle cx="10" cy="10" r="9" fill="white" opacity="0.18" />
      <path d="M5 10h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
    Will be selected
  </div>
)}



              <div className="flex items-center gap-4 mb-3">
                {avatar && (
                  <img
                    src={avatar}
                    alt={fullName}
                    className="w-11 h-11 rounded-full border object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{fullName}</span>
                    {!selectingMode && isSelected && (
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-[#d9f7c3] text-green-600 text-xs font-medium leading-tight">
                        Selected
                      </span>
                    )}
                  </div>
                </div>


                {/* Indicator-only radio */}
                <input
                  type="radio"
                  className="ml-auto w-5 h-5 accent-black pointer-events-none"
                  checked={selectingMode ? isTempSelected : isSelected}
                  readOnly
                  tabIndex={-1}
                />
              </div>


              {isLoading && (
                <div className="text-xs text-gray-500 mb-2">Loading details…</div>
              )}
              {err && (
                <div className="text-xs text-red-600 mb-2">
                  Failed: {String(err)}
                </div>
              )}


              <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-3">
                <div className="flex items-center gap-2 text-sm text-black/80">
                  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <path
                      d="M8 1.5C5.23858 1.5 3 3.73858 3 6.5C3 9.76142 7.07706 14.1683 7.25463 14.3635C7.65456 14.8079 8.34544 14.8079 8.74537 14.3635C8.92294 14.1683 13 9.76142 13 6.5C13 3.73858 10.7614 1.5 8 1.5ZM8 8.5C6.61929 8.5 5.5 7.38071 5.5 6C5.5 4.61929 6.61929 3.5 8 3.5C9.38071 3.5 10.5 4.61929 10.5 6C10.5 7.38071 9.38071 8.5 8 8.5Z"
                      fill="#333"
                    />
                  </svg>
                  {location}
                </div>
                <div className="flex items-center gap-2 text-sm text-black/80">
                  <span>⭐ {Number(rating).toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-black/80">
                  <span>👥 {studentCount}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-black/80">
                  <span>{mode}</span>
                </div>
              </div>


              <div className="italic text-xs text-gray-500 mb-3 leading-snug">
                {desc}
              </div>


              <button
                className="mt-auto flex items-center bg-black text-white rounded-full px-4 py-2 text-xs font-semibold gap-2 w-fit hover:bg-gray-900 transition-all focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  const fallback =
                    "https://cdn.flowplayer.com/a30bd6bc-f98b-47bc-abf5-97633d4faea0/hls/de3f6ca7-2db3-4689-8160-0f574a5996ad/playlist.m3u8";
                  setVideoUrl(introVideoUrl || fallback);
                  setShowVideo(true);
                }}
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1" fill="none" />
                  <polygon points="6,5 12,8 6,11" fill="white" />
                </svg>
                Watch Intro Video
              </button>
            </div>
          );
        })}
      </div>


      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4">
          <div className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 sm:p-6">
            <h3 className="text-xl font-bold mb-2">Confirm Instructor Change</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to switch your instructor for this course?
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Review Again
              </button>
              <button
                onClick={confirmSelecting}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}


      {showVideo && (
        <VideoPlayer
          videoUrl={videoUrl}
          onClose={() => {
            setShowVideo(false);
            setVideoUrl("");
          }}
        />
      )}
    </>
  );
}




function FeeStructureSection({ plans, selectedPlan, onChoose }) {
  const [period, setPeriod] = useState("monthly");
  const [showModal, setShowModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState("monthly");


  if (!plans || plans.length === 0) {
    return <div className="text-gray-400 p-4">No pricing plans available</div>;
  }


  const currentPlan = plans.find((p) => p._id === selectedPlan);


  const handlePlanChange = (planId) => {
    if (planId === selectedPlan) return;
    const newPlan = plans.find((p) => p._id === planId);
    setPendingPlan(newPlan);
    setShowModal(true);
  };


  const confirmPlanChange = () => {
    if (pendingPlan) {
      onChoose(pendingPlan._id);
      setCurrentPeriod(period);
      setPendingPlan(null);
    }
  };


  return (
    <div>
      <div className="rounded-2xl bg-[#202123] mb-6 p-8 text-white flex flex-col items-center justify-center text-center">
        <h2 className="text-3xl font-bold mb-2">Choose your Plan</h2>
        <div className="text-base font-light mb-4 opacity-80">
          Simple pricing. No hidden fees. Advanced features for your business.
        </div>
        <div className="flex gap-3 justify-center">
          <button
            className={`px-4 py-2 rounded-full font-semibold transition ${
              period === "monthly"
                ? "bg-white text-black"
                : "bg-[#202123] border border-white/50 text-white/80 hover:bg-white/10"
            }`}
            onClick={() => setPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 rounded-full font-semibold transition ${
              period === "full"
                ? "bg-white text-black"
                : "bg-[#202123] border border-white/50 text-white/80 hover:bg-white/10"
            }`}
            onClick={() => setPeriod("full")}
          >
            Full Payment
          </button>
        </div>
        {period === "full" && (
          <div className="mt-3 text-sm bg-green-600 text-white px-3 py-1 rounded-full">
            💰 Save with full payment discount!
          </div>
        )}
      </div>


      <div className="text-sm mb-5 text-gray-500">
        The fees for weekend sessions may vary.{" "}
        {period === "monthly"
          ? "Monthly billing will continue until you cancel."
          : "Full payment includes the entire course with a discount."}
      </div>


      <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
        {plans.map((p) => {
          const monthlyPrice = p.monthlyFee || 0;
          const fullPrice = p.fullPayment || 0;
          const displayPrice = period === "monthly" ? monthlyPrice : fullPrice;
          const isSelected = selectedPlan === p._id && currentPeriod === period;
          const sessionName = p.sessionType || "Plan";


          return (
            <div
              key={p._id}
              className={`border rounded-2xl bg-white p-6 relative transition-all hover:shadow-lg ${
                isSelected ? "border-black shadow-md" : "border-gray-200"
              }`}
            >
              <div className="text-lg font-bold mb-1">{sessionName}</div>
              <div className="text-2xl font-black mb-3">
                ₹{displayPrice.toLocaleString()}{" "}
                <span className="font-normal text-sm">
                  {period === "monthly" ? "/month" : "/full course"}
                </span>
              </div>


              {isSelected ? (
                <button
                  disabled
                  className="w-full bg-gray-100 mt-1 rounded-lg py-2 font-semibold text-gray-500 cursor-not-allowed"
                >
                  Your Current Plan
                </button>
              ) : (
                <button
                  className="w-full bg-black text-white mt-1 rounded-lg py-2 font-semibold hover:bg-gray-900 transition"
                  onClick={() => handlePlanChange(p._id)}
                >
                  Choose Plan
                </button>
              )}


              <ul className="mt-4 mb-1 space-y-2">
                <li className="flex gap-2 items-center text-sm text-gray-700">
                  <svg width="12" height="12" fill="black" viewBox="0 0 10 11">
                    <path d="M7.14032 4.10969C7.17518 4.14451 7.20284 4.18587 7.22171 4.2314C7.24058 4.27692 7.2503 4.32572 7.2503 4.375C7.2503 4.42428 7.24058 4.47308 7.22171 4.5186C7.20284 4.56413 7.17518 4.60549 7.14032 4.64031L4.51532 7.26531C4.48049 7.30018 4.43913 7.32784 4.3936 7.34671C4.34808 7.36558 4.29928 7.37529 4.25 7.37529C4.20072 7.37529 4.15192 7.36558 4.1064 7.34671C4.06088 7.32784 4.01952 7.30018 3.98469 7.26531L2.85969 6.14031C2.78932 6.06995 2.74979 5.97451 2.74979 5.875C2.74979 5.77549 2.78932 5.68005 2.85969 5.60969C2.93005 5.53932 3.02549 5.49979 3.125 5.49979C3.22451 5.49979 3.31995 5.53932 3.39031 5.60969L4.25 6.46984L6.60969 4.10969C6.64452 4.07482 6.68588 4.04716 6.7314 4.02829C6.77692 4.00942 6.82572 3.9997 6.875 3.9997C6.92428 3.9997 6.97308 4.00942 7.0186 4.02829C7.06413 4.04716 7.10549 4.07482 7.14032 4.10969ZM9.875 5.5C9.875 6.46418 9.58909 7.40671 9.05342 8.2084C8.51775 9.01009 7.75637 9.63494 6.86558 10.0039C5.97479 10.3729 4.99459 10.4694 4.04894 10.2813C3.10328 10.0932 2.23464 9.62893 1.55286 8.94715C0.871076 8.26536 0.406777 7.39672 0.218674 6.45107C0.030571 5.50541 0.127112 4.52521 0.496089 3.63442C0.865067 2.74363 1.48991 1.98226 2.2916 1.44659C3.09329 0.910914 4.03582 0.625 5 0.625C6.29251 0.626365 7.5317 1.14042 8.44564 2.05436C9.35958 2.96831 9.87364 4.20749 9.875 5.5ZM9.125 5.5C9.125 4.68415 8.88307 3.88663 8.42981 3.20827C7.97655 2.52992 7.33232 2.00121 6.57857 1.689C5.82483 1.37679 4.99543 1.2951 4.19525 1.45426C3.39508 1.61342 2.66008 2.00629 2.08319 2.58318C1.5063 3.16008 1.11343 3.89508 0.954263 4.69525C0.795099 5.49542 0.876788 6.32482 1.189 7.07857C1.50121 7.83231 2.02992 8.47655 2.70827 8.92981C3.38663 9.38307 4.18415 9.625 5 9.625C6.09364 9.62376 7.14213 9.18876 7.91545 8.41545C8.68877 7.64213 9.12376 6.59364 9.125 5.5Z"
                  />
                  </svg>
                  {p.discount || 0}% Discount
                </li>
                <li className="flex gap-2 items-center text-sm text-gray-700">
                  <svg width="12" height="12" fill="black" viewBox="0 0 10 11">
                    <path d="M7.14032 4.10969C7.17518 4.14451 7.20284 4.18587 7.22171 4.2314C7.24058 4.27692 7.2503 4.32572 7.2503 4.375C7.2503 4.42428 7.24058 4.47308 7.22171 4.5186C7.20284 4.56413 7.17518 4.60549 7.14032 4.64031L4.51532 7.26531C4.48049 7.30018 4.43913 7.32784 4.3936 7.34671C4.34808 7.36558 4.29928 7.37529 4.25 7.37529C4.20072 7.37529 4.15192 7.36558 4.1064 7.34671C4.06088 7.32784 4.01952 7.30018 3.98469 7.26531L2.85969 6.14031C2.78932 6.06995 2.74979 5.97451 2.74979 5.875C2.74979 5.77549 2.78932 5.68005 2.85969 5.60969C2.93005 5.53932 3.02549 5.49979 3.125 5.49979C3.22451 5.49979 3.31995 5.53932 3.39031 5.60969L4.25 6.46984L6.60969 4.10969C6.64452 4.07482 6.68588 4.04716 6.7314 4.02829C6.77692 4.00942 6.82572 3.9997 6.875 3.9997C6.92428 3.9997 6.97308 4.00942 7.0186 4.02829C7.06413 4.04716 7.10549 4.07482 7.14032 4.10969ZM9.875 5.5C9.875 6.46418 9.58909 7.40671 9.05342 8.2084C8.51775 9.01009 7.75637 9.63494 6.86558 10.0039C5.97479 10.3729 4.99459 10.4694 4.04894 10.2813C3.10328 10.0932 2.23464 9.62893 1.55286 8.94715C0.871076 8.26536 0.406777 7.39672 0.218674 6.45107C0.030571 5.50541 0.127112 4.52521 0.496089 3.63442C0.865067 2.74363 1.48991 1.98226 2.2916 1.44659C3.09329 0.910914 4.03582 0.625 5 0.625C6.29251 0.626365 7.5317 1.14042 8.44564 2.05436C9.35958 2.96831 9.87364 4.20749 9.875 5.5ZM9.125 5.5C9.125 4.68415 8.88307 3.88663 8.42981 3.20827C7.97655 2.52992 7.33232 2.00121 6.57857 1.689C5.82483 1.37679 4.99543 1.2951 4.19525 1.45426C3.39508 1.61342 2.66008 2.00629 2.08319 2.58318C1.5063 3.16008 1.11343 3.89508 0.954263 4.69525C0.795099 5.49542 0.876788 6.32482 1.189 7.07857C1.50121 7.83231 2.02992 8.47655 2.70827 8.92981C3.38663 9.38307 4.18415 9.625 5 9.625C6.09364 9.62376 7.14213 9.18876 7.91545 8.41545C8.68877 7.64213 9.12376 6.59364 9.125 5.5Z"
                  />
                  </svg>
                  Certificate of completion
                </li>
              </ul>


              {isSelected && (
                <div className="absolute -top-2 -right-2 bg-black text-white text-xs px-2 py-1 rounded-full font-semibold">
                  Current
                </div>
              )}
            </div>
          );
        })}
      </div>


      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-50 p-3 sm:items-center sm:p-4">
          <div className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 sm:p-6">
            <h3 className="text-xl font-bold mb-4">Change Plan Confirmation</h3>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                onClick={() => {
                  setShowModal(false);
                  setPendingPlan(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmPlanChange();
                  setShowModal(false);
                }}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function CourseDetail({ course, onBack, showHeader = true }) {
 
  const dispatch = useDispatch();
  const { selectedTeacher, loading, error, byId, loadingById, errorById } = useSelector(
    (state) => state.teachers
  );



  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedInstructor, setSelectedInstructor] = useState(
    course?.teacher?.[0]?._id || null
  );
  const [selectedPlan, setSelectedPlan] = useState(
    course?.price?.find((p) => p.isSelected)?._id || course?.price?.[0]?._id || null
  );



  useEffect(() => {
    if (selectedInstructor) {
      dispatch(fetchTeacherById(selectedInstructor));
    }
  }, [selectedInstructor, dispatch]);



  const instructors = course?.teacher || [];
  useEffect(() => {
    const ids = (instructors || []).map((t) => t?._id).filter(Boolean);
    if (!ids.length) return;
    ids.forEach((id) => {
      if (!byId?.[id] && !loadingById?.[id]) {
        dispatch(fetchTeacherById(id));
      }
    });
  }, [instructors, byId, loadingById, dispatch]);



  const curriculum = course?.content?.[0]?.modules || [];
  const plans = course?.price || [];


  const mySlot = course?.mySlot || {
    dayRange: "Mon-Thu",
    timeRange: "5 PM to 6 PM",
  };

  const nextClass = course?.nextClass || {
    dateTime: null,
    label: "5:00 PM, Today",
    joinUrl: "#",
  };

  const progressPct =
    typeof course?.progress === "number" ? Math.max(0, Math.min(100, course.progress)) : 30;

  const fmtTime = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const today = new Date();
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
      return `${t}, ${isToday ? "Today" : d.toLocaleDateString()}`;
    } catch {
      return null;
    }
  };


  if (!course) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl font-bold">Course Not Found</div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#fafafb] px-4 sm:px-8 py-6 font-sans flex justify-center">
      <div className="w-full max-w-screen-xl">
        {showHeader && (
          <>
            <div className="rounded-2xl overflow-hidden mb-6">
              <img
                src={course.image}
                alt={course.name}
                className="w-full h-[160px] sm:h-[200px] md:h-[220px] lg:h-[240px] object-cover"
              />
            </div>


            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-1">
                  {course.name}
                </h1>
                <div className="text-base sm:text-lg text-gray-600">
                  By {course.teacher?.[0]?.teacherDetail?.name?.firstName || "Instructor"}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center font-normal text-sm h-7 px-4 py-1 rounded-full bg-blue-100 text-blue-700">
                    {course.level?.charAt(0).toUpperCase() + course.level?.slice(1) || "Beginner"}
                  </span>
                  <span className="inline-flex items-center font-normal text-sm h-7 px-4 py-1 rounded-full bg-green-100 text-green-700">
                    {course.mode?.charAt(0).toUpperCase() + course.mode?.slice(1) || "Online"}
                  </span>
                  <span className="inline-flex items-center font-normal text-sm h-7 px-4 py-1 rounded-full bg-purple-100 text-purple-700">
                    {course.certification || "Certificate"}
                  </span>
                </div>
              </div>
            </div>

            {/* NEW: My Slot, Upcoming Class, Course Progress */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {/* My Slot */}
              <div className="rounded-2xl border bg-white p-5 flex flex-col" style={{ boxShadow: "0px 2px 8px 0px #1A1A1A0A" }}>
                <div className="text-sm text-gray-500 mb-2">My Slot</div>
                <div className="text-black font-semibold text-[15px]">
                  {mySlot?.dayRange || "Mon-Thu"} ({mySlot?.timeRange || "5 PM to 6 PM"})
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-300 hover:bg-gray-50 transition"
                    onClick={() => {/* open your slot change modal/flow here */}}
                  >
                    Change Slot
                  </button>
                </div>
              </div>

              {/* Upcoming Class */}
              <div className="rounded-2xl border bg-white p-5 flex items-center justify-between" style={{ boxShadow: "0px 2px 8px 0px #1A1A1A0A" }}>
                <div>
                  <div className="text-sm text-gray-500">Upcoming Class</div>
                  <div className="text-black font-semibold text-[15px] mt-1">
                    {nextClass?.label || fmtTime(nextClass?.dateTime) || "—"}
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-gray-900 transition"
                  onClick={() => {
                    if (nextClass?.joinUrl && nextClass.joinUrl !== "#") {
                      window.open(nextClass.joinUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  Join Class
                </button>
              </div>

              {/* Course Progress */}
              <div className="rounded-2xl border bg-white p-5" style={{ boxShadow: "0px 2px 8px 0px #1A1A1A0A" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-500">Course Progress</div>
                  <div className="text-xs text-gray-600">{progressPct}%</div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-[#7AC6FF]"
                    style={{ width: `${progressPct}%`, transition: "width 300ms ease" }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-2">Text</div>
              </div>
            </div>
          </>
        )}


        <div className="flex items-center gap-4 mt-6 mb-4 border-b overflow-x-auto">
          {["Overview", "Curriculum", "Instructors", "Fee Structure"].map((tab) => (
            <button
              key={tab}
              className={`py-2 border-b-2 transition ${
                activeTab === tab
                  ? "border-[#23243C] text-[#23243C] font-semibold"
                  : "border-transparent text-gray-400 font-medium hover:text-gray-600"
              } text-base whitespace-nowrap`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>


        {activeTab === "Overview" && (
          <div className="mt-6 max-w-2xl">
            <div className="font-bold text-lg mb-2">About the Course</div>
            <p className="text-gray-700 mb-6">{course.description}</p>
            <div className="font-bold text-lg mb-2">Course Rating</div>
            <div className="flex items-center mb-4">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M17.6165 7.15949C17.5384 6.91927 17.3909 6.70756 17.1927 6.55101C16.9944 6.39447 16.7543 6.3001 16.5025 6.2798L11.8931 5.90792L10.1134 1.60402C10.0172 1.3695 9.85335 1.1689 9.6428 1.02772C9.43226 0.886539 9.18448 0.811157 8.93099 0.811157C8.67749 0.811157 8.42971 0.886539 8.21917 1.02772C8.00862 1.1689 7.84481 1.3695 7.74856 1.60402L5.97044 5.90714L1.35872 6.2798C1.10651 6.30113 0.866211 6.39641 0.667918 6.55371C0.469625 6.71101 0.322161 6.92332 0.244001 7.16406C0.165841 7.4048 0.160462 7.66324 0.228536 7.90702C0.296611 8.1508 0.435113 8.36907 0.626688 8.53449L4.14231 11.5681L3.07122 16.104C3.01132 16.3504 3.02598 16.6091 3.11336 16.8472C3.20073 17.0853 3.35688 17.292 3.56197 17.4412C3.76706 17.5904 4.01185 17.6752 4.26526 17.685C4.51868 17.6948 4.76929 17.6291 4.98528 17.4962L8.93059 15.0681L12.8783 17.4962C13.0943 17.6275 13.3444 17.692 13.597 17.6814C13.8497 17.6709 14.0935 17.5859 14.2979 17.437C14.5023 17.2882 14.6581 17.0822 14.7457 16.845C14.8332 16.6078 14.8486 16.35 14.79 16.104L13.715 11.5673L17.2306 8.5337C17.4237 8.36857 17.5635 8.14982 17.6322 7.90519C17.7009 7.66055 17.6954 7.40102 17.6165 7.15949Z"
                  fill="#FFD36E"
                />
              </svg>
              <span className="font-semibold text-base ml-1">4.5</span>
              <span className="text-gray-500 ml-2 text-sm">(128 ratings)</span>
            </div>
            <div className="font-bold text-lg my-2">What you will learn</div>
            <ul className="grid gap-2 mb-4">
              {(course.objectives || []).length > 0 ? (
                course.objectives.map((item, i) => (
                  <li className="flex items-center text-green-600" key={i}>
                    <svg
                      className="w-5 h-5 mr-2 flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <circle cx="10" cy="10" r="9" fill="#94E9B8" />
                      <path
                        d="M9.9 5.8a1.55 1.55 0 0 1-.6.7L6.4 9.4a1.5 1.5 0 0 1-2.1 0l-.7-.7c-.5-.5-.5-1.3 0-1.8.5-.5 1.3-.5 1.8 0l.8.8 2.6-2.7a1.3 1.3 0 0 1 1.8 0 .96.96 0 0 1 .1 1.3z"
                        fill="white"
                      />
                    </svg>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-400">No learning topics listed.</li>
              )}
            </ul>
          </div>
        )}
        {activeTab === "Curriculum" && (
          <div className="mt-6">
            <CurriculumSection curriculum={curriculum} />
          </div>
        )}
        {activeTab === "Instructors" && (
          <div className="mt-6">
            <InstructorsSection
              instructors={instructors}
              selected={selectedInstructor}
              onSelect={setSelectedInstructor}
              byId={byId}
              loadingById={loadingById}
              errorById={errorById}
            />
          </div>
        )}
        {activeTab === "Fee Structure" && (
          <div className="mt-6">
            <FeeStructureSection
              plans={plans}
              selectedPlan={selectedPlan}
              onChoose={setSelectedPlan}
            />
          </div>
        )}
      </div>
    </div>
  );
}
