import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("./axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import axios from "./axios";
import {
  fetchCategories,
  updateCategory,
  deleteCategory,
  createCategoryWithSubCategories,
} from "./categoryApi";

describe("categoryApi.fetchCategories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flattens subcategories with a categoryId back-reference", async () => {
    axios.get.mockResolvedValue({
      data: {
        categories: [
          { _id: "c1", name: "Music", subcategories: [{ _id: "s1", name: "Guitar" }] },
          { _id: "c2", name: "Dance", subcategories: [] },
        ],
      },
    });
    const { categories, subCategories } = await fetchCategories();
    expect(categories).toHaveLength(2);
    expect(subCategories).toEqual([{ _id: "s1", name: "Guitar", categoryId: "c1" }]);
    expect(axios.get).toHaveBeenCalledWith("/category/get-all-category");
  });

  it("tolerates a missing categories field", async () => {
    axios.get.mockResolvedValue({ data: {} });
    const { categories, subCategories } = await fetchCategories();
    expect(categories).toEqual([]);
    expect(subCategories).toEqual([]);
  });

  it("wraps backend errors with a readable message", async () => {
    axios.get.mockRejectedValue({ response: { data: { message: "boom" } } });
    await expect(fetchCategories()).rejects.toThrow("boom");
  });
});

describe("categoryApi mutations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createCategoryWithSubCategories POSTs to /category/create-full", async () => {
    axios.post.mockResolvedValue({ data: { category: { _id: "c1" } } });
    const res = await createCategoryWithSubCategories({ name: "X" });
    expect(axios.post).toHaveBeenCalledWith("/category/create-full", { name: "X" });
    expect(res).toEqual({ _id: "c1" });
  });

  it("updateCategory PUTs to /category/:id and returns the category", async () => {
    axios.put.mockResolvedValue({ data: { category: { _id: "c1", name: "X" } } });
    const res = await updateCategory({ id: "c1", updatedData: { name: "X" } });
    expect(axios.put).toHaveBeenCalledWith("/category/c1", { name: "X" });
    expect(res).toEqual({ _id: "c1", name: "X" });
  });

  it("deleteCategory DELETEs and returns the id", async () => {
    axios.delete.mockResolvedValue({});
    const res = await deleteCategory("c9");
    expect(axios.delete).toHaveBeenCalledWith("/category/c9");
    expect(res).toBe("c9");
  });
});
