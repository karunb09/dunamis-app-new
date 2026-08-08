import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { FiRefreshCw, FiChevronLeft, FiChevronRight, FiInbox } from "react-icons/fi";
import { useMonthlyInsights, useInsightMonths } from "../../hooks/useMonthlyInsights";
import { getStoredUser } from "../../utils/authSession";
import { exportToExcel } from "../../utils/exportToExcel";
import StatTile from "../../components/insights/StatTile";
import BarRow from "../../components/insights/BarRow";
import MiniBars from "../../components/insights/MiniBars";
import FunnelBar from "../../components/insights/FunnelBar";
import ExportMenu from "../../components/ExportMenu";

const formatInr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatPct = (value) => (value == null ? "—" : `${value}%`);

const monthsBetween = (earliest, latest) => {
  if (!earliest || !latest) return [];
  const months = [];
  let cursor = dayjs(`${earliest}-01`);
  const end = dayjs(`${latest}-01`);
  while (cursor.isBefore(end) || cursor.isSame(end)) {
    months.push(cursor.format("YYYY-MM"));
    cursor = cursor.add(1, "month");
  }
  return months.reverse();
};

const SectionCard = ({ title, subtitle, children, id }) => (
  <div id={id} className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="mb-4">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const EmptyBox = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-slate-400">
    <FiInbox className="text-2xl" />
    <p className="text-sm">{text}</p>
  </div>
);

const SimpleTable = ({ headers, rows, emptyText = "No data for this month." }) =>
  rows.length ? (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
            {headers.map((h) => (
              <th key={h} className="py-2 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-slate-50">
              {cells.map((c, j) => (
                <td key={j} className="py-2.5 pr-4 text-slate-700">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="py-4 text-center text-xs text-slate-400">{emptyText}</p>
  );

const buildInsightSheets = (data) => {
  const metricRow = (label, metric) => [
    label,
    metric?.current ?? 0,
    metric?.previous ?? 0,
    metric?.delta ?? 0,
    metric?.deltaPct == null ? "" : `${metric.deltaPct}%`,
  ];
  const metricCols = [
    { header: "Metric", value: (r) => r[0], width: 28 },
    { header: "This month", value: (r) => r[1] },
    { header: "Previous month", value: (r) => r[2] },
    { header: "Change", value: (r) => r[3] },
    { header: "Change %", value: (r) => r[4] },
  ];

  const summaryRows = [
    metricRow("Students registered", data.growth.studentsRegistered),
    metricRow("Students enrolled", data.growth.studentsEnrolled),
    metricRow("Revenue (gross)", data.revenue.gross),
    metricRow("Demos booked", data.funnel.demos.booked),
  ];

  const growthRows = [
    metricRow("Students registered", data.growth.studentsRegistered),
    metricRow("Students enrolled", data.growth.studentsEnrolled),
    metricRow("Instructors added", data.growth.instructorsAdded),
    metricRow("Admins added", data.growth.adminsAdded),
    metricRow("Courses created", data.growth.coursesCreated),
    metricRow("Courses published", data.growth.coursesPublished),
    metricRow("Branches added", data.growth.branchesAdded),
    metricRow("Categories added", data.growth.categoriesAdded),
  ];

  const revenueRows = [
    metricRow("Gross revenue", data.revenue.gross),
    metricRow("Captured revenue", data.revenue.captured),
    metricRow("Discount given", data.revenue.discount),
    metricRow("Transactions", data.revenue.transactions),
    metricRow("Paying students", data.revenue.payingStudents),
  ];

  const revenueByCourseRows = (data.revenue.topCourses || []).map((c) => [c.name, c.code, c.revenue, c.transactions, c.students]);
  const revenueByCourseCols = [
    { header: "Course", value: (r) => r[0], width: 28 },
    { header: "Code", value: (r) => r[1] },
    { header: "Revenue", value: (r) => r[2] },
    { header: "Transactions", value: (r) => r[3] },
    { header: "Students", value: (r) => r[4] },
  ];

  const funnelRows = data.funnel.stages.map((s) => [s.label, s.value, s.rateFromPrev == null ? "" : `${s.rateFromPrev}%`]);
  const funnelCols = [
    { header: "Stage", value: (r) => r[0], width: 28 },
    { header: "Count", value: (r) => r[1] },
    { header: "Step conversion", value: (r) => r[2] },
  ];

  const deliveryRows = [
    metricRow("Sessions held", data.delivery.sessions.total),
    metricRow("Attendance records", data.delivery.attendance.records),
    metricRow("Completions", data.delivery.completions),
    metricRow("Assignments", data.delivery.assignments),
  ];

  const trendCols = [
    { header: "Month", value: (r) => r.month, width: 12 },
    { header: "Students registered", value: (r) => r.students },
    { header: "Enrollments", value: (r) => r.enrollments },
    { header: "Revenue", value: (r) => r.revenue },
    { header: "Demos booked", value: (r) => r.demosBooked },
    { header: "Demos converted", value: (r) => r.demosConverted },
  ];
  const trendRows = data.trailingMonths.map((month, i) => ({
    month,
    students: data.growth.studentsRegistered.series[i]?.value ?? 0,
    enrollments: data.growth.studentsEnrolled.series[i]?.value ?? 0,
    revenue: data.revenue.gross.series[i]?.value ?? 0,
    demosBooked: data.funnel.demos.booked.series[i]?.value ?? 0,
    demosConverted: data.funnel.demos.enrolled.series[i]?.value ?? 0,
  }));

  return [
    { name: "Summary", columns: metricCols, rows: summaryRows },
    { name: "Growth", columns: metricCols, rows: growthRows },
    { name: "Revenue", columns: metricCols, rows: revenueRows },
    { name: "Revenue by Course", columns: revenueByCourseCols, rows: revenueByCourseRows },
    { name: "Funnel", columns: funnelCols, rows: funnelRows },
    { name: "Delivery", columns: metricCols, rows: deliveryRows },
    { name: "Monthly Trend", columns: trendCols, rows: trendRows },
  ];
};

const MonthlyReportPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [exporting, setExporting] = useState(false);

  const month = searchParams.get("month") || dayjs().format("YYYY-MM");

  const { data, isLoading, isError, error, refetch, isFetching } = useMonthlyInsights(month);
  const { data: monthsData } = useInsightMonths();

  const authUser = useSelector((state) => state.auth?.user) || getStoredUser();
  const accountType = authUser?.accountType;
  const permissions = authUser?.permissions || [];
  const canSeeRevenue =
    accountType === "superadmin" || permissions.length === 0 || permissions.includes("allAccess") || permissions.includes("financials");

  const availableMonths = useMemo(
    () => monthsBetween(monthsData?.earliest, monthsData?.latest || dayjs().format("YYYY-MM")),
    [monthsData]
  );

  const latestMonth = monthsData?.latest || dayjs().format("YYYY-MM");
  const earliestMonth = monthsData?.earliest || month;
  const atLatest = month >= latestMonth;
  const atEarliest = month <= earliestMonth;

  const goToMonth = (m) => setSearchParams({ month: m });
  const goPrev = () => goToMonth(dayjs(`${month}-01`).subtract(1, "month").format("YYYY-MM"));
  const goNext = () => {
    if (!atLatest) goToMonth(dayjs(`${month}-01`).add(1, "month").format("YYYY-MM"));
  };

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await exportToExcel({
        fileName: `dunamis-insights-${data.month.key}`,
        sheets: buildInsightSheets(data),
      });
      toast.success("Report exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded-2xl bg-slate-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-semibold text-rose-700">Could not load the monthly report</p>
          <p className="mt-1 text-sm text-rose-600">{error?.response?.data?.message || error?.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const growth = data.growth;
  const revenue = data.revenue;
  const funnel = data.funnel;
  const delivery = data.delivery;

  const isEmptyMonth =
    growth.studentsRegistered.current === 0 &&
    growth.studentsEnrolled.current === 0 &&
    revenue.gross.current === 0 &&
    funnel.demos.booked.current === 0 &&
    delivery.sessions.total.current === 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Analytics</p>
          <h1 className="text-2xl font-bold text-slate-900">Monthly Insights</h1>
          <p className="text-sm text-slate-500">
            Growth, revenue, funnel, and delivery for {data.month.label}. Generated{" "}
            {dayjs(data.generatedAt).format("D MMM YYYY, h:mm A")}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={goPrev}
              disabled={atEarliest}
              className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <FiChevronLeft />
            </button>
            <select
              value={month}
              onChange={(e) => goToMonth(e.target.value)}
              className="rounded-xl border-0 bg-transparent px-2 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-100"
            >
              {(availableMonths.length ? availableMonths : [month]).map((m) => (
                <option key={m} value={m}>
                  {dayjs(`${m}-01`).format("MMM YYYY")}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={goNext}
              disabled={atLatest}
              className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <FiChevronRight />
            </button>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-orange-300 hover:text-orange-600 disabled:opacity-60"
          >
            <FiRefreshCw className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          <ExportMenu onExportAll={handleExport} totalCount={1} selectedCount={0} exporting={exporting} />
        </div>
      </div>

      {data.partial && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ Some sections could not be computed this run: {data.failedSections.join(", ")}. Those figures may read as
          zero — try refreshing.
        </div>
      )}

      {isEmptyMonth ? (
        <EmptyBox text="Nothing here yet for this month." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Students registered" {...growth.studentsRegistered} />
            <StatTile label="New enrollments" {...growth.studentsEnrolled} />
            <StatTile label="Revenue" {...revenue.gross} format={formatInr} />
            <StatTile label="Demo → enroll rate" current={funnel.demos.conversionRate ?? 0} format={(v) => `${v}%`} />
          </div>

          <SectionCard title="Growth" subtitle="New courses, students, and instructors this month">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatTile label="Instructors added" {...growth.instructorsAdded} />
              <StatTile label="Courses created" {...growth.coursesCreated} />
              <StatTile label="Courses published" {...growth.coursesPublished} />
              <StatTile label="Branches added" {...growth.branchesAdded} />
              <StatTile label="Categories added" {...growth.categoriesAdded} />
              <StatTile label="Admins added" {...growth.adminsAdded} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-slate-500">Total students</p>
                <p className="text-lg font-semibold text-slate-900">{growth.cumulative.students.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-slate-500">Total courses</p>
                <p className="text-lg font-semibold text-slate-900">{growth.cumulative.courses.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-slate-500">Total instructors</p>
                <p className="text-lg font-semibold text-slate-900">{growth.cumulative.instructors.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-slate-500">Active branches</p>
                <p className="text-lg font-semibold text-slate-900">{growth.cumulative.activeBranches.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </SectionCard>

          {canSeeRevenue ? (
            <SectionCard title="Revenue" subtitle="Recognized revenue from PaymentTransaction (paidAt-based)">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Gross revenue" {...revenue.gross} format={formatInr} />
                <StatTile label="Captured revenue" {...revenue.captured} format={formatInr} />
                <StatTile label="Discount given" {...revenue.discount} format={formatInr} />
                <StatTile label="Paying students" {...revenue.payingStudents} />
              </div>

              <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">12-month revenue trend</p>
              <MiniBars data={revenue.gross.series} />

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">By delivery mode</p>
                  {revenue.byDeliveryMode.map((r) => (
                    <BarRow key={r.key} label={r.key} value={r.amount} displayValue={formatInr(r.amount)} max={revenue.gross.current || 1} />
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">By payment type</p>
                  {revenue.byPaymentType.map((r) => (
                    <BarRow key={r.key} label={r.key} value={r.amount} displayValue={formatInr(r.amount)} max={revenue.gross.current || 1} />
                  ))}
                </div>
              </div>

              <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Top courses by revenue</p>
              <SimpleTable
                headers={["Course", "Revenue", "Transactions", "Students"]}
                rows={(revenue.topCourses || []).map((c) => [c.name, formatInr(c.revenue), c.transactions, c.students])}
              />

              <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">By branch</p>
              <SimpleTable
                headers={["Branch", "City", "Revenue", "Transactions"]}
                rows={(revenue.byBranch || []).map((b) => [b.branchName, b.cityName, formatInr(b.revenue), b.transactions])}
                emptyText="No offline branch revenue this month."
              />

              <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-slate-500">Outstanding dues</p>
                  <p className="text-lg font-semibold text-slate-900">{formatInr(revenue.outstanding.amount)}</p>
                  <p className="text-xs text-slate-400">
                    {revenue.outstanding.count} installment(s)
                    {revenue.outstanding.asOfNow ? " · as of today" : ""}
                  </p>
                  <Link
                    to="/admin/financials?tab=dues"
                    className="mt-1 inline-block text-xs font-medium text-orange-600 hover:underline"
                  >
                    View who owes →
                  </Link>
                </div>
                <div>
                  <p className="text-slate-500">Refunded</p>
                  <p className="text-lg font-semibold text-slate-900">{formatInr(revenue.refunded.amount)}</p>
                  <p className="text-xs text-slate-400">{revenue.refunded.count} transaction(s)</p>
                  <Link
                    to={`/admin/financials?tab=transactions&status=refunded&month=${data.month.key}`}
                    className="mt-1 inline-block text-xs font-medium text-orange-600 hover:underline"
                  >
                    View refunds →
                  </Link>
                </div>
                <div>
                  <p className="text-slate-500">Referral discount given</p>
                  <p className="text-lg font-semibold text-slate-900">{formatInr(revenue.referrals.discountGiven)}</p>
                  <p className="text-xs text-slate-400">{revenue.referrals.pendingRewards} reward(s) pending</p>
                </div>
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Revenue">
              <EmptyBox text="You don't have access to financial data." />
            </SectionCard>
          )}

          <SectionCard title="Funnel" subtitle="Leads → demos → enrollments">
            <FunnelBar stages={funnel.stages} />

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Demo outcomes</p>
                <BarRow label="Attended" value={funnel.demos.attended.current} max={funnel.demos.booked.current || 1} tone="emerald" />
                <BarRow label="Missed" value={funnel.demos.missed.current} max={funnel.demos.booked.current || 1} tone="rose" />
                <BarRow label="Cancelled" value={funnel.demos.cancelled.current} max={funnel.demos.booked.current || 1} tone="slate" />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Applications & requests</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Teacher applications</p>
                    <p className="text-lg font-semibold text-slate-900">{funnel.teacherApplications.total.current}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Course requests</p>
                    <p className="text-lg font-semibold text-slate-900">{funnel.courseRequests.total.current}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Top courses by demo bookings</p>
            <SimpleTable
              headers={["Course", "Demos booked"]}
              rows={(funnel.demos.topCourses || []).map((c) => [c.name, c.booked])}
            />
          </SectionCard>

          <SectionCard title="Delivery" subtitle="Classes held, attendance, and academic activity">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Sessions held" {...delivery.sessions.total} />
              <StatTile label="Attendance records" {...delivery.attendance.records} />
              <StatTile label="Completions" {...delivery.completions} />
              <StatTile label="Assignments" {...delivery.assignments} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Attendance</p>
                <BarRow label="Present" value={delivery.attendance.present} displayValue={`${formatPct(delivery.attendance.rate)}`} max={delivery.attendance.present + delivery.attendance.absent || 1} tone="emerald" />
                <p className="mt-2 text-xs text-slate-400">
                  {delivery.attendance.activeStudents} active student(s) · {delivery.attendance.activeInstructors} active instructor(s)
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Feedback</p>
                <p className="text-sm text-slate-600">
                  {delivery.feedback.count} response(s) · avg course rating {delivery.feedback.avgCourseRating ?? "—"} · avg
                  instructor rating {delivery.feedback.avgInstructorRating ?? "—"}
                </p>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default MonthlyReportPage;
