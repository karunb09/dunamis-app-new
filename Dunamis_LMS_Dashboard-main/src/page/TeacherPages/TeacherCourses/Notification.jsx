import React, { useState } from "react";
import { Bell, CheckCircle, BookOpen, Calendar, RefreshCw } from "react-router-dom";

const Notification = () => {
  const [open, setOpen] = useState(false);

  const notifications = [
    {
      id: 1,
      title: "New Reschedule Request",
      time: "42m ago",
      icon: <RefreshCw className="w-4 h-4 text-blue-500" />,
    },
    {
      id: 2,
      title: "Feedback released",
      time: "1h ago",
      icon: <CheckCircle className="w-4 h-4 text-green-500" />,
    },
    {
      id: 3,
      title: "New course released",
      time: "6h ago",
      icon: <BookOpen className="w-4 h-4 text-purple-500" />,
    },
    {
      id: 4,
      title: "Lesson completed",
      time: "2d ago",
      icon: <CheckCircle className="w-4 h-4 text-green-500" />,
    },
    {
      id: 5,
      title: "Class Rescheduled",
      time: "1w ago",
      icon: <Calendar className="w-4 h-4 text-orange-500" />,
    },
  ];

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {/* Notification Dot */}
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white shadow-lg rounded-xl border border-gray-200 z-50">
          <div className="px-4 py-2 border-b font-semibold text-gray-700">
            Notifications
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <span>{item.icon}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">
                    {item.title}
                  </span>
                  <span className="text-xs text-gray-500">{item.time}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 py-2 text-center border-t text-sm text-blue-600 cursor-pointer hover:underline">
            View all
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification;
