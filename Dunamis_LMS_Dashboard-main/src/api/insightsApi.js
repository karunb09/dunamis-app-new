import axios from "./axios";

export const fetchMonthlyInsights = (month, trailing = 12) =>
  axios.get("/insights/monthly", { params: { month, trailing } }).then((res) => res.data);

export const fetchInsightMonths = () =>
  axios.get("/insights/months").then((res) => res.data);
