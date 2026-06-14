import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "./Pagination";

describe("Pagination", () => {
  const setup = (props = {}) => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={props.currentPage ?? 1}
        totalPages={props.totalPages ?? 5}
        onPageChange={onPageChange}
      />
    );
    return { onPageChange };
  };

  it("renders the page indicator and page buttons", () => {
    setup({ currentPage: 1, totalPages: 5 });
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
  });

  it("disables Previous on the first page and Next on the last", () => {
    const { onPageChange } = setup({ currentPage: 1, totalPages: 5 });
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("calls onPageChange when a different page is clicked", () => {
    const { onPageChange } = setup({ currentPage: 1, totalPages: 5 });
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("advances via the Next button", () => {
    const { onPageChange } = setup({ currentPage: 2, totalPages: 5 });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("does not fire when the current page is clicked", () => {
    const { onPageChange } = setup({ currentPage: 2, totalPages: 5 });
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
