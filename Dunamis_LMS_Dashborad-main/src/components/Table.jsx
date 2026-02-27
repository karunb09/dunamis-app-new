import React, { useState } from "react";
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
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRows, setSelectedRows] = useState([]);

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = data.slice(startIndex, startIndex + itemsPerPage);

    const onPageChange = (page) => setCurrentPage(page);

    const handleRowSelection = (id) => {
        setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        const allIds = currentData.map((row) => row._id ?? row.id);
        setSelectedRows(
            selectedRows.length === currentData.length ? [] : allIds
        );
    };

    const isRowSelected = (id) => selectedRows.includes(id);
    const isAllSelected = currentData.length > 0 && selectedRows.length === currentData.length;

    const getColumnKey = (col) => col.key || col.accessor;
    const getColumnHeader = (col) => col.header || col.Header;

    return (
        <div className="w-full">
            {/* Bulk Action Buttons */}
            {selectable && selectedRows.length > 0 && (
                <div className="flex justify-end gap-2 mb-3">
                    {onDeleteSelected && (
                        <button
                            onClick={() => {
                                const selectedAdmins = currentData.filter(row => selectedRows.includes(row._id ?? row.id));
                                onDeleteSelected(selectedRows, selectedAdmins);
                            }}
                            className="text-red-500 flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-300 bg-white text-sm hover:bg-gray-100"
                        >
                            <span><Trash /></span>Delete
                        </button>

                    )}
                    {onCopyDetails && (
                        <button

                            onClick={() =>
                                onCopyDetails(
                                    currentData.filter((row) =>
                                        selectedRows.includes(row.id)
                                    )
                                )
                            }
                            className="text-blue-500 flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-300 bg-white text-sm hover:bg-gray-100"
                        >
                            <span className="text-sm"><Clipboard /></span> Copy
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-100 text-left">
                        <tr>
                            {selectable && (
                                <th className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        className="w-5 h-5"
                                    />
                                </th>
                            )}
                            {columns.map((col, colIndex) => (
                                <th
                                    key={getColumnKey(col) || colIndex}
                                    className="px-4 py-3 font-medium text-gray-700"
                                >
                                    {getColumnHeader(col)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {currentData.length > 0 ? (
                            currentData.map((row, rowIndex) => {
                                const rowId = row._id ?? row.id ?? `${startIndex + rowIndex}`;

                                return (
                                    <tr
                                        key={rowId}
                                        className={`border-t hover:bg-gray-50 ${selectable && isRowSelected(rowId)
                                            ? "bg-gray-200"
                                            : ""
                                            }`}
                                        onClick={() => onRowClick && onRowClick(row)}
                                    >
                                        {selectable && (
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isRowSelected(rowId)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={() => handleRowSelection(rowId)}
                                                    className="w-5 h-5"
                                                />
                                            </td>
                                        )}
                                        {columns.map((col, colIndex) => {
                                            const cellKey = getColumnKey(col) || colIndex;
                                            const value = row[cellKey];
                                            return (
                                                <td
                                                    key={`${rowId}-${cellKey}`}
                                                    className="px-4 py-3 text-gray-600"
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
                                    className="text-center py-6 text-gray-500"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
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
