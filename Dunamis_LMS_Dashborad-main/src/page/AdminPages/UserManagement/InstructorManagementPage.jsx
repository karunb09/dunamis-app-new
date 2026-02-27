import React, { useEffect, useState } from 'react';
import { FaSearch, FaFilter, FaSortAmountDown } from 'react-icons/fa';
import Instructor from './Instructor/Instructor';
import Applications from './Instructor/Applications';

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
        <div className="p-6 bg-white min-h-screen">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-300 mb-4">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`pb-2 text-sm font-medium ${activeTab === tab
                            ? 'border-b-2 border-black text-black'
                            : 'text-gray-500 hover:text-black'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Search & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                {/* Search */}
                {/* <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border rounded-2xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div> */}

                {/* Sort and Filter */}
                {/* <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-300 bg-white text-sm hover:bg-gray-100">
                        <FaSortAmountDown /> Sort
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-300 bg-white text-sm hover:bg-gray-100">
                        <FaFilter /> Filter
                    </button>
                </div> */}
            </div>

            {/* Tab Content */}
            {renderTabContent()}
        </div>
    );
};

export default InstructorManagementPage;
