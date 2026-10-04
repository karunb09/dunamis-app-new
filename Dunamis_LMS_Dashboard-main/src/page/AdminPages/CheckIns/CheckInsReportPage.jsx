import React from "react";
import { useSearchParams } from "react-router-dom";
import PageTabBar from "../../../components/PageTabBar";
import ScopeBanner from "../../../components/org/ScopeBanner";
import { RangePicker } from "../../../components/checkIns/ReportParts";
import { formatDay, istDayKey } from "../../../utils/checkInFormat";
import InstructorCheckInsTab from "./InstructorCheckInsTab";
import StaffCheckInsTab from "./StaffCheckInsTab";

const TABS = [
  { id: "instructors", label: "Instructors" },
  { id: "staff", label: "Staff" },
];

const CheckInsReportPage = () => {
  const today = istDayKey();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "staff" ? "staff" : "instructors";
  const from = searchParams.get("from") || today;
  const to = searchParams.get("to") || from;

  const update = (next) => {
    const params = { from, to, tab, ...next };
    setSearchParams(params.tab === "instructors" ? { from: params.from, to: params.to } : params);
  };

  const rangeLabel = from === to ? formatDay(from) : `${formatDay(from)} – ${formatDay(to)}`;

  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Analytics</p>
        <h1 className="text-2xl font-bold text-slate-900">Check-ins</h1>
        <p className="text-sm text-slate-500">Branch check-ins and check-outs, {rangeLabel}.</p>
      </div>

      <PageTabBar tabs={TABS} activeTab={tab} onChange={(id) => update({ tab: id })} />

      <ScopeBanner />

      <RangePicker from={from} to={to} today={today} onChange={(range) => update(range)} />

      {tab === "staff" ? (
        <StaffCheckInsTab from={from} to={to} />
      ) : (
        <InstructorCheckInsTab from={from} to={to} />
      )}
    </div>
  );
};

export default CheckInsReportPage;
