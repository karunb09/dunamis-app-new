"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";

// One request per page load, shared by the launcher and the WhatsApp bubble.
// Anything but a clear "on" (API down, flag unset) keeps the assistant hidden.
let statusRequest = null;
const fetchEnabled = () => {
  statusRequest ??= api
    .get("/v1/chatbot/status")
    .then(({ data }) => data?.enabled === true)
    .catch(() => false);
  return statusRequest;
};

export function useChatbotEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let live = true;
    fetchEnabled().then((value) => {
      if (live) setEnabled(value);
    });
    return () => {
      live = false;
    };
  }, []);

  return enabled;
}
