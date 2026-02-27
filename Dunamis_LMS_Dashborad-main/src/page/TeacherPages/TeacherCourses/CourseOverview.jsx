import React from "react";

const CourseOverview = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 mt-5">
      {/* Course Status */}
     <div className="bg-gray-100 rounded-xl p-4 shadow-md min-h-[150px]">
  <h3 className="text-lg font-medium text-gray-900 mb-6 text-left sm:text-lg">
    Course Status
  </h3>
  <div className="flex flex-nowrap overflow-x-auto sm:flex-row sm:justify-between sm:divide-x divide-gray-300">
    <div className="flex-shrink-0 flex-1 px-3 py-2 sm:py-0">
      <p className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">Total Students</p>
      <p className="text-sm sm:text-base font-semibold text-gray-900 whitespace-nowrap">6</p>
    </div>
    <div className="flex-shrink-0 flex-1 px-3 py-2 sm:py-0">
      <p className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">Classes Completed</p>
      <p className="text-sm sm:text-base font-semibold text-gray-900 whitespace-nowrap">3/4</p>
    </div>
    <div className="flex-shrink-0 flex-1 px-3 py-2 sm:py-0">
      <p className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">Monthly Progress</p>
      <p className="text-sm sm:text-base font-semibold text-gray-900 whitespace-nowrap">75%</p>
    </div>
    <div className="flex-shrink-0 flex-1 px-3 py-2 sm:py-0">
      <p className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">Next Class</p>
      <p className="text-sm sm:text-base font-semibold text-gray-900 whitespace-nowrap">5 PM, Today</p>
    </div>
  </div>
</div>


      {/* Schedule */}
      <div className="bg-gray-100 rounded-xl p-4 shadow-md min-h-[150px]">
  <h3 className="text-lg font-medium text-gray-900 mb-6 text-left sm:text-lg">
    Schedule
  </h3>
  <div className="flex flex-nowrap overflow-x-auto divide-x divide-gray-300 font-opensans gap-6">
    
    <div className="flex-shrink-0 px-2 flex flex-col">
      <p className="text-xs sm:text-sm font-medium text-gray-500 whitespace-nowrap">Group Class</p>
      <p className="text-sm sm:text-base font-semibold text-gray-900 whitespace-nowrap">Wed - Sat</p>
      <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">4 PM to 5 PM</p>
    </div>

    <div className="flex-shrink-0 px-2 flex flex-col">
      <p className="text-xs sm:text-sm font-medium text-gray-500 whitespace-nowrap">Individual Class</p>
      <p className="text-sm sm:text-base font-semibold text-gray-900 whitespace-nowrap">Mon - Thu | Tue - Fri</p>
      <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">6 PM to 9 PM | 5 PM to 8 PM</p>
    </div>

  </div>
</div>

    </div>
  );
};

export default CourseOverview;
