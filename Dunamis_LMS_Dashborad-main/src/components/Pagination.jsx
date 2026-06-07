import React from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const generatePages = () => {
        const pages = [];

        if (totalPages <= 6) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, "...", totalPages - 1, totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, 2, "...", totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(
                    1,
                    "...",
                    currentPage - 1,
                    currentPage,
                    currentPage + 1,
                    "...",
                    totalPages
                );
            }
        }
        return pages;
    };

    const goToPage = (page) => {
        if (page < 1 || page > totalPages || page === currentPage) return;
        onPageChange(page);
    };

    return (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <FaArrowLeft />
                Previous
            </button>

            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-2 shadow-sm">
                {generatePages().map((page, idx) =>
                    page === "..." ? (
                        <span
                            key={idx}
                            className="px-2 text-sm font-medium text-slate-400"
                        >
                            ...
                        </span>
                    ) : (
                        <button
                            key={idx}
                            onClick={() => goToPage(page)}
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
                                page === currentPage
                                    ? "bg-[#FF6B35] text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                        >
                            {page}
                        </button>
                    )
                )}
            </div>

            <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
                Next
                <FaArrowRight />
            </button>

            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Page {currentPage} of {totalPages}
            </span>
        </div>
    );
};

export default Pagination;
