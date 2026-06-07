import React, { useEffect, useState } from "react";
import Pagination from "./Pagination";
import { Clipboard, Trash } from "react-feather";

const DataCards = ({
    data = [],
    renderCard,
    itemsPerPage = 12,
    emptyMessage = "No data available.",
    onDeleteSelected,
    onCopyDetails,
    selectable = true,
    bulkDeleteLoading = false,
    bulkDeleteLabel = "Delete",
    bulkCopyLoading = false,
    bulkCopyLabel = "Copy",
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRows, setSelectedRows] = useState([]);

    const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = data.slice(startIndex, startIndex + itemsPerPage);
    const endIndex = Math.min(startIndex + currentData.length, data.length);

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    useEffect(() => {
        const visibleIds = new Set(data.map((row) => row._id ?? row.id));
        setSelectedRows((prev) => prev.filter((id) => visibleIds.has(id)));
    }, [data]);

    const handleRowSelection = (id) =>
        setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );

    const handleSelectAll = () => {
        const allIds = currentData.map((row) => row._id ?? row.id);
        setSelectedRows(
            currentData.every((row) => selectedRows.includes(row._id ?? row.id))
                ? selectedRows.filter((id) => !allIds.includes(id))
                : [...new Set([...selectedRows, ...allIds])]
        );
    };

    const isRowSelected = (id) => selectedRows.includes(id);
    const isAllSelected =
        currentData.length > 0 &&
        currentData.every((row) => selectedRows.includes(row._id ?? row.id));
    const getSelectedRows = () =>
        data.filter((row) => selectedRows.includes(row._id ?? row.id));

    return (
        <div className="w-full">
            <div className="mb-4 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-3.5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-900">
                        {data.length}{" "}
                        <span className="font-normal text-slate-500">
                            {data.length === 1 ? "record" : "records"}
                        </span>
                    </p>
                    {data.length > 0 && (
                        <p className="mt-0.5 text-xs text-slate-400">
                            Showing {startIndex + 1}–{endIndex} of {data.length}
                        </p>
                    )}
                </div>

                {selectable && (
                    <div className="flex flex-wrap items-center gap-2">
                        {currentData.length > 0 && (
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 cursor-pointer rounded border-slate-200 accent-orange-500 focus:ring-orange-300"
                                />
                                <span className="text-xs font-medium text-slate-500">Select all</span>
                            </label>
                        )}
                        {selectedRows.length > 0 && (
                            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                                {selectedRows.length} selected
                            </span>
                        )}
                        {onCopyDetails && (
                            <button
                                type="button"
                                onClick={() => onCopyDetails(getSelectedRows())}
                                disabled={selectedRows.length === 0 || bulkCopyLoading}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Clipboard size={14} />
                                {bulkCopyLoading ? "Copying…" : bulkCopyLabel}
                            </button>
                        )}
                        {onDeleteSelected && (
                            <button
                                type="button"
                                onClick={() => onDeleteSelected(selectedRows, getSelectedRows())}
                                disabled={selectedRows.length === 0 || bulkDeleteLoading}
                                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Trash size={14} />
                                {bulkDeleteLoading ? "Deleting…" : bulkDeleteLabel}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {currentData.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {currentData.map((row) => {
                        const rowId = row._id ?? row.id;
                        return (
                            <React.Fragment key={rowId}>
                                {renderCard(row, {
                                    selected: selectable ? isRowSelected(rowId) : false,
                                    onSelect: selectable ? () => handleRowSelection(rowId) : undefined,
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_22px_50px_-36px_rgba(15,23,42,0.55)]">
                    <div className="mx-auto max-w-sm">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">Nothing here yet</p>
                        <p className="mt-1 text-xs text-slate-400">{emptyMessage}</p>
                    </div>
                </div>
            )}

            {data.length > 0 && totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
};

export default DataCards;
