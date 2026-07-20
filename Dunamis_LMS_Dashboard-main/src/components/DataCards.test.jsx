import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import DataCards from "./DataCards";
import DataTable from "./Table";

// Regression: pages rebuild `data` every render and mirror selection via
// onSelectionChange — the prune effect must not emit a new array reference
// when nothing changed, or the feedback loop throws "Maximum update depth".

const ROWS = [
  { _id: "a", name: "Alpha" },
  { _id: "b", name: "Beta" },
];

const CardsHarness = () => {
  const [selectedIds, setSelectedIds] = useState([]);
  const data = ROWS.map((row) => ({ ...row }));
  return (
    <div>
      <span data-testid="selected-count">{selectedIds.length}</span>
      <DataCards
        data={data}
        onSelectionChange={setSelectedIds}
        renderCard={(row, { selected, onSelect }) => (
          <label key={row._id}>
            <input type="checkbox" checked={selected} onChange={onSelect} />
            {row.name}
          </label>
        )}
      />
    </div>
  );
};

const TableHarness = () => {
  const [selectedIds, setSelectedIds] = useState([]);
  const data = ROWS.map((row) => ({ ...row }));
  return (
    <div>
      <span data-testid="selected-count">{selectedIds.length}</span>
      <DataTable
        data={data}
        onSelectionChange={setSelectedIds}
        columns={[{ key: "name", header: "Name" }]}
      />
    </div>
  );
};

describe("DataCards selection lifting", () => {
  it("renders with fresh data references without looping", () => {
    render(<CardsHarness />);
    expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
  });

  it("select-all selects the full dataset and reports it to the parent", () => {
    render(<CardsHarness />);
    fireEvent.click(screen.getByLabelText(/select all/i));
    expect(screen.getByTestId("selected-count")).toHaveTextContent("2");
    fireEvent.click(screen.getByLabelText(/select all/i));
    expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
  });

  it("individual selection reaches the parent", () => {
    render(<CardsHarness />);
    fireEvent.click(screen.getByLabelText("Alpha"));
    expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
  });
});

describe("DataTable selection lifting", () => {
  it("renders with fresh data references without looping", () => {
    render(<TableHarness />);
    expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
  });

  it("header select-all selects the full dataset and reports it to the parent", () => {
    render(<TableHarness />);
    const [headerCheckbox] = screen.getAllByRole("checkbox");
    fireEvent.click(headerCheckbox);
    expect(screen.getByTestId("selected-count")).toHaveTextContent("2");
  });
});
