export async function exportToExcel({ fileName, sheetName = "Data", columns, rows }) {
    const XLSX = await import("xlsx");
    const aoa = [
        columns.map((col) => col.header),
        ...rows.map((row) => columns.map((col) => col.value(row) ?? "")),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = columns.map((col) => ({
        wch: col.width || Math.max(12, col.header.length + 2),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
}
