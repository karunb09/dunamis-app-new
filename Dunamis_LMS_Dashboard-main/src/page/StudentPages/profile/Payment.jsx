import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getUserById } from "../../../redux/User/UserSlice";
import { getCourses } from "../../../redux/Course/CourseSlice";
import { useParams } from "react-router-dom";

// Transform payment data to courses format
function transformPaymentsToCourses(userData, courseList = []) {
  if (!userData?.roleId?.enrolledCourses) return [];

  const courseMap = {};
  courseList.forEach((course) => {
    courseMap[course._id] = course;
  });

  return userData.roleId.enrolledCourses
    .map((enrollment) => {
      const courseId = enrollment.courseId;

      if (!courseMap[courseId]) {
        console.warn(`Course ${courseId} not found in course list`);
        return null;
      }

      const coursePayments = userData.roleId.payments.filter(
        (p) => p.courseId === courseId
      );

      if (coursePayments.length === 0) return null;

      const totalPaid = coursePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalInstallments = coursePayments[0]?.installmentTotal || 1;
      const paidInstallments = coursePayments.filter(
        (p) => p.feeStatus === "Paid"
      ).length;
      const remainingInstallments = Math.max(0, totalInstallments - paidInstallments);

      const unpaidPayment = coursePayments.find((p) => p.feeStatus !== "Paid");
      let nextPaymentDate = null;
      if (unpaidPayment?.dueDate) {
        const date = new Date(unpaidPayment.dueDate);
        nextPaymentDate = date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }

      const fullAmount = coursePayments.reduce((max, p) => {
        if (p.installmentTotal === 1) return Math.max(max, p.amount || 0);
        return Math.max(max, (p.installmentAmount || 0) * p.installmentTotal);
      }, 0);

      const courseData = courseMap[courseId];
      const courseName = courseData.name;

      let modeIcon = "/mastercard.svg";
      if (coursePayments[0]?.paymentMode?.toLowerCase().includes("google")) {
        modeIcon = "/google-pay.svg";
      }

      return {
        id: courseId,
        name: courseName,
        classType: coursePayments[0]?.sessionType === "premium" ? "Individual class" : "Group class",
        payee: `****${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        mode: {
          label: coursePayments[0]?.paymentMode || "Credit/Debit Card",
          icon: modeIcon,
        },
        paymentType: coursePayments[0]?.paymentType || "Installments",
        status: {
          label:
            remainingInstallments === 0
              ? "Paid"
              : `${remainingInstallments} installments left`,
          paid: remainingInstallments === 0,
        },
        amountPaid: `₹${totalPaid.toLocaleString('en-IN')}`,
        fullAmount: `₹${fullAmount.toLocaleString('en-IN')}`,
        nextPayment: nextPaymentDate,
      };
    })
    .filter(Boolean);
}

// Transform payments to session/payment rows
function transformPaymentsToSessions(userData, courseList = []) {
  if (!userData?.roleId?.payments) return {};

  const courseMap = {};
  courseList.forEach((course) => {
    courseMap[course._id] = course;
  });

  const sessionsByType = {};

  userData.roleId.payments.forEach((payment) => {
    const courseId = payment.courseId;

    if (!sessionsByType[courseId]) {
      sessionsByType[courseId] = [];
    }

    const paymentDate = new Date(payment.paidAt || payment.createdAt);
    const installmentLabel =
      payment.installmentNo && payment.installmentTotal
        ? `Installment ${payment.installmentNo}/${payment.installmentTotal}`
        : "Full Payment";

    const courseData = courseMap[courseId];
    const courseName = courseData?.name || `Course ${courseId.slice(-8)}`;

    sessionsByType[courseId].push({
      id: payment._id,
      course: courseName,
      type: payment.sessionType ? `${payment.sessionType} session` : "Session",
      amount: `₹${payment.amount}`,
      datetime: paymentDate.toLocaleString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      paymentType: installmentLabel,
      paymentMode: payment.paymentMode || "Razorpay",
      txn: payment.razorpayPaymentId || payment.transactionId || "N/A",
      status: payment.feeStatus || "Pending",
    });
  });

  return sessionsByType;
}

function PaymentDetailsTopBar({ onDownload }) {
  return (
    <div className="flex justify-end items-center w-full mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <button
        className="border border-[#E5E7EB] rounded-lg px-4 py-2 text-black bg-white hover:bg-gray-50 transition text-[13px] font-medium flex items-center gap-2"
        onClick={typeof onDownload === "function" ? onDownload : () => alert("Download invoices")}
        type="button"
      >
        <svg width={16} height={16} fill="none" viewBox="0 0 20 20">
          <path d="M10 11V7M10 13.167l-1.167-1.167M10 13.167l1.167-1.167" stroke="#191919" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Download Invoices
      </button>
    </div>
  );
}

function UpcomingPayments({ payments, courseMap }) {
  const upcoming = payments
    .filter(p => new Date(p.dueDate) > new Date() && p.feeStatus !== 'Paid')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

  if (!upcoming) return null;

  const course = courseMap[upcoming.courseId];
  if (!course) return null;

  const dueDate = new Date(upcoming.dueDate);
  const dueTime = dueDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const isTomorrow = new Date().getDate() + 1 === dueDate.getDate() && new Date().getMonth() === dueDate.getMonth();
  const dueDay = isTomorrow ? 'Tomorrow' : dueDate.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });

  return (
    <div className="w-full md:w-[320px] px-9 py-9">
      <h2 className="text-[16px] font-semibold text-black mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
        Upcoming Payments
      </h2>
      <div className="bg-white rounded-lg p-4 border border-[#E5E7EB] shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5 text-red-500">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>
            <span className="font-semibold text-[14px]">Payment Due</span>
          </div>
          <span className="text-[12px] text-[#6B7280]">{`${dueTime}, ${dueDay}`}</span>
        </div>
        
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-[#DCFCE7] text-[#16A34A] text-[11px] px-2 py-0.5 rounded-full font-medium">
            {course.category?.name || 'Category'}
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[14px] text-black font-medium">{course.name}</p>
            <p className="text-[13px] text-[#6B7280]">₹{upcoming.amount.toLocaleString('en-IN')}</p>
          </div>
          <button className="bg-[#EF4444] text-white text-[13px] px-4 py-1.5 rounded-lg hover:bg-red-600 transition">
            Pay
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentDetails() {
  const dispatch = useDispatch();
  const { id } = useParams();

  const { token } = useSelector((state) => state.auth);
  const { selectedUser, loading: userLoading, error: userError } = useSelector((state) => state.user);
  const { courseList, status: courseStatus } = useSelector((state) => state.course);

  const [selectedId, setSelectedId] = useState(null);
  const [checked, setChecked] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sessionDetails, setSessionDetails] = useState({});
  const [courseMap, setCourseMap] = useState({});

  useEffect(() => {
    if (id && token) {
      dispatch(getUserById({ id, token }));
    }
  }, [id, token, dispatch]);

  useEffect(() => {
    dispatch(getCourses());
  }, [dispatch]);

  useEffect(() => {
    if (selectedUser && courseList && courseList.length > 0) {
      const transformedCourses = transformPaymentsToCourses(selectedUser, courseList);
      const transformedSessions = transformPaymentsToSessions(selectedUser, courseList);

      const newCourseMap = {};
      courseList.forEach(course => newCourseMap[course._id] = course);

      setCourses(transformedCourses);
      setSessionDetails(transformedSessions);
      setCourseMap(newCourseMap);

      if (transformedCourses.length > 0) {
        setSelectedId(transformedCourses[0].id);
      }
    }
  }, [selectedUser, courseList]);

  const sessions = sessionDetails[selectedId] || [];
  const allChecked = checked.length === sessions.length && sessions.length > 0;

  const toggleCheck = (id) =>
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );

  const checkAll = () =>
    setChecked(allChecked ? [] : sessions.map((item) => item.id));

  const handleDelete = () => setChecked([]);

  const handleCopy = () =>
    navigator.clipboard.writeText(
      sessions
        .filter((s) => checked.includes(s.id))
        .map((row) => Object.values(row).join(" | "))
        .join("\n")
    );

  const handleDownloadInvoices = () => {
    alert("Downloading all invoices...");
  };

  const loading = userLoading || courseStatus === "loading";
  const error = userError;

  if (loading) {
    return (
      <div className="w-full pt-2 flex items-center justify-center h-64">
        <div className="text-gray-500" style={{ fontFamily: 'Poppins, sans-serif' }}>Loading payment details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full pt-2 flex items-center justify-center h-64">
        <div className="text-red-500" style={{ fontFamily: 'Poppins, sans-serif' }}>Error: {error}</div>
      </div>
    );
  }

  if (!selectedUser || courses.length === 0) {
    return (
      <div className="w-full pt-2 flex items-center justify-center h-64">
        <div className="text-gray-500" style={{ fontFamily: 'Poppins, sans-serif' }}>No payment data available</div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <PaymentDetailsTopBar onDownload={handleDownloadInvoices} />
      <div className="flex flex-col md:flex-row ">
        <div className="flex-1">
          <h2 className="text-[16px] font-semibold text-black mb-2 flex items-center gap-2">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.746c-.917-.35-2.107-.69-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/></svg>
            Courses
          </h2>
          <div className="space-y-3 mt-4">
            {courses.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg p-4 border transition-all shadow-sm cursor-pointer ${
                  selectedId === item.id ? "border-[#6348C1]" : "border-[#E5E7EB]"
                }`}
                onClick={() => {
                  setSelectedId(item.id);
                  setChecked([]);
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-black">{item.name}</h3>
                    <span className="bg-[#F3E8FF] text-[#7C3AED] text-[10px] px-2 py-0.5 rounded-full font-medium">
                      {item.classType}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-[#6B7280]">{item.payee}</span>
                    <img src={item.mode.icon} alt={item.mode.label} className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-x-6 gap-y-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-[#6B7280]">Mode</span>
                    <div className="flex items-center gap-1">
                      <img src={item.mode.icon} alt="" className="w-4 h-4" />
                      <span className="text-[13px] text-[#374151]">{item.mode.label}</span>
                    </div>
                  </div>
                  <div className="border-l h-6 border-[#E5E7EB]" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-[#6B7280]">Payment Type</span>
                    <span className="text-[13px] text-[#374151]">{item.paymentType}</span>
                  </div>
                  <div className="border-l h-6 border-[#E5E7EB]" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-[#6B7280]">Status</span>
                    {item.status.paid ? (
                      <div className="flex items-center gap-1.5 text-[#10B981]">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L6.313 9.25l-1.74-1.74a.75.75 0 1 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l4.5-4.5a.75.75 0 0 0-.022-1.08z"/></svg>
                        <span className="text-[13px]">{item.status.label}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#6B7280]">
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-[#D1D5DB]" />
                        <span className="text-[13px]">{item.status.label}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-l h-6 border-[#E5E7EB]" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-[#6B7280]">Amount Paid</span>
                    <span className="text-[13px]">
                      <span className="font-semibold text-black">{item.amountPaid}</span>
                      <span className="line-through ml-1 text-[#EF4444] text-[11px]">{item.fullAmount}</span>
                    </span>
                  </div>
                  {item.nextPayment && (
                    <>
                      <div className="border-l h-6 border-[#E5E7EB]" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-[#6B7280]">Next Payment</span>
                        <span className="text-[13px] text-[#374151]">{item.nextPayment}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[#E5E7EB] bg-white overflow-x-auto mt-6">
            <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB]">
              <div className="flex gap-2 items-center">
                <input type="checkbox" checked={allChecked} onChange={checkAll} className="accent-[#6348C1] w-5 h-5"/>
                <span className="text-black text-[13px] font-medium">Select All</span>
                <button className="ml-3 px-3 py-1.5 rounded bg-gray-100 text-black text-[12px] font-medium border border-[#E5E7EB] hover:bg-gray-200 transition disabled:opacity-50" disabled={!checked.length} onClick={handleCopy}>Copy</button>
                <span className="ml-2 text-[12px] text-[#9CA3AF]">{checked.length ? `${checked.length} Selected` : null}</span>
              </div>
            </div>

            <table className="min-w-[900px] w-full text-[13px] font-normal">
              <thead>
                <tr className="text-[#6B7280] font-medium bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="text-left px-4 py-3 font-medium">Course</th>
                  <th className="text-left px-3 py-3 font-medium">Session type</th>
                  <th className="text-left px-3 py-3 font-medium">Amount</th>
                  <th className="text-left px-3 py-3 font-medium">Time & Date</th>
                  <th className="text-left px-3 py-3 font-medium">Payment Type</th>
                  <th className="text-left px-3 py-3 font-medium">Payment Mode</th>
                  <th className="text-left px-3 py-3 font-medium">Transaction ID</th>
                  <th className="text-left px-3 py-3 font-medium">Fee Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((row) => (
                  <tr key={row.id} className={`border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition ${checked.includes(row.id) ? "bg-purple-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={checked.includes(row.id)} onChange={() => toggleCheck(row.id)} className="accent-[#6348C1] w-4 h-4"/>
                        <span className="text-black">{row.course}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[#374151]">{row.type}</td>
                    <td className="px-3 py-3 text-[#374151]">{row.amount}</td>
                    <td className="px-3 py-3 text-[#374151]">{row.datetime}</td>
                    <td className="px-3 py-3 text-[#374151]">{row.paymentType}</td>
                    <td className="px-3 py-3 text-[#374151]">{row.paymentMode}</td>
                    <td className="px-3 py-3 text-[#374151]">{row.txn}</td>
                    <td className="px-3 py-3">
                      {row.status === "Paid" ? (
                        <span className="inline-flex items-center gap-1 text-[#10B981]"><span className="w-1.5 h-1.5 bg-[#10B981] rounded-full" />Paid</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#F59E0B]"><span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full" />{row.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!sessions.length && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-[#9CA3AF]">No session/payment data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <UpcomingPayments payments={selectedUser?.roleId?.payments || []} courseMap={courseMap} />
      </div>
    </div>
  );
}
