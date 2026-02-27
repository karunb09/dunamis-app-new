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

    return (
        <div className="flex items-center justify-center gap-3 mt-6">
            {/* Prev Button */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-gray-600 hover:text-black disabled:opacity-30"
            >
                <FaArrowLeft />
            </button>

            {/* Page Numbers */}
            {generatePages().map((page, idx) =>
                page === "..." ? (
                    <span key={idx} className="px-2 text-gray-500 font-medium">
                        ...
                    </span>
                ) : (
                    <button
                        key={idx}
                        onClick={() => onPageChange(page)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition ${page === currentPage
                            ? "bg-gray-200 text-black"
                            : "text-gray-700 hover:bg-gray-100"
                            }`}
                    >
                        {page}
                    </button>
                )
            )}

            {/* Next Button */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-600 hover:text-black disabled:opacity-30"
            >
                <FaArrowRight />
            </button>
        </div>
    );
};

export default Pagination;
