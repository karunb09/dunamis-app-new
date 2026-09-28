import React, { useState } from "react";
import PageTabBar from "../../../components/PageTabBar";
import TodayPanel from "./TodayPanel";
import HistoryPanel from "./HistoryPanel";

const TABS = [
  { id: "today", label: "Today" },
  { id: "history", label: "History" },
];

const CheckInPage = () => {
  const [tab, setTab] = useState("today");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Branch check-in</p>
        <h1 className="text-2xl font-bold text-slate-900">Check in at your branch</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tap when you arrive and again when you leave. The time and your location are recorded when
          you tap, and can't be changed afterwards.
        </p>
      </div>

      <PageTabBar tabs={TABS} activeTab={tab} onChange={setTab} />

      {tab === "today" ? <TodayPanel /> : <HistoryPanel />}
    </div>
  );
};

export default CheckInPage;
