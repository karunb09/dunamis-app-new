import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  createSiteContent,
  deleteSiteContent,
  fetchSiteContent,
  updateSiteContent,
} from "../../redux/SiteContent/SiteContentSlice";

const maxImageSize = 2 * 1024 * 1024;

const contentTypes = [
  { value: "faq", label: "FAQs" },
  { value: "testimonial", label: "Reviews" },
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
  youtubeUrl: "",
  rating: 5,
  displayDate: "",
  status: "published",
  sortOrder: 0,
};

const getTypeLabel = (type) =>
  contentTypes.find((item) => item.value === type)?.label || type;

const getFieldHelp = (type) => {
  if (type === "faq") return { title: "Question", subtitle: "Optional short context", body: "Answer", category: "FAQ category" };
  if (type === "testimonial") return { title: "Student name", subtitle: "Course", body: "Review" };
  return { title: "Name / headline", subtitle: "YouTube URL", body: "Story summary" };
};

const getYoutubeUrl = (value) => {
  const url = String(value || "").trim();
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url) ? url : "";
};

const buildPayload = (form, imageFile) => {
  const cleaned = { ...form, rating: Number(form.rating) || 0, sortOrder: Number(form.sortOrder) || 0 };
  if (cleaned.type === "testimonial") { cleaned.category = ""; cleaned.tag = ""; cleaned.youtubeUrl = ""; }
  if (cleaned.type === "successStory") {
    cleaned.subtitle = cleaned.youtubeUrl;
    cleaned.category = ""; cleaned.tag = "";
    cleaned.rating = 5; cleaned.sortOrder = 0;
    cleaned.status = "published"; cleaned.displayDate = "";
  }
  if (cleaned.type === "faq") { cleaned.image = ""; cleaned.youtubeUrl = ""; }
  const payload = new FormData();
  Object.entries(cleaned).forEach(([key, value]) => payload.append(key, value ?? ""));
  if (imageFile) payload.set("image", imageFile);
  return payload;
};

const FIELD_INPUT = "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

export default function SiteContentPage() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.siteContent);
  const [activeType, setActiveType] = useState("faq");
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const fieldHelp = getFieldHelp(form.type);
  const isFaq = form.type === "faq";
  const isSuccessStory = form.type === "successStory";
  const usesImageUpload = !isFaq;

  useEffect(() => { dispatch(fetchSiteContent(activeType)); }, [activeType, dispatch]);
  useEffect(() => { if (error) toast.error(error); }, [error]);

  const visibleItems = useMemo(
    () => (items || []).filter((item) => item.type === activeType),
    [activeType, items]
  );

  const resetForm = (type = activeType) => {
    setEditingId(null);
    setImageFile(null);
    setForm({ ...emptyForm, type });
  };

  const handleTypeChange = (type) => {
    setActiveType(type);
    resetForm(type);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) { setImageFile(null); return; }
    if (file.size > maxImageSize) { e.target.value = ""; setImageFile(null); toast.error("Image must be 2 MB or smaller"); return; }
    setImageFile(file);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setImageFile(null);
    setForm({
      type: item.type || activeType,
      title: item.title || "",
      subtitle: item.type === "successStory" ? "" : item.subtitle || "",
      body: item.body || "",
      category: item.category || "",
      tag: item.tag || "",
      image: item.image || "",
      youtubeUrl: item.youtubeUrl || (item.type === "successStory" ? item.subtitle || "" : ""),
      rating: item.rating ?? 5,
      displayDate: item.displayDate || "",
      status: item.status || "published",
      sortOrder: item.sortOrder || 0,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error(`${fieldHelp.title} is required`); return; }
    if (form.type !== "faq" && !form.body.trim()) { toast.error(`${fieldHelp.body} is required`); return; }
    if (isSuccessStory && !getYoutubeUrl(form.youtubeUrl)) { toast.error("Enter a valid YouTube URL"); return; }
    const payload = buildPayload(form, imageFile);
    try {
      if (editingId) {
        await dispatch(updateSiteContent({ id: editingId, payload })).unwrap();
        toast.success("Content updated");
      } else {
        await dispatch(createSiteContent(payload)).unwrap();
        toast.success("Content created");
      }
      resetForm(form.type);
      setActiveType(form.type);
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
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Content</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Website Content</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage public FAQs, reviews, and success stories. Published records appear on the website automatically.
        </p>
      </div>

      {/* Type tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {contentTypes.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => handleTypeChange(item.value)}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
              activeType === item.value
                ? "border-orange-300 bg-orange-50 text-orange-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        {/* Form panel */}
        <form onSubmit={handleSubmit} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">
              {editingId ? "Edit Content" : "Add Content"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={() => resetForm(activeType)}
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Type</span>
              <select
                name="type"
                value={form.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className={FIELD_INPUT}
              >
                {contentTypes.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">{fieldHelp.title}</span>
              <input name="title" value={form.title} onChange={handleChange} className={FIELD_INPUT} />
            </label>

            {isSuccessStory ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{fieldHelp.subtitle}</span>
                <input
                  name="youtubeUrl"
                  value={form.youtubeUrl}
                  onChange={handleChange}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className={FIELD_INPUT}
                />
              </label>
            ) : (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{fieldHelp.subtitle}</span>
                <input name="subtitle" value={form.subtitle} onChange={handleChange} className={FIELD_INPUT} />
              </label>
            )}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">{fieldHelp.body}</span>
              <textarea
                name="body"
                value={form.body}
                onChange={handleChange}
                rows={5}
                className={FIELD_INPUT + " resize-none"}
              />
            </label>

            {isFaq && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">{fieldHelp.category}</span>
                  <input name="category" value={form.category} onChange={handleChange} className={FIELD_INPUT} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Tag</span>
                  <input name="tag" value={form.tag} onChange={handleChange} className={FIELD_INPUT} />
                </label>
              </div>
            )}

            {usesImageUpload && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Image upload</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageChange}
                  className={FIELD_INPUT + " cursor-pointer file:mr-2 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"}
                />
                <span className="mt-1 block text-xs text-slate-400">
                  JPG, PNG, WebP or GIF — max 2 MB.
                  {form.image && !imageFile ? ` Current: ${form.image}` : ""}
                  {imageFile ? ` Selected: ${imageFile.name}` : ""}
                </span>
              </label>
            )}

            {!isSuccessStory && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {!isFaq && (
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Rating</span>
                      <input
                        name="rating"
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={form.rating}
                        onChange={handleChange}
                        className={FIELD_INPUT}
                      />
                    </label>
                  )}
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Order</span>
                    <input name="sortOrder" type="number" value={form.sortOrder} onChange={handleChange} className={FIELD_INPUT} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Status</span>
                    <select name="status" value={form.status} onChange={handleChange} className={FIELD_INPUT}>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Display Date</span>
                  <input
                    name="displayDate"
                    value={form.displayDate}
                    onChange={handleChange}
                    placeholder="e.g. March 2026"
                    className={FIELD_INPUT}
                  />
                </label>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
          >
            {loading ? "Saving…" : editingId ? "Update Content" : "Create Content"}
          </button>
        </form>

        {/* List panel */}
        <section className="rounded-[28px] border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">{getTypeLabel(activeType)}</h2>
            <span className="text-sm text-slate-400">
              {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading && !visibleItems.length ? (
            <p className="py-10 text-center text-sm text-slate-500">Loading content…</p>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-500">No {getTypeLabel(activeType).toLowerCase()} created yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((item) => {
                const youtubeUrl = getYoutubeUrl(item.youtubeUrl) || getYoutubeUrl(item.subtitle);
                return (
                  <article key={item._id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 transition hover:shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{item.title}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                              item.status === "published"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                : "bg-slate-100 text-slate-600 ring-slate-200"
                            }`}
                          >
                            {item.status}
                          </span>
                          {item.source === "studentFeedback" && (
                            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-100">
                              Student feedback
                            </span>
                          )}
                        </div>

                        {item.type === "successStory" && youtubeUrl ? (
                          <a
                            href={youtubeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block text-sm font-medium text-orange-600 hover:underline"
                          >
                            YouTube video ↗
                          </a>
                        ) : item.subtitle ? (
                          <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
                        ) : null}

                        {item.body && (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.body}</p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                          {item.category && <span className="rounded-full bg-slate-100 px-2 py-0.5">{item.category}</span>}
                          {item.tag && <span className="rounded-full bg-slate-100 px-2 py-0.5">{item.tag}</span>}
                          {item.displayDate && <span>{item.displayDate}</span>}
                          {item.type !== "successStory" && <span>Order {item.sortOrder || 0}</span>}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          <FiEdit2 /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                        >
                          <FiTrash2 /> Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
