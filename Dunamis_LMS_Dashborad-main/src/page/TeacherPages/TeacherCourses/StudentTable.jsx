import React from "react";

const StudentTable = ({ groupStudents, individualStudents }) => {
  return (
    <>
      {/* Group Class Students */}
      <div className="mb-6 border-t border-gray-200">
        <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-2 mt-6">
          Group Class Students
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full text-[12px] sm:text-sm border-collapse table-auto">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="py-2 px-2 text-left">
                  <input type="checkbox" className="rounded" />
                </th>
                {/* <th className="py-2 px-2 text-left whitespace-nowrap">Student ID</th> */}
                <th className="py-2 px-2 text-left whitespace-nowrap">User</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">Course Category</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">Course Name</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">Mode</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">Progress</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">Modules Completed</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {groupStudents.map((student, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-1 px-2">
                    <input type="checkbox" className="rounded" />
                  </td>
                  {/* <td className="py-1 px-2 text-gray-900 whitespace-nowrap">{student.id}</td> */}

                  {/* User cell with responsive flex */}
                  <td className="py-1 px-2 flex flex-wrap items-center gap-1 sm:gap-2">
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
                    />
                    <span className="text-[11px] sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">
                      {student.name}
                    </span>
                  </td>

                  <td className="py-1 px-2 whitespace-nowrap">
                    <button className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-[10px] sm:text-xs">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3 h-3 text-black"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 19V6l12-2v13" />
                        <circle cx="6" cy="19" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                      Music
                    </button>
                  </td>

                  <td className="py-1 px-2 text-gray-900 whitespace-nowrap">{student.course}</td>
                  <td className="py-1 px-2 whitespace-nowrap">
                    <span className="text-green-600 font-medium text-[10px] sm:text-[12px]">• Online</span>
                  </td>
                  <td className="py-1 px-2 text-gray-900 whitespace-nowrap">{student.progress}</td>
                  <td className="py-1 px-2 text-gray-900 whitespace-nowrap">{student.modules}</td>
                  <td className="py-1 px-2 text-gray-900 whitespace-nowrap">{student.schedule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Class Students */}
      <div className="mb-6">
        <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
          Individual Class Students
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full text-[12px] sm:text-sm border-collapse table-auto">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="py-2 px-2 text-left">
                  <input type="checkbox" className="rounded" />
                </th>
                {/* <th className="py-2 px-2 text-left whitespace-nowrap">Student ID</th> */}
                <th className="py-2 px-2 text-left whitespace-nowrap">User</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">Course Category</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">Course Name</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">Mode</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">Progress</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">Modules Completed</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {individualStudents.map((student, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-1 px-2">
                    <input type="checkbox" className="rounded" />
                  </td>
                  {/* <td className="py-1 px-2 text-gray-900 whitespace-nowrap">{student.id}</td> */}

                  {/* User cell */}
                  <td className="py-1 px-2 flex flex-wrap items-center gap-1 sm:gap-2">
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
                    />
                    <span className="text-[11px] sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">
                      {student.name}
                    </span>
                  </td>

                  <td className="py-1 px-2 whitespace-nowrap">
                    <button className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-[10px] sm:text-xs">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3 h-3 text-black"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 19V6l12-2v13" />
                        <circle cx="6" cy="19" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                      Music
                    </button>
                  </td>

                  <td className="py-1 px-2 text-gray-900 whitespace-nowrap">{student.course}</td>
                  <td className="py-1 px-2 whitespace-nowrap">
                    <span className="text-green-600 font-medium text-[10px] sm:text-[12px]">• Online</span>
                  </td>
                  <td className="py-1 px-2 text-gray-900 whitespace-nowrap">{student.progress}</td>
                  <td className="py-1 px-2 text-gray-900 whitespace-nowrap">{student.modules}</td>
                  <td className="py-1 px-2 text-gray-900 whitespace-nowrap">{student.schedule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default StudentTable;
