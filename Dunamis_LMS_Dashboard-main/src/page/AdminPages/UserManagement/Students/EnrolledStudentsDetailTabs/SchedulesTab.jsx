const SchedulesTab = ({ student }) => {
    const schedules = student.scheduleData || [];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {schedules.map((schedule) => (
                <div key={schedule.id} className={`rounded-xl border overflow-hidden shadow-sm ${schedule.bgColor}`}>
                    <div className="flex justify-between items-center px-4 py-2 bg-white">
                        <div className="text-sm font-medium text-gray-800">
                            {schedule.days}
                            <div className="text-xs text-gray-500">{schedule.time}</div>
                        </div>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{schedule.sessionType}</span>
                    </div>
                    <div className="px-4 py-3">
                        <h3 className="text-lg font-semibold text-gray-900">{schedule.courseTitle}</h3>
                        <p className="text-sm text-gray-600">Since {schedule.since}</p>
                        <div className="mt-3 flex -space-x-2">
                            {schedule.participants.map((p, idx) => (
                                <img key={idx} src={p.avatar} alt={p.name} className="w-7 h-7 rounded-full border-2 border-white" />
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SchedulesTab;
