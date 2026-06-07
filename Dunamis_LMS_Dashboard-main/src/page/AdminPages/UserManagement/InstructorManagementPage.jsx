import React, { useEffect, useState } from 'react';
import Instructor from './Instructor/Instructor';
import Applications from './Instructor/Applications';
import PageTabBar from '../../../components/PageTabBar';

const TABS = ['Instructor', 'Applications'];
const LOCAL_STORAGE_KEY = 'instructorManagementActiveTab';

const InstructorManagementPage = () => {
    const [activeTab, setActiveTab] = useState('Instructor');
    // const [searchTerm, setSearchTerm] = useState('');

    // Load saved tab from localStorage
    useEffect(() => {
        const savedTab = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedTab && TABS.includes(savedTab)) {
            setActiveTab(savedTab);
        }
    }, []);

    // Save tab to localStorage whenever it changes
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        localStorage.setItem(LOCAL_STORAGE_KEY, tab);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Instructor':
                return <Instructor  />;
            case 'Applications':
                return <Applications  />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/40 p-6">
            <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                    User Management
                </p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">Instructors</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                    Manage active instructors and review new applications.
                </p>
            </div>
            <div className="mb-6">
                <PageTabBar tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
            </div>
            {renderTabContent()}
        </div>
    );
};

export default InstructorManagementPage;
