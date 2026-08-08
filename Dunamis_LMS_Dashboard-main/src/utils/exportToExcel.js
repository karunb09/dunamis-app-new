export async function exportToExcel({ fileName, sheetName = "Data", columns, rows, sheets }) {
    const XLSX = await import("xlsx");
    const defs = sheets ?? [{ name: sheetName, columns, rows }];
    const wb = XLSX.utils.book_new();
    for (const def of defs) {
        const aoa = [
            def.columns.map((col) => col.header),
            ...def.rows.map((row) => def.columns.map((col) => col.value(row) ?? "")),
        ];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = def.columns.map((col) => ({
            wch: col.width || Math.max(12, col.header.length + 2),
        }));
        XLSX.utils.book_append_sheet(wb, ws, def.name.slice(0, 31));
    }
    XLSX.writeFile(wb, `${fileName}.xlsx`);
}
