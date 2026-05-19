import { useState, useRef, useEffect } from "react";
import { FaSearch, FaSortAmountDown, FaFilter } from "react-icons/fa";
import { X } from "react-feather";
import DataTable from "../../../../../components/Table";

const SORT_OPTIONS = [
    { value: "dateDesc", label: "Date (Newest First)" },
    { value: "dateAsc", label: "Date (Oldest First)" },
    { value: "amountDesc", label: "Amount (High to Low)" },
    { value: "amountAsc", label: "Amount (Low to High)" },
];

const STATUS_OPTIONS = ["Paid", "Pending", "Failed"];
const PAYMENT_TYPE_OPTIONS = ["Full Payment", "Installment"];

const PaymentsTab = ({ student }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("dateDesc");
    const [filterOpen, setFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [paymentTypeFilter, setPaymentTypeFilter] = useState("");

    const sortRef = useRef(null);

    // Close sort dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortRef.current && !sortRef.current.contains(event.target)) {
                setSortOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Transform payments data from API response
    const transformedPayments = (student?.payments || []).map((payment) => {
        // Format date
        const paidDate = payment.paidAt
            ? new Date(payment.paidAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })
            : "-";

        // courseId is already populated in your API response!
        const courseName = payment.courseId?.name && payment.courseId?.code
            ? `${payment.courseId.name} (${payment.courseId.code})`
            : "Unknown Course";

        return {
            _id: payment._id,
            course: courseName,
            sessionType: payment.sessionType || "-",
            amount: `₹${payment.amount?.toLocaleString('en-IN') || 0}`,
            amountRaw: payment.amount || 0,
            dateTime: paidDate,
            dateRaw: payment.paidAt ? new Date(payment.paidAt) : new Date(0),
            paymentType: payment.paymentType || "Full Payment",
            paymentMode: payment.paymentMode || "Online",
            transactionId: payment.razorpayPaymentId || payment.razorpayOrderId || "-",
            status: payment.feeStatus || "Paid",
            installmentInfo: payment.installmentNo
                ? `${payment.installmentNo}/${payment.installmentTotal}`
                : "-"
        };
    });

    // Apply filters
    let filteredPayments = transformedPayments.filter((p) => {
        const matchesSearch =
            p.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sessionType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.paymentType?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = !statusFilter || p.status === statusFilter;
        const matchesPaymentType = !paymentTypeFilter || p.paymentType === paymentTypeFilter;

        return matchesSearch && matchesStatus && matchesPaymentType;
    });

    // Apply sorting
    filteredPayments = [...filteredPayments].sort((a, b) => {
        switch (sortOption) {
            case "dateDesc":
                return b.dateRaw - a.dateRaw;
            case "dateAsc":
                return a.dateRaw - b.dateRaw;
            case "amountDesc":
                return b.amountRaw - a.amountRaw;
            case "amountAsc":
                return a.amountRaw - b.amountRaw;
            default:
                return 0;
        }
    });

    const paymentColumns = [
        { Header: "Course", accessor: "course" },
        { Header: "Session Type", accessor: "sessionType" },
        { Header: "Amount", accessor: "amount" },
        { Header: "Time & Date", accessor: "dateTime" },
        { Header: "Payment Type", accessor: "paymentType" },
        { Header: "Installment", accessor: "installmentInfo" },
        { Header: "Payment Mode", accessor: "paymentMode" },
        { Header: "Transaction ID", accessor: "transactionId" },
        {
            Header: "Fee Status",
            accessor: "status",
            render: (value) => (
                <span className={`flex items-center gap-1 text-sm font-medium ${value === "Paid" ? "text-green-600" : "text-yellow-500"
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${value === "Paid" ? "bg-green-500" : "bg-yellow-400"
                        }`}></span>
                    {value}
                </span>
            ),
        },
    ];

    const exportPaymentsToCSV = () => {
        if (!filteredPayments?.length) {
            alert("No payments to export.");
            return;
        }

        const studentName = `${student?.userId?.name?.firstName || ''} ${student?.userId?.name?.lastName || ''}`.trim();

        const headers = [
            "Course",
            "Session Type",
            "Amount",
            "Time & Date",
            "Payment Type",
            "Installment",
            "Payment Mode",
            "Transaction ID",
            "Status"
        ];

        const rows = filteredPayments.map((p) => [
            p.course,
            p.sessionType,
            p.amount,
            p.dateTime,
            p.paymentType,
            p.installmentInfo,
            p.paymentMode,
            p.transactionId,
            p.status
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((r) => r.map((v) => `"${v}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `invoice-${studentName || 'student'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const clearFilters = () => {
        setStatusFilter("");
        setPaymentTypeFilter("");
    };

    return (
        <div className="space-y-4">
            {/* Top bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Search payments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border rounded-2xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Sort Dropdown */}
                    <div className="relative" ref={sortRef}>
                        <button
                            className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100"
                            onClick={() => setSortOpen(!sortOpen)}
                        >
                            <FaSortAmountDown /> Sort
                        </button>
                        {sortOpen && (
                            <ul className="absolute right-0 z-40 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg text-sm font-medium">
                                {SORT_OPTIONS.map(({ value, label }) => (
                                    <li
                                        key={value}
                                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${sortOption === value ? "bg-gray-200 font-semibold" : ""
                                            }`}
                                        onClick={() => {
                                            setSortOption(value);
                                            setSortOpen(false);
                                        }}
                                    >
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Filter */}
                    <button
                        className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-black text-sm bg-white hover:bg-gray-100"
                        onClick={() => setFilterOpen(true)}
                    >
                        <FaFilter /> Filter
                    </button>
                </div>
            </div>

            {/* Filter Modal */}
            {filterOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-40 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4">
                    <div className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 sm:p-6">
                        <button
                            onClick={() => setFilterOpen(false)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"
                        >
                            <X />
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Filter Payments</h2>

                        <label className="block mb-2 font-medium">Fee Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All Status</option>
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>

                        <label className="block mb-2 font-medium">Payment Type</label>
                        <select
                            value={paymentTypeFilter}
                            onChange={(e) => setPaymentTypeFilter(e.target.value)}
                            className="w-full mb-4 border rounded px-3 py-2"
                        >
                            <option value="">All Types</option>
                            {PAYMENT_TYPE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>

                        <div className="flex justify-between mt-6">
                            <button
                                className="px-4 py-2 rounded-2xl border hover:bg-gray-200"
                                onClick={clearFilters}
                            >
                                Clear
                            </button>
                            <button
                                className="px-4 py-2 rounded-2xl bg-black text-white hover:bg-gray-800"
                                onClick={() => setFilterOpen(false)}
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="border rounded-2xl p-4 bg-white shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium">
                        Payment History ({filteredPayments.length} {filteredPayments.length === 1 ? 'payment' : 'payments'})
                    </h3>
                    <button
                        className="text-xs px-3 py-1 rounded-full border bg-gray-50 hover:bg-gray-100"
                        onClick={exportPaymentsToCSV}
                    >
                        Export as CSV
                    </button>
                </div>
                <DataTable columns={paymentColumns} data={filteredPayments || []} selectable={false} />
            </div>
        </div>
    );
};

export default PaymentsTab;
