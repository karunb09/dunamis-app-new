import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import EnrolledStudents from './Students/EnrolledStudents';
import RegisteredStudents from './Students/RegisteredStudents';
import DemoStudents from './Students/DemoStudents';
import ManualEnrollForm from './Students/ManualEnrollForm';
import PageTabBar from '../../../components/PageTabBar';

const TABS = ['Enrolled Students', 'Registered Students', 'Demo Students'];

const StudentManagementPage = () => {
    const savedTab = localStorage.getItem('activeTab2') || 'Enrolled Students';
    const [activeTab2, setActiveTab] = useState(savedTab);
    const [searchTerm, setSearchTerm] = useState('');
    const [enrollModalOpen, setEnrollModalOpen] = useState(false);

    const { user } = useSelector((state) => state.auth);
    const permissions = user?.permissions || [];
    const canManualEnroll =
        permissions.includes('allAccess') ||
        permissions.includes('studentManagement') ||
        permissions.includes('financials');

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
        <div className="min-h-screen bg-slate-50/40 p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                        User Management
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">Students</h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Manage enrolled, registered, and demo students.
                    </p>
                </div>
                {canManualEnroll && (
                    <button
                        onClick={() => setEnrollModalOpen(true)}
                        className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                    >
                        + Manual Enroll
                    </button>
                )}
            </div>
            <div className="mb-6">
                <PageTabBar tabs={TABS} activeTab={activeTab2} onChange={handleTabChange} />
            </div>
            {renderTabContent()}

            {enrollModalOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
                    <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <h2 className="text-lg font-bold text-slate-900">Manual Cash Enrollment</h2>
                            <button
                                onClick={() => setEnrollModalOpen(false)}
                                aria-label="Close"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="px-6 py-4">
                            <ManualEnrollForm onSuccess={() => setEnrollModalOpen(false)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentManagementPage;
