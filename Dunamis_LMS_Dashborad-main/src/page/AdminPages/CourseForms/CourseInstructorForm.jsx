import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { fetchTeachers } from "../../../redux/Intructor/teacherSlice";

const InstructorForm = ({ instructors: propInstructors, setInstructors, selectedMode }) => {
    const dispatch = useDispatch();
    const {
        teachers: instructorOptions,
        loading,
        error,
    } = useSelector((state) => state.teachers);

    const [selectedInstructors, setSelectedInstructors] = useState(propInstructors || []);

    useEffect(() => {
        setSelectedInstructors(propInstructors || []);
    }, [propInstructors]);

    useEffect(() => {
        dispatch(fetchTeachers());
    }, [dispatch]);

    const filteredInstructors = selectedMode
        ? instructorOptions?.filter(
            (inst) =>
                inst?.teacherApplication?.mode?.toLowerCase() === selectedMode?.toLowerCase()
        )
        : instructorOptions;

    const formattedOptions = filteredInstructors?.map((option) => ({
        value: option.id,
        label: `${option.user.name.firstName} ${option.user.name.lastName} (${option.teacherApplication?.areaOfExpertise || "N/A"})`,
    })) || [];

    const handleChange = (selectedOptions) => {
        setSelectedInstructors(selectedOptions);
        setInstructors(selectedOptions);
    };

    if (loading) return <div>Loading instructors...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="max-w-5xl mx-auto p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructors
            </label>
            <Select
                isMulti
                options={formattedOptions}
                value={selectedInstructors}
                onChange={handleChange}
                placeholder="Select instructors"
                className="react-select-container"
                classNamePrefix="react-select"
            />
        </div>
    );
};

export default InstructorForm;
