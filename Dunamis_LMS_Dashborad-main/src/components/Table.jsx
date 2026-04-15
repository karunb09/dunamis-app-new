import React, { useEffect, useState } from "react";
import Pagination from "./Pagination";
import { Clipboard, Trash } from "react-feather";

const DataTable = ({
    data = [],
    columns = [],
    itemsPerPage = 10,
    emptyMessage = "No data available.",
    onDeleteSelected,
    onCopyDetails,
    onRowClick,
    selectable = true,
    rowClassName = "",
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

    const onPageChange = (page) => setCurrentPage(page);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        const visibleIds = new Set(data.map((row) => row._id ?? row.id));
        setSelectedRows((prev) => prev.filter((id) => visibleIds.has(id)));
    }, [data]);

    const handleRowSelection = (id) => {
        setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

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

    const getColumnKey = (col) => col.key || col.accessor;
    const getColumnHeader = (col) => col.header || col.Header;
    const getSelectedRows = () =>
        data.filter((row) => selectedRows.includes(row._id ?? row.id));
    const defaultColumnWidth = 164;
    const tableMinWidth = Math.max(
        760,
        columns.reduce((total, col) => {
            const configuredWidth = Number.parseInt(col.minWidth || col.width, 10);
            return total + (Number.isFinite(configuredWidth) ? configuredWidth : defaultColumnWidth);
        }, selectable ? 64 : 0)
    );
    const getColumnStyle = (col = {}) => ({
        minWidth: col.minWidth || col.width || `${defaultColumnWidth}px`,
        ...(col.width ? { width: col.width } : {}),
        ...(col.maxWidth ? { maxWidth: col.maxWidth } : {}),
    });

    return (
        <div className="w-full">
            <div className="mb-4 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-900">
                        {data.length} {data.length === 1 ? "record" : "records"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        {data.length
                            ? `Showing ${startIndex + 1}-${endIndex} of ${data.length}`
                            : emptyMessage}
                    </p>
                </div>

                {selectable ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {selectedRows.length} selected
                        </span>
                        {onCopyDetails && (
                            <button
                                type="button"
                                onClick={() => onCopyDetails(getSelectedRows())}
                                disabled={selectedRows.length === 0 || bulkCopyLoading}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Clipboard size={16} />
                                {bulkCopyLoading ? "Copying..." : bulkCopyLabel}
                            </button>
                        )}
                        {onDeleteSelected && (
                            <button
                                type="button"
                                onClick={() => onDeleteSelected(selectedRows, getSelectedRows())}
                                disabled={selectedRows.length === 0 || bulkDeleteLoading}
                                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Trash size={16} />
                                {bulkDeleteLoading ? "Deleting..." : bulkDeleteLabel}
                            </button>
                        )}
                    </div>
                ) : null}
            </div>

            <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_22px_50px_-36px_rgba(15,23,42,0.55)]">
                <div className="overflow-x-auto rounded-[30px]">
                    <table
                        className="w-full border-collapse text-sm"
                        style={{ minWidth: `${tableMinWidth}px` }}
                    >
                        <thead className="bg-gradient-to-r from-slate-50 to-white text-left">
                        <tr>
                            {selectable && (
                                <th className="w-16 min-w-16 px-5 py-4">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                                    />
                                </th>
                            )}
                            {columns.map((col, colIndex) => (
                                <th
                                    key={getColumnKey(col) || colIndex}
                                    className={`whitespace-nowrap px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${col.headerClassName || ""}`}
                                    style={getColumnStyle(col)}
                                >
                                    {getColumnHeader(col)}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentData.length > 0 ? (
                                currentData.map((row, rowIndex) => {
                                    const rowId = row._id ?? row.id ?? `${startIndex + rowIndex}`;
                                    const customRowClassName =
                                        typeof rowClassName === "function"
                                            ? rowClassName(row, rowIndex)
                                            : rowClassName;

                                    return (
                                        <tr
                                            key={rowId}
                                            className={`transition duration-200 ${
                                                onRowClick ? "cursor-pointer" : ""
                                            } ${
                                                selectable && isRowSelected(rowId)
                                                    ? "bg-amber-50/70"
                                                    : "hover:bg-slate-50/80"
                                            } ${customRowClassName}`}
                                            onClick={() => onRowClick && onRowClick(row)}
                                        >
                                            {selectable && (
                                                <td className="w-16 min-w-16 px-5 py-4 align-middle">
                                                    <input
                                                        type="checkbox"
                                                        checked={isRowSelected(rowId)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={() => handleRowSelection(rowId)}
                                                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                                                    />
                                                </td>
                                            )}
                                            {columns.map((col, colIndex) => {
                                                const cellKey = getColumnKey(col) || colIndex;
                                                const value = row[cellKey];
                                                return (
                                                    <td
                                                        key={`${rowId}-${cellKey}`}
                                                        className={`px-4 py-4 align-middle text-slate-600 ${
                                                            col.nowrap ? "whitespace-nowrap" : "whitespace-normal break-words"
                                                        } ${col.cellClassName || ""}`}
                                                        style={getColumnStyle(col)}
                                                    >
                                                        {col.render
                                                            ? col.render(value, row)
                                                            : value}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={columns.length + (selectable ? 1 : 0)}
                                        className="px-6 py-16 text-center"
                                    >
                                        <div className="mx-auto max-w-sm">
                                            <p className="text-base font-semibold text-slate-800">
                                                Nothing to show yet
                                            </p>
                                            <p className="mt-2 text-sm text-slate-500">
                                                {emptyMessage}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {data.length > 0 && totalPages > 1 && (
                <div className="flex justify-center items-center mt-4">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={onPageChange}
                    />
                </div>
            )}
        </div>
    );
};

export default DataTable;
