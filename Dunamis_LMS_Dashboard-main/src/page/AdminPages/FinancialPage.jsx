import React, { useMemo } from "react";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { FiRefreshCw } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import PageTabBar from "../../components/PageTabBar";
import { useNeedsAttentionCount, paymentKeys } from "../../hooks/usePayments";
import NeedsAttentionTab from "./Financials/NeedsAttentionTab";
import TransactionsTab from "./Financials/TransactionsTab";
import DuesTab from "./Financials/DuesTab";
import { Pill } from "./Financials/financeUi";

const TAB_IDS = ["needs-attention", "transactions", "dues"];

const FinancialPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const requestedTab = searchParams.get("tab");
  const activeTab = TAB_IDS.includes(requestedTab) ? requestedTab : "needs-attention";

  const { data: countData } = useNeedsAttentionCount();
  const critical = countData?.critical || 0;

  // Reports deep-links arrive as ?month=YYYY-MM; expand to a date range here so
  // the ledger filters can consume it.
  const initialFilters = useMemo(() => {
    const month = searchParams.get("month");
    const status = searchParams.get("status") || "";
    const dateField = searchParams.get("dateField") || "createdAt";
    if (!month) return { status, dateField };
    const start = dayjs(`${month}-01`);
    return {
      status,
      dateField,
      // dateTo is inclusive server-side, so this is the month's last day — not
      // the 1st of the next. Both are read as IST calendar days.
      dateFrom: start.format("YYYY-MM-DD"),
      dateTo: start.endOf("month").format("YYYY-MM-DD"),
    };
  }, [searchParams]);

  const tabs = [
    {
      id: "needs-attention",
      label: (
        <span className="flex items-center gap-2">
          Needs attention
          {critical > 0 && <Pill tone="rose">{critical}</Pill>}
        </span>
      ),
    },
    { id: "transactions", label: "Transactions" },
    { id: "dues", label: "Dues" },
  ];

  const changeTab = (id) => {
    // Drop the deep-link filters when the user navigates by hand.
    setSearchParams(id === "needs-attention" ? {} : { tab: id });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Finance</p>
          <h1 className="text-2xl font-bold text-slate-900">Finance Desk</h1>
          <p className="text-sm text-slate-500">
            Payments that need a person, and the full transaction ledger behind the revenue numbers.
          </p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: paymentKeys.all })}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-orange-300 hover:text-orange-600"
        >
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      <PageTabBar tabs={tabs} activeTab={activeTab} onChange={changeTab} />

      {activeTab === "needs-attention" && <NeedsAttentionTab />}
      {activeTab === "transactions" && (
        <TransactionsTab key={searchParams.toString()} initialFilters={initialFilters} />
      )}
      {activeTab === "dues" && <DuesTab />}
    </div>
  );
};

export default FinancialPage;
