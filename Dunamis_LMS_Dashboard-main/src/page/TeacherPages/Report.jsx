import React from "react";
import {
  HiOutlineChartBar,
  HiOutlineClock,
  HiOutlineUserGroup,
  HiOutlineArrowRight,
  HiOutlineArrowPath,
  HiOutlineArrowDownTray,
} from "react-icons/hi2";

const Report = () => {
  return (
    <div className="w-full min-h-screen bg-white p-4 md:p-6">
      {/* ======= Summary Section ======= */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        This Month's Summary
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Classes Completed */}
        <div className="flex items-center justify-between bg-gray-50 border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <HiOutlineChartBar className="h-6 w-6 text-gray-500" />
            <div>
              <p className="text-gray-500 text-sm">Classes Completed</p>
              <p className="text-lg font-semibold text-gray-800">12 of 20</p>
            </div>
          </div>
          <span className="text-cyan-200 font-semibold text-lg">67%</span>
        </div>

        {/* Total Teaching Hours */}
        <div className="flex items-center justify-between bg-gray-50 border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <HiOutlineClock className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="text-gray-500 text-sm">Total Teaching Hours</p>
              <p className="text-lg font-semibold text-gray-800">July</p>
            </div>
          </div>
          <span className="text-yellow-500 font-semibold text-lg">32h</span>
        </div>

        {/* Students Taught */}
        <div className="flex items-center justify-between bg-gray-50 border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <HiOutlineUserGroup className="h-6 w-6 text-red-500" />
            <div>
              <p className="text-gray-500 text-sm">Students Taught</p>
              <p className="text-lg font-semibold text-gray-800">July</p>
            </div>
          </div>
          <span className="text-red-500 font-semibold text-lg">12</span>
        </div>
      </div>

   {/* ======= My Performance ======= */}

<div className="flex items-center justify-between mb-4">
  {/* Left side heading */}
  <h2 className="text-lg font-semibold text-gray-800">
    My Performance
  </h2>

  {/* Right side buttons */}
  <div className="flex flex-row items-center gap-2">
    <button className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-sm border rounded-lg hover:bg-gray-100">
      <HiOutlineArrowPath className="h-3 w-3 md:h-4 md:w-4" /> Refresh
    </button>
    <button className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-sm border rounded-lg hover:bg-gray-100">
      <HiOutlineArrowDownTray className="h-3 w-3 md:h-4 md:w-4" /> Download
    </button>
  </div>
</div>



      {/* ======= July 2025 ======= */}
      <div className="mb-8">
        <h3 className="text-md md:text-md font-semibold text-gray-800 mb-3">
          July 2025
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-gray-500 text-sm">Total Hours</p>
            <p className="text-lg font-semibold text-gray-800">140</p>
            <p className="text-xs text-gray-400">
              98h group classes | 32h individual classes
            </p>
          </div>
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-gray-500 text-sm">Classes Missed</p>
            <p className="text-lg font-semibold text-gray-800">01</p>
            <p className="text-xs text-gray-400">
              1 group session | 0 individual sessions
            </p>
          </div>
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-gray-500 text-sm">Group Students</p>
            <p className="text-lg font-semibold text-gray-800">12</p>
            <p className="text-xs text-gray-400">1 class rescheduled</p>
          </div>
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-gray-500 text-sm">Individual Students</p>
            <p className="text-lg font-semibold text-gray-800">4</p>
            <p className="text-xs text-gray-400">0 classes rescheduled</p>
          </div>
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-gray-500 text-sm">Demo Students</p>
            <p className="text-lg font-semibold text-gray-800">09</p>
            <p className="text-xs text-gray-400">2 new students</p>
          </div>
        </div>

         <div className="bg-gray-50 p-4 rounded-xl shadow-sm flex justify-between items-center mt-6">
  <div>
    <p className="text-sm text-gray-500">Monthly Remuneration</p>
    <p className="font-semibold text-gray-800">₹ ----</p>
    <p className="text-xs text-gray-400">View on 30 July, 2025</p>
  </div>
  <Link
    to="#"
    className="text-sm font-medium text-gray-600 hover:text-gray-800"
  >
    View Details →
  </Link>
</div>

      </div>

      {/* ======= June 2025 ======= */}
      <div>
        <h3 className="text-md md:text-md font-semibold text-gray-800 mb-3">
          June 2025
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-gray-500 text-sm">Total Hours</p>
            <p className="text-lg font-semibold text-gray-800">140</p>
            <p className="text-xs text-gray-400">
              98h group classes | 32h individual classes
            </p>
          </div>
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-gray-500 text-sm">Classes Missed</p>
            <p className="text-lg font-semibold text-gray-800">01</p>
            <p className="text-xs text-gray-400">
              1 group session | 0 individual sessions
            </p>
          </div>
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-gray-500 text-sm">Group Students</p>
            <p className="text-lg font-semibold text-gray-800">12</p>
            <p className="text-xs text-gray-400">1 class rescheduled</p>
          </div>
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-gray-500 text-sm">Individual Students</p>
            <p className="text-lg font-semibold text-gray-800">4</p>
            <p className="text-xs text-gray-400">0 classes rescheduled</p>
          </div>
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-gray-500 text-sm">Demo Students</p>
            <p className="text-lg font-semibold text-gray-800">09</p>
            <p className="text-xs text-gray-400">2 new students</p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl shadow-sm flex justify-between items-center mt-6">
  <div>
    <p className="text-sm text-gray-500">Monthly Remuneration</p>
    <p className="font-semibold text-gray-800">₹21,740</p>
    <p className="text-xs text-gray-400">Due 07 Aug 2025</p>
  </div>
  <Link
    to="#"
    className="text-sm font-medium text-gray-600 hover:text-gray-800"
  >
    View Details →
  </Link>
</div>
      </div>
    </div>
  );
};

export default Report;
