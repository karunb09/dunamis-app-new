import { User, Users } from "phosphor-react";

export default function ScheduleTab() {
    return (
        <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Card */}
                <div className="rounded-xl border border-gray-300 overflow-hidden w-full max-w-sm">
                    {/* Header with schedule and group tag */}
                    <div className="bg-white px-4 pt-4 pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-sm font-medium text-gray-700">Mon - Thu</div>
                                <div className="text-xs text-gray-500">8:00 PM - 9:00 PM</div>
                            </div>
                            <div className="bg-gray-200 text-gray-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                                <span><Users/></span> Group Session
                            </div>
                        </div>
                    </div>

                    {/* Body with course name and date */}
                    <div className="bg-cyan-50 px-4 pt-2 pb-4">
                        <div className="text-lg font-semibold text-gray-800 mb-1">
                            Keyboard Fundamentals
                        </div>
                        <div className="text-xs text-gray-600 mb-3">Since 20 May 2025</div>

                        {/* Avatars */}
                        <div className="flex space-x-[-8px]">
                            <img
                                className="w-8 h-8 rounded-full border-2 border-white"
                                src="https://randomuser.me/api/portraits/men/1.jpg"
                                alt="User 1"
                            />
                            <img
                                className="w-8 h-8 rounded-full border-2 border-white"
                                src="https://randomuser.me/api/portraits/women/2.jpg"
                                alt="User 2"
                            />
                            <img
                                className="w-8 h-8 rounded-full border-2 border-white"
                                src="https://randomuser.me/api/portraits/men/3.jpg"
                                alt="User 3"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
