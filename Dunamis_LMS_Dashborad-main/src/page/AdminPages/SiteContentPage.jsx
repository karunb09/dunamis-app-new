import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  createSiteContent,
  deleteSiteContent,
  fetchSiteContent,
  updateSiteContent,
} from "../../redux/SiteContent/SiteContentSlice";

const contentTypes = [
  { value: "faq", label: "FAQs" },
  { value: "testimonial", label: "Testimonials" },
  { value: "successStory", label: "Success Stories" },
];

const emptyForm = {
  type: "faq",
  title: "",
  subtitle: "",
  body: "",
  category: "",
  tag: "",
  image: "",
  rating: 5,
  displayDate: "",
  status: "published",
  sortOrder: 0,
};

const getTypeLabel = (type) =>
  contentTypes.find((item) => item.value === type)?.label || type;

const getFieldHelp = (type) => {
  if (type === "faq") {
    return {
      title: "Question",
      subtitle: "Optional short context",
      body: "Answer",
      category: "FAQ category",
    };
  }

  if (type === "testimonial") {
    return {
      title: "Student name",
      subtitle: "Course",
      body: "Testimonial",
      category: "Optional category",
    };
  }

  return {
    title: "Student name / headline",
    subtitle: "Achievement",
    body: "Story summary",
    category: "Optional category",
  };
};

export default function SiteContentPage() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.siteContent);
  const [activeType, setActiveType] = useState("faq");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const fieldHelp = getFieldHelp(form.type);

  useEffect(() => {
    dispatch(fetchSiteContent(activeType));
  }, [activeType, dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const visibleItems = useMemo(
    () => (items || []).filter((item) => item.type === activeType),
    [activeType, items]
  );

  const resetForm = (type = activeType) => {
    setEditingId(null);
    setForm({ ...emptyForm, type });
  };

  const handleTypeChange = (type) => {
    setActiveType(type);
    resetForm(type);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      type: item.type || activeType,
      title: item.title || "",
      subtitle: item.subtitle || "",
      body: item.body || "",
      category: item.category || "",
      tag: item.tag || "",
      image: item.image || "",
      rating: item.rating ?? 5,
      displayDate: item.displayDate || "",
      status: item.status || "published",
      sortOrder: item.sortOrder || 0,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error(`${fieldHelp.title} is required`);
      return;
    }

    if (form.type !== "faq" && !form.body.trim()) {
      toast.error(`${fieldHelp.body} is required`);
      return;
    }

    const payload = {
      ...form,
      rating: Number(form.rating) || 0,
      sortOrder: Number(form.sortOrder) || 0,
    };

    try {
      if (editingId) {
        await dispatch(updateSiteContent({ id: editingId, payload })).unwrap();
        toast.success("Content updated");
      } else {
        await dispatch(createSiteContent(payload)).unwrap();
        toast.success("Content created");
      }
      resetForm(payload.type);
      setActiveType(payload.type);
    } catch (err) {
      toast.error(err || "Failed to save content");
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(`Delete "${item.title}"?`);
    if (!confirmed) return;

    try {
      await dispatch(deleteSiteContent({ id: item._id, type: item.type })).unwrap();
      toast.success("Content deleted");
      if (editingId === item._id) resetForm(item.type);
    } catch (err) {
      toast.error(err || "Failed to delete content");
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Website Content
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Manage public FAQs, testimonials, and success stories from the
          dashboard. Published records appear on the website automatically.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {contentTypes.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => handleTypeChange(item.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              activeType === item.value
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Content" : "Add Content"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={() => resetForm(activeType)}
                className="text-sm font-medium text-gray-600 hover:text-black"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Type</span>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {contentTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                {fieldHelp.title}
              </span>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                {fieldHelp.subtitle}
              </span>
              <input
                name="subtitle"
                value={form.subtitle}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                {fieldHelp.body}
              </span>
              <textarea
                name="body"
                value={form.body}
                onChange={handleChange}
                rows={5}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {fieldHelp.category}
                </span>
                <input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Tag</span>
                <input
                  name="tag"
                  value={form.tag}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Image URL
              </span>
              <input
                name="image"
                value={form.image}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Rating</span>
                <input
                  name="rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.rating}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Order</span>
                <input
                  name="sortOrder"
                  type="number"
                  value={form.sortOrder}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Display Date
              </span>
              <input
                name="displayDate"
                value={form.displayDate}
                onChange={handleChange}
                placeholder="March 2026"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Saving..." : editingId ? "Update Content" : "Create Content"}
          </button>
        </form>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {getTypeLabel(activeType)}
            </h2>
            <span className="text-sm text-gray-500">
              {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading && !visibleItems.length ? (
            <p className="py-10 text-center text-sm text-gray-500">
              Loading content...
            </p>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-600">
                No {getTypeLabel(activeType).toLowerCase()} created yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((item) => (
                <article
                  key={item._id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {item.title}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.status === "published"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="mt-1 text-sm text-gray-600">
                          {item.subtitle}
                        </p>
                      )}
                      {item.body && (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                          {item.body}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                        {item.category && <span>{item.category}</span>}
                        {item.tag && <span>{item.tag}</span>}
                        {item.displayDate && <span>{item.displayDate}</span>}
                        <span>Order {item.sortOrder || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
