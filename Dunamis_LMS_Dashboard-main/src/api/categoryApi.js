import axios from "./axios";

// Pure data-access for the Category domain. Caching/loading/error are owned by
// TanStack Query (see hooks/useCategories.js). The bearer token is attached by
// the axios request interceptor.

const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error(msg || fallback);
  e.response = err.response;
  return e;
};

// Returns { categories, subCategories } — subCategories are flattened from each
// category with a back-reference categoryId, matching the old slice's shape.
export async function fetchCategories() {
  try {
    const { data } = await axios.get("/category/get-all-category");
    const categories = data.categories || [];
    const subCategories = categories.flatMap((category) =>
      (category.subcategories || []).map((subCat) => ({
        ...subCat,
        categoryId: category._id,
      }))
    );
    return { categories, subCategories };
  } catch (err) {
    throw toError(err, "Failed to load categories");
  }
}

export async function createCategoryWithSubCategories(categoryData) {
  try {
    const { data } = await axios.post("/category/create-full", categoryData);
    return data.category;
  } catch (err) {
    throw toError(err, "Failed to create category");
  }
}

export async function updateCategory({ id, updatedData }) {
  try {
    const { data } = await axios.put(`/category/${id}`, updatedData);
    return data.category;
  } catch (err) {
    throw toError(err, "Failed to update category");
  }
}

export async function deleteCategory(id) {
  try {
    await axios.delete(`/category/${id}`);
    return id;
  } catch (err) {
    throw toError(err, "Failed to delete category");
  }
}
