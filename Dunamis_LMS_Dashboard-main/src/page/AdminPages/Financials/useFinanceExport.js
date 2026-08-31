import { useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import { exportPayments } from "../../../api/paymentsApi";
import { exportToExcel } from "../../../utils/exportToExcel";

// "All filtered" refetches unpaged from the server — the tab only ever holds
// one page, so exporting what is loaded would silently export the page.
export default function useFinanceExport({ scope, sheetName, fileNamePrefix, columns, params }) {
  const [exporting, setExporting] = useState(false);

  const write = (rows) =>
    exportToExcel({
      fileName: `${fileNamePrefix}-${dayjs().format("YYYY-MM-DD")}`,
      sheetName,
      columns,
      rows,
    });

  const run = async (fn) => {
    setExporting(true);
    try {
      await fn();
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const exportAll = () =>
    run(async () => {
      const { page, limit, ...filters } = params;
      const data = await exportPayments({ ...filters, scope });
      const rows = data.rows || [];
      if (!rows.length) {
        toast.error("Nothing to export for these filters.");
        return;
      }
      await write(rows);
      if (data.truncated) {
        toast(
          `Exported the first ${data.maxRows} of ${data.total} rows. Narrow the filters to export the rest.`,
          { duration: 8000 }
        );
      } else {
        toast.success(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"}.`);
      }
    });

  const exportSelected = (rows) =>
    run(async () => {
      if (!rows.length) {
        toast.error("Select at least one row first.");
        return;
      }
      await write(rows);
      toast.success(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"}.`);
    });

  return { exporting, exportAll, exportSelected };
}
