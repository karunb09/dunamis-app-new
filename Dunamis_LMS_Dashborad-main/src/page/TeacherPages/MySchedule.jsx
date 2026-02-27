import React, { useEffect, useMemo, useState } from "react";

const MySchedule = () => {
  const times = [
    "12 AM","1 AM","2 AM","3 AM","4 AM","5 AM","6 AM","7 AM","8 AM","9 AM","10 AM","11 AM",
    "12 PM","1 PM","2 PM","3 PM","4 PM","5 PM","6 PM","7 PM",
    "8 PM","9 PM","10 PM","11 PM"
  ];

  const profiles = [
    { src: "https://randomuser.me/api/portraits/women/1.jpg", alt: "AK" },
    { src: "https://randomuser.me/api/portraits/men/2.jpg", alt: "SJ" },
    { src: "https://randomuser.me/api/portraits/men/3.jpg", alt: "RK" },
    { src: "https://randomuser.me/api/portraits/women/4.jpg", alt: "VP" },
  ];

  const dayShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const startOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diffToMonday = (day + 6) % 7;
    d.setDate(d.getDate() - diffToMonday);
    d.setHours(0,0,0,0);
    return d;
  };

  const formatDayLabel = (date) => `${dayShort[date.getDay()]} ${date.getDate()}`;

  const addDays = (date, daysToAdd) => {
    const d = new Date(date);
    d.setDate(d.getDate() + daysToAdd);
    return d;
  };

  const [anchorDate, setAnchorDate] = useState(new Date());
  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dayLabels = useMemo(() => weekDays.map(formatDayLabel), [weekDays]);

  const [eventPatterns, setEventPatterns] = useState([
    { 
      id: 1, 
      offset: 1, 
      time: "4 PM", 
      duration: 1, 
      title: "Keyboard Fundamentals", 
      color: "bg-yellow-100", 
      people: [profiles[0], profiles[1], profiles[2]],
      instructor: "John Smith",
      room: "Room A",
      description: "Learn basic keyboard techniques and music theory",
      joinLink: "https://meet.google.com/abc-defg-hij"
    },
    { 
      id: 2, 
      offset: 1, 
      time: "6 PM", 
      duration: 1, 
      title: "Keyboard Advanced", 
      color: "bg-cyan-100", 
      people: [profiles[3]],
      instructor: "John Smith",
      room: "Room B",
      description: "Advanced keyboard techniques and composition",
      joinLink: "https://meet.google.com/xyz-1234-567"
    },
    { 
      id: 3, 
      offset: 0, 
      time: "8 PM", 
      duration: 1, 
      title: "Keyboard Fundamentals", 
      color: "bg-yellow-100", 
      people: [profiles[0], profiles[1], profiles[2]],
      instructor: "John Smith",
      room: "Room A",
      description: "Learn basic keyboard techniques and music theory",
      joinLink: "https://meet.google.com/abc-defg-hij"
    },
    { 
      id: 4, 
      offset: 2, 
      time: "10 PM", 
      duration: 1, 
      title: "Keyboard Advanced", 
      color: "bg-cyan-100", 
      people: [profiles[3]],
      instructor: "John Smith",
      room: "Room B",
      description: "Advanced keyboard techniques and composition",
      joinLink: "https://meet.google.com/xyz-1234-567"
    },
    { 
      id: 5, 
      offset: 3, 
      time: "8 PM", 
      duration: 1, 
      title: "Keyboard Fundamentals", 
      color: "bg-yellow-100", 
      people: [profiles[0], profiles[1], profiles[2]],
      instructor: "John Smith",
      room: "Room A",
      description: "Learn basic keyboard techniques and music theory",
      joinLink: "https://meet.google.com/abc-defg-hij"
    },
    { 
      id: 6, 
      offset: 4, 
      time: "4 PM", 
      duration: 1, 
      title: "Keyboard Fundamentals", 
      color: "bg-yellow-100", 
      people: [profiles[0], profiles[1], profiles[2]],
      instructor: "John Smith",
      room: "Room A",
      description: "Learn basic keyboard techniques and music theory",
      joinLink: "https://meet.google.com/abc-defg-hij"
    },
    { 
      id: 7, 
      offset: 4, 
      time: "6 PM", 
      duration: 1, 
      title: "Keyboard Advanced", 
      color: "bg-cyan-100", 
      people: [profiles[3]],
      instructor: "John Smith",
      room: "Room B",
      description: "Advanced keyboard techniques and composition",
      joinLink: "https://meet.google.com/xyz-1234-567"
    },
    { 
      id: 8, 
      offset: 5, 
      time: "10 PM", 
      duration: 1, 
      title: "Keyboard Advanced", 
      color: "bg-cyan-100", 
      people: [profiles[3]],
      instructor: "John Smith",
      room: "Room B",
      description: "Advanced keyboard techniques and composition",
      joinLink: "https://meet.google.com/xyz-1234-567"
    },
  ]);

  const events = useMemo(() =>
    eventPatterns.map((p) => ({
      ...p,
      dayLabel: dayLabels[Math.max(0, Math.min(6, p.offset))] || dayLabels[0],
    }))
  , [eventPatterns, dayLabels]);

  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      let ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const formatted = `${hours}:${minutes < 10 ? "0" + minutes : minutes} ${ampm}`;
      setCurrentTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const [selectedEventId, setSelectedEventId] = useState(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ dayOffset: 0, time: times[0] });

  const goPrevWeek = () => setAnchorDate(addDays(anchorDate, -7));
  const goNextWeek = () => setAnchorDate(addDays(anchorDate, 7));
  const goToday = () => setAnchorDate(new Date());

  const onEventClick = (eventId) => setSelectedEventId(eventId);
  
  const onEventDoubleClick = (eventId) => {
    setSelectedEventId(eventId);
    setShowSessionDetails(true);
  };

  const openReschedule = () => {
    if (!selectedEventId) {
      alert("Select an event to reschedule.");
      return;
    }
    const evt = eventPatterns.find((e) => e.id === selectedEventId);
    setRescheduleForm({ dayOffset: evt?.offset ?? 0, time: evt?.time ?? times[0] });
    setShowReschedule(true);
  };

  const getAvailableSlots = () => {
    // Get all possible time slots
    const allSlots = times.map(time => ({ time, available: true }));
    
    // Mark occupied slots in the next month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const occupiedSlots = eventPatterns
      .filter(event => {
        const eventDate = addDays(weekStart, event.offset);
        return eventDate <= nextMonth;
      })
      .map(event => event.time);
    
    return allSlots.map(slot => ({
      ...slot,
      available: !occupiedSlots.includes(slot.time)
    }));
  };

  const applyReschedule = () => {
    const availableSlots = getAvailableSlots();
    const selectedSlot = availableSlots.find(slot => slot.time === rescheduleForm.time);
    
    if (!selectedSlot?.available) {
      alert("This slot is not available. Please select another time.");
      return;
    }
    
    setEventPatterns((prev) =>
      prev.map((e) => e.id === selectedEventId
        ? { ...e, offset: rescheduleForm.dayOffset, time: rescheduleForm.time }
        : e
      )
    );
    setShowReschedule(false);
  };

  return (
    <div className="w-full min-h-screen rounded-2xl bg-white">
      <div className="bg-gray-150 rounded-2xl shadow p-4 md:p-6">
        
        {/* Header */}
  <div className="flex items-center justify-between mb-6">
  {/* Title */}
  <h2 className="text-sm sm:text-xl font-semibold text-gray-700">
    My Calendar
  </h2>

  {/* Controls */}
  <div className="flex items-center gap-1 sm:gap-4 text-gray-600">
    <button onClick={goPrevWeek} className="text-xs sm:text-lg">&lt;</button>

    {/* Month + Date */}
    <span className="font-medium text-xs sm:text-base">
      {`${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`}
    </span>

    <button onClick={goNextWeek} className="text-xs sm:text-lg">&gt;</button>

    {/* Today Button */}
    <button
      onClick={goToday}
      className="ml-1 sm:ml-4 px-2 sm:px-6 py-0.5 sm:py-1 border rounded-full text-xs sm:text-sm hover:bg-gray-100"
    >
      Today
    </button>
  </div>
</div>




        {/* Grid */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-t border-l border-gray-200 min-w-[1000px] relative">
            
            {/* Header row */}
            <div className="bg-gray-150 border-r border-b"></div>
            {dayLabels.map((day, i) => (
              <div key={i} className="text-center text-gray-600 font-medium py-2 border-r border-b">
                {day}
              </div>
            ))}

            {/* Time rows */}
            {times.map((time, i) => (
              <React.Fragment key={i}>
                <div className="text-sm text-gray-500 text-right pr-2 py-10 border-r border-b">{time}</div>
                {dayLabels.map((day, j) => (
                  <div key={j} className="relative border-r border-b min-h-[80px]">
                    {events
                      .filter((e) => e.dayLabel === day && e.time === time)
                      .map((event) => (
                        <div
                          key={event.id}
                          className={`${event.color} ${selectedEventId === event.id ? "ring-2 ring-black" : ""} absolute left-1 right-1 rounded-lg p-3 shadow cursor-pointer flex flex-col justify-between`}
                          style={{ top: "4px", height: `${event.duration * 100 - 8}px` }}

                          onClick={() => onEventClick(event.id)}
                          onDoubleClick={() => onEventDoubleClick(event.id)}
                        >
                          {/* Top Section */}
                          <div>
                            <p className="text-xs font-semibold text-gray-700">{event.title}</p>
                            <p className="text-[10px] text-gray-500">{event.time}</p>
                          <div className="flex -space-x-2 mt-1">
                            {event.people.map((person, k) => (
                              <img
                                key={k}
                                src={person.src}
                                alt={person.alt}
                                className="w-6 h-6 rounded-full border-2 border-white object-cover"
                              />
                            ))}
                          </div>
                        </div>
                        </div>
                      ))}
                  </div>
                ))}
              </React.Fragment>
            ))}

            {/* Current time indicator */}
            {currentTime && (
              <div className="absolute left-0 right-0 flex items-center" style={{ top: "390px" }}>
                <div className="w-16 text-right pr-2 text-xs font-medium text-black">{currentTime}</div>
                <div className="w-2 h-2 rounded-full bg-black"></div>
                <div className="flex-1 border-t-2 border-black"></div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 p-4 border-t text-sm text-gray-600 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p>
            <strong>Reschedule Policy:</strong> You can reschedule one session per month; 
            for additional changes, please contact the Admin team.
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-200 rounded-lg">Contact Admin</button>
            <button 
              onClick={openReschedule} 
              disabled={!selectedEventId}
              className={`px-4 py-2 rounded-lg ${
                selectedEventId 
                  ? "bg-gray-800 text-white hover:bg-gray-700" 
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Reschedule
            </button>
          </div>
        </div>

        {/* Reschedule Modal */}
        {showReschedule && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-4 w-full max-w-sm shadow-lg">
              <h3 className="text-base font-semibold mb-3">Reschedule Session</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Day</label>
                  <select
                    className="w-full border rounded-lg px-2 py-1.5"
                    value={rescheduleForm.dayOffset}
                    onChange={(e) => setRescheduleForm((f) => ({ ...f, dayOffset: Number(e.target.value) }))}
                  >
                    {dayLabels.map((lbl, idx) => (
                      <option key={lbl} value={idx}>{lbl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Time</label>
                  <select
                    className="w-full border rounded-lg px-2 py-1.5"
                    value={rescheduleForm.time}
                    onChange={(e) => setRescheduleForm((f) => ({ ...f, time: e.target.value }))}
                  >
                    {getAvailableSlots().map((slot) => (
                      <option 
                        key={slot.time} 
                        value={slot.time}
                        disabled={!slot.available}
                      >
                        {slot.time} {!slot.available ? "(Unavailable)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {getAvailableSlots().filter(slot => slot.available).length === 0 && (
                  <div className="text-center text-red-600 text-sm py-2">
                    No slots available for the next month
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button className="px-3 py-1.5 border rounded-lg" onClick={() => setShowReschedule(false)}>Cancel</button>
                <button 
                  className="px-3 py-1.5 bg-gray-800 text-white rounded-lg" 
                  onClick={applyReschedule}
                  disabled={getAvailableSlots().filter(slot => slot.available).length === 0}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Details Modal */}
        {showSessionDetails && selectedEventId && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
              {(() => {
                const event = events.find(e => e.id === selectedEventId);
                return event ? (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold">{event.title}</h3>
                      <button 
                        onClick={() => setShowSessionDetails(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Time</label>
                        <p className="text-gray-800">{event.time}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Instructor</label>
                        <p className="text-gray-800">{event.instructor}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Room</label>
                        <p className="text-gray-800">{event.room}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                        <p className="text-gray-800">{event.description}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Students</label>
                        <div className="flex -space-x-2">
                          {event.people.map((person, k) => (
                            <img
                              key={k}
                              src={person.src}
                              alt={person.alt}
                              className="w-8 h-8 rounded-full border-2 border-white object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end gap-2">
                      <button 
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                        onClick={() => setShowSessionDetails(false)}
                      >
                        Close
                      </button>
                      <button 
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-700"
                       
                      >
                        Join Class
                      </button>
                    </div>
                  </> 
                ) : null;
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MySchedule;
