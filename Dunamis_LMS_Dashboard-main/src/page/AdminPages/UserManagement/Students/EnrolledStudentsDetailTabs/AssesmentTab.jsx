// import DataTable from "../../../../components/Table";

import DataTable from "../../../../../components/Table";

const AssessmentsTab = ({ student }) => {
    const assessmentColumns = [
        {
            Header: "Instructor", accessor: "instructor", render: (value) => (
                <div className="flex items-center gap-2">
                    <img src={value.avatar} alt={value.name} loading="lazy" decoding="async" className="w-6 h-6 rounded-full object-cover object-top" />
                    <span>{value.name}</span>
                </div>
            )
        },
        { Header: "Date", accessor: "date" },
        { Header: "Course", accessor: "course" },
        { Header: "Homework Completion", accessor: "homeworkCompletion" },
        { Header: "Practice", accessor: "practice" },
        { Header: "Learning Speed", accessor: "learningSpeed" },
        { Header: "Performance Skills", accessor: "performanceSkills" },
        { Header: "Feedback", accessor: "feedback" },
    ];

    return (
        <div className="text-sm text-gray-500 py-8 text-center">
            <DataTable columns={assessmentColumns} data={student.assessments || []} selectable={false} />
        </div>
    );
};

export default AssessmentsTab;
