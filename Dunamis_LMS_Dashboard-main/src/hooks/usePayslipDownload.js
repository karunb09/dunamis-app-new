import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { downloadPayslip } from "../api/instructorPayApi";

const fileNameFor = (record, employeeId) =>
  `Dunamis-Payslip-${employeeId || record.teacherId || "instructor"}-${record.month}.pdf`;

const saveBlobUrl = (url, fileName) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

// Prepares a payslip once per record and hands it over from a Swal confirm —
// browsers only reliably honour a programmatic download inside a user gesture,
// so the popup's button is what actually saves the file.
export default function usePayslipDownload() {
  const [preparingId, setPreparingId] = useState(null);
  const blobUrls = useRef(new Map());

  useEffect(
    () => () => {
      blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrls.current.clear();
    },
    []
  );

  const offer = (url, record, employeeId, alreadyPrepared) =>
    Swal.fire({
      icon: "success",
      title: "Payslip ready",
      text: alreadyPrepared
        ? `Your ${record.monthLabel || record.month} payslip is ready to download again.`
        : `Your ${record.monthLabel || record.month} payslip has been prepared.`,
      confirmButtonText: "Download PDF",
      confirmButtonColor: "#FF6B35",
      showCancelButton: true,
      cancelButtonText: "Close",
    }).then((result) => {
      if (result.isConfirmed) saveBlobUrl(url, fileNameFor(record, employeeId));
    });

  const requestPayslip = async (record, employeeId) => {
    const id = record?._id;
    if (!id || preparingId) return;

    const cached = blobUrls.current.get(id);
    if (cached) {
      await offer(cached, record, employeeId, true);
      return;
    }

    setPreparingId(id);
    try {
      const blob = await downloadPayslip(id);
      const url = URL.createObjectURL(blob);
      blobUrls.current.set(id, url);
      await offer(url, record, employeeId, false);
    } catch (err) {
      toast.error(err.message || "Could not prepare the payslip");
    } finally {
      setPreparingId(null);
    }
  };

  return { preparingId, requestPayslip };
}
