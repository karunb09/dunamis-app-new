import React, { useState } from "react";
import { CheckInShell } from "../../../components/checkIns/CheckInParts";
import StaffTodayPanel from "./StaffTodayPanel";
import StaffHistoryPanel from "./StaffHistoryPanel";

const StaffCheckInPage = () => {
  const [tab, setTab] = useState("today");
  return (
    <CheckInShell tab={tab} onTabChange={setTab}>
      {tab === "today" ? <StaffTodayPanel /> : <StaffHistoryPanel />}
    </CheckInShell>
  );
};

export default StaffCheckInPage;
