import React, { useEffect } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import RemunerationTab from "../AdminPages/UserManagement/Instructor/TabContent/RemunerationTab";
import { usePayoutsForTeacher } from "../../hooks/useInstructorPay";
import { getStoredUser } from "../../utils/authSession";
import { getTeacherRoleId } from "../../utils/roleIdentity";

// The instructor's own payout history. Drafts are filtered out server-side as
// well — nothing reaches this view before an admin approves it in Financials.
export default function MyRemuneration({ user }) {
  const authUser = useSelector((state) => state.auth?.user);
  const teacherId = getTeacherRoleId(authUser || getStoredUser() || {});

  const { data, isLoading, isError, error } = usePayoutsForTeacher(teacherId);

  useEffect(() => {
    if (isError) toast.error(error?.message || "Failed to load your payouts");
  }, [isError, error]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">My Remuneration</h2>
        <p className="mt-1 text-sm text-slate-500">
          Approved payouts, month by month. Each one is computed from the
          attendance you marked; download the payslip to check the working.
        </p>
      </div>

      <RemunerationTab
        remunerations={data?.data || []}
        employeeId={user?.employeeId}
        showDrafts={false}
        loading={isLoading}
      />
    </div>
  );
}
