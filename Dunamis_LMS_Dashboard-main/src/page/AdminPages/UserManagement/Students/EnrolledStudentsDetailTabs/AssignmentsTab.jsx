// Helper: convert hex color to rgba with alpha
function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(59, 130, 246, ${alpha})`; // default blue
    let c = hex.replace("#", "");
    if (c.length === 3) {
        c = c.split("").map((x) => x + x).join("");
    }
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const AssignmentsTab = ({ student }) => {
    const assignments = student?.assignment || [];
    if (assignments.length === 0) {
        return <div className="text-sm text-gray-500 text-center py-6">No assignments found.</div>;
    }

    return (
        <div className="space-y-3">
            {assignments.map((assignment, index) => {
                const studentAssignment = assignment.students?.find(
                    s => s.studentId === student._id
                );
                const status = studentAssignment?.status || "assigned";

                const categoryName = assignment.category?.name || "General";
                const categoryIcon = assignment.category?.icon || "📚";
                const categoryColor = assignment.category?.color || "#3b82f6";
                const categoryBgColor = hexToRgba(categoryColor, 0.1);

                const dueDate = assignment.dueDate
                    ? new Date(assignment.dueDate).toLocaleString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        month: 'short',
                        day: 'numeric'
                    })
                    : "No deadline";

                const now = new Date();
                const dueDateObj = new Date(assignment.dueDate);
                const isOverdue = dueDateObj < now && (status === "assigned" || status === "submitted");
                const isDueSoon = !isOverdue && dueDateObj > now && dueDateObj - now < 24 * 60 * 60 * 1000;

                return (
                    <div
                        key={assignment._id}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                {/* Header with icon and title */}
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="bg-red-100 p-1.5 rounded-lg">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="w-4 h-4 text-red-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2-10H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V8a2 2 0 00-2-2z" />
                                        </svg>
                                    </div>
                                    <span className="font-semibold text-gray-900">Assignment Due</span>
                                </div>

                                {/* Category badge with dynamic color */}
                                <div
                                    className="flex items-center gap-1 mb-2 text-xs rounded w-fit px-2 py-0.5"
                                    style={{
                                        backgroundColor: categoryBgColor,
                                        color: categoryColor
                                    }}
                                >
                                    <span>{categoryIcon}</span>
                                    <span className="font-medium">{categoryName}</span>
                                </div>

                                {/* Assignment title */}
                                <div className="font-medium text-gray-900 mb-0.5">
                                    {assignment.title}
                                </div>

                                {/* Assignment details/description */}
                                <div className="text-xs text-gray-500">
                                    {assignment.description || "Assignment Details"}
                                </div>
                            </div>

                            {/* Right side - time and status */}
                            <div className="text-right ml-4">
                                <div className="text-xs text-gray-400 mb-2 whitespace-nowrap">
                                    {dueDate}
                                </div>
                                {isOverdue && (
                                    <div className="text-xs font-medium text-red-500 flex items-center justify-end gap-1">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                        Over Due
                                    </div>
                                )}
                                {isDueSoon && !isOverdue && (
                                    <div className="text-xs font-medium text-yellow-500 flex items-center justify-end gap-1">
                                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                                        Due
                                    </div>
                                )}
                                {!isOverdue && !isDueSoon && status === "submitted" && (
                                    <div className="text-xs font-medium text-blue-500 flex items-center justify-end gap-1">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Submitted
                                    </div>
                                )}
                                {status === "reviewed" && (
                                    <div className="text-xs font-medium text-green-500 flex items-center justify-end gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                        Reviewed
                                    </div>
                                )}
                                {status === "completed" && (
                                    <div className="text-xs font-medium text-green-600 flex items-center justify-end gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                                        Completed
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AssignmentsTab;
