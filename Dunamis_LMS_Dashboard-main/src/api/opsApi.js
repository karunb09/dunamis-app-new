import axios from "./axios";

export const fetchOpsStatus = () =>
  axios.get("/ops/status").then((res) => res.data);
