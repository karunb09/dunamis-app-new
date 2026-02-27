import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaSortAmountDown } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import EnrolledStudents from './Students/EnrolledStudents';
import RegisteredStudents from './Students/RegisteredStudents';
import DemoStudents from './Students/DemoStudents';

const TABS = ['Enrolled Students', 'Registered Students', 'Demo Students'];

const StudentManagementPage = () => {
    const savedTab = localStorage.getItem('activeTab2') || 'Enrolled Students';
    const [activeTab2, setActiveTab] = useState(savedTab);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        localStorage.setItem('activeTab2', activeTab2);
    }, [activeTab2]);

    const handleTabChange = (tab) => setActiveTab(tab);

    const handleCopyDetails = (selectedIds) => {
        const selectedStudents = students.filter((student) =>
            selectedIds.includes(student.id)
        );

        const studentDetails = selectedStudents.map(student => {
            return `
            Name: ${student.name}
            Course: ${student.courseName}
            Fee Status: ${student.feeStatus}
            Progress: ${student.progress}%
        `;
        }).join('\n');

        // Copy details to clipboard
        navigator.clipboard.writeText(studentDetails).then(() => {
            toast.success('Student details copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy details: ', err);
            toast.error('Failed to copy details!');
        });
    };

    const renderTabContent = () => {
        switch (activeTab2) {
            case 'Enrolled Students':
                return <EnrolledStudents searchTerm={searchTerm} />;

            case 'Registered Students':
                return <RegisteredStudents searchTerm={searchTerm} />;
            case 'Demo Students':
                return <DemoStudents searchTerm={searchTerm} />;
            default:
                return null;
        }
    };

    return (
        <div className="p-6 bg-white min-h-screen">
            <div className="flex gap-4 border-b border-gray-300 mb-4">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`pb-2 text-sm font-medium ${activeTab2 === tab
                            ? 'border-b-2 border-black text-black'
                            : 'text-gray-500 hover:text-black'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            {renderTabContent()}
        </div>
    );
};

export default StudentManagementPage;
