import { useState, useRef, useEffect, useMemo } from "react";
import { installmentSummary } from "../../../../../utils/installmentLabel";
import { FaSearch, FaSortAmountDown, FaFilter } from "react-icons/fa";
import { FiClock, FiX } from "react-icons/fi";
import DataTable from "../../../../../components/Table";
import RecordCashModal from "../../../Financials/RecordCashModal";
import TransactionTimeline from "../../../Financials/TransactionTimeline";
import { getPendingInstallments } from "../../../../../utils/feeStatus";
import Swal from "sweetalert2";
import { toast } from "react-hot-toast";
import { extendDueDate } from "../../../../../api/studentLifecycleApi";

const SORT_OPTIONS = [
    { value: "dateDesc", label: "Date (Newest First)" },
    { value: "dateAsc", label: "Date (Oldest First)" },
    { value: "amountDesc", label: "Amount (High to Low)" },
    { value: "amountAsc", label: "Amount (Low to High)" },
];

const STATUS_OPTIONS = ["Paid", "Pending", "Failed"];
const PAYMENT_TYPE_OPTIONS = ["Full Payment", "Installment"];

const formatInr = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const PaymentsTab = ({ student, onRefresh }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOpen, setSortOpen] = useState(false);
    const [sortOption, setSortOption] = useState("dateDesc");
    const [filterOpen, setFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [paymentTypeFilter, setPaymentTypeFilter] = useState("");
    const [cashDue, setCashDue] = useState(null);
    const [extendingId, setExtendingId] = useState(null);
    const [timelineId, setTimelineId] = useState(null);

    const sortRef = useRef(null);

    const studentName = `${student?.userId?.name?.firstName || ""} ${student?.userId?.name?.lastName || ""}`.trim();

    // Everything this student still owes — the source for cash recording.
    const pendingInstallments = useMemo(() => getPendingInstallments(student), [student]);

    // Compensation for missed classes — pushes one installment's due date out.
    // Never pulls it earlier; the server refuses that.
    const handleExtendDueDate = async (due) => {
        const { isConfirmed, value } = await Swal.fire({
            title: "Extend this due date",
            html: `<p class="text-sm text-slate-600">${due.course?.name || "Course"} · currently due ${new Date(
                due.dueDate
            ).toLocaleDateString("en-IN")}</p>`,
            input: "number",
            inputLabel: "Days to extend by",
            inputValue: 7,
            inputAttributes: { min: 1, max: 365 },
            showCancelButton: true,
            confirmButtonText: "Extend",
            confirmButtonColor: "#FF6B35",
            inputValidator: (v) => (Number(v) > 0 ? undefined : "Enter at least 1 day"),
        });
        if (!isConfirmed) return;

        const { value: reason } = await Swal.fire({
            title: "Why?",
            input: "text",
            inputPlaceholder: "e.g. instructor was unwell for two weeks",
            showCancelButton: true,
            confirmButtonColor: "#FF6B35",
        });

        setExtendingId(due.payment?._id);
        try {
            const result = await extendDueDate({
                studentId: student?._id,
                paymentId: due.payment?._id,
                days: Number(value),
                reason: (reason || "").trim() || undefined,
            });
            toast.success(result.message);
            onRefresh?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setExtendingId(null);
        }
    };

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

        const discountAmount = Number(payment.transactionRef?.discountAmount || 0);
        const referralCode = payment.transactionRef?.referralCode || null;

        return {
            _id: payment._id,
            // PaymentTransaction id — opens the full lifecycle trail.
            transactionRef: payment.transactionRef?._id || payment.transactionRef || null,
            course: courseName,
            sessionType: payment.sessionType || "-",
            amount: `₹${payment.amount?.toLocaleString('en-IN') || 0}`,
            amountRaw: payment.amount || 0,
            discount: discountAmount > 0
                ? `₹${discountAmount.toLocaleString('en-IN')}${referralCode ? ` (${referralCode})` : ""}`
                : "-",
            dateTime: paidDate,
            dateRaw: payment.paidAt ? new Date(payment.paidAt) : new Date(0),
            paymentType: payment.paymentType || "Full Payment",
            paymentMode: payment.paymentMode || "Online",
            transactionId:
                payment.transactionId ||
                payment.cashfreePaymentId ||
                payment.cashfreeOrderId ||
                payment.razorpayPaymentId ||
                payment.razorpayOrderId ||
                "-",
            status: payment.feeStatus || "Paid",
            // Guard on the payment type, not installmentNo — a Full payment
            // carries installmentNo 1, and would otherwise fall through to the
            // running-course period label and read as a month.
            installmentInfo:
                payment.paymentType === "Installment" ? installmentSummary(payment) : "-"
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
        { Header: "Discount", accessor: "discount" },
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
        {
            Header: "",
            accessor: "transactionRef",
            render: (value) =>
                value ? (
                    <button
                        type="button"
                        onClick={() => setTimelineId(value)}
                        title="View audit trail"
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        <FiClock /> Trail
                    </button>
                ) : (
                    <span className="text-xs text-slate-400">—</span>
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
            "Discount",
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
            p.discount,
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
            {pendingInstallments.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-amber-900">
                            Outstanding fees ({pendingInstallments.length})
                        </h3>
                        <p className="text-xs text-amber-700">
                            Total {formatInr(pendingInstallments.reduce((sum, d) => sum + Number(d.amountDue || 0), 0))}
                        </p>
                    </div>
                    <div className="space-y-2">
                        {pendingInstallments.map((due) => (
                            <div
                                key={`${due.courseId}-${due.slotId}-${due.installmentNo}`}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800">
                                        {due.course?.name || "Course"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {installmentSummary({ ...due, installmentNo: due.installmentNo + 1 })} ·{" "}
                                        {due.isOverdue ? (
                                            <span className="font-medium text-rose-600">
                                                overdue since {new Date(due.dueDate).toLocaleDateString("en-IN")}
                                            </span>
                                        ) : (
                                            `due ${new Date(due.dueDate).toLocaleDateString("en-IN")}`
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {formatInr(due.amountDue)}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCashDue({
                                                ...due,
                                                studentId: student?._id,
                                                student: {
                                                    name: studentName,
                                                    email: student?.userId?.email,
                                                },
                                            })
                                        }
                                        className="rounded-2xl bg-[#FF6B35] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#fd5a1f]"
                                    >
                                        Record cash
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleExtendDueDate(due)}
                                        disabled={extendingId === due.payment?._id}
                                        className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-orange-200 hover:text-orange-600 disabled:opacity-50"
                                    >
                                        Extend due date
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                            <FiX />
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

            <RecordCashModal
                open={Boolean(cashDue)}
                due={cashDue}
                onClose={() => setCashDue(null)}
                onRecorded={() => onRefresh?.()}
            />

            <TransactionTimeline
                open={Boolean(timelineId)}
                transactionId={timelineId}
                onClose={() => setTimelineId(null)}
            />
        </div>
    );
};

export default PaymentsTab;
