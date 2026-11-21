"use client";
import { useCallback, useRef } from "react";
import api from "@/lib/axios";

const newFlowId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : null;

// Step pings for the Book Demo flow. Sent straight to the API (not the BFF) so
// its rate limiter sees the visitor's IP. Fire-and-forget: tracking never
// throws and never holds up the visitor.
export function useDemoFunnel({ courseId, source }) {
  const flowId = useRef(null);

  const start = useCallback(() => {
    flowId.current = newFlowId();
  }, []);

  const track = useCallback(
    (event, extra = {}) => {
      if (!flowId.current || !courseId) return;
      api
        .post("/v1/demoBookings/funnel", {
          flowId: flowId.current,
          event,
          courseId,
          source,
          ...extra,
        })
        .catch(() => {});
    },
    [courseId, source]
  );

  return { start, track, getFlowId: () => flowId.current };
}
