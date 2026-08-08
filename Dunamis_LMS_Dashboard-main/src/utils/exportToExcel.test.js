import { describe, it, expect, vi, beforeEach } from "vitest";

const bookAppendSheet = vi.fn();
const writeFile = vi.fn();
const aoaToSheet = vi.fn((aoa) => ({ __aoa: aoa }));
const bookNew = vi.fn(() => ({ __wb: true }));

vi.mock("xlsx", () => ({
  utils: {
    aoa_to_sheet: (...args) => aoaToSheet(...args),
    book_new: (...args) => bookNew(...args),
    book_append_sheet: (...args) => bookAppendSheet(...args),
  },
  writeFile: (...args) => writeFile(...args),
}));

const { exportToExcel } = await import("./exportToExcel");

describe("exportToExcel", () => {
  beforeEach(() => {
    bookAppendSheet.mockClear();
    writeFile.mockClear();
    aoaToSheet.mockClear();
    bookNew.mockClear();
  });

  it("writes a single sheet for the legacy columns/rows signature", async () => {
    await exportToExcel({
      fileName: "students",
      sheetName: "Students",
      columns: [{ header: "Name", value: (r) => r.name }],
      rows: [{ name: "Asha" }],
    });

    expect(bookAppendSheet).toHaveBeenCalledTimes(1);
    expect(bookAppendSheet).toHaveBeenCalledWith(expect.anything(), expect.anything(), "Students");
    expect(writeFile).toHaveBeenCalledWith(expect.anything(), "students.xlsx");
  });

  it("writes one sheet per entry when `sheets` is provided", async () => {
    await exportToExcel({
      fileName: "insights",
      sheets: [
        { name: "Summary", columns: [{ header: "Metric", value: (r) => r.label }], rows: [{ label: "Students" }] },
        { name: "Growth", columns: [{ header: "Metric", value: (r) => r.label }], rows: [{ label: "Courses" }] },
      ],
    });

    expect(bookAppendSheet).toHaveBeenCalledTimes(2);
    expect(bookAppendSheet.mock.calls[0][2]).toBe("Summary");
    expect(bookAppendSheet.mock.calls[1][2]).toBe("Growth");
  });

  it("truncates sheet names longer than Excel's 31-character limit", async () => {
    await exportToExcel({
      fileName: "insights",
      sheets: [
        {
          name: "This Sheet Name Is Definitely Way Too Long For Excel",
          columns: [{ header: "Metric", value: (r) => r.label }],
          rows: [],
        },
      ],
    });

    const usedName = bookAppendSheet.mock.calls[0][2];
    expect(usedName.length).toBeLessThanOrEqual(31);
    expect(usedName).toBe("This Sheet Name Is Definitely W");
  });
});
