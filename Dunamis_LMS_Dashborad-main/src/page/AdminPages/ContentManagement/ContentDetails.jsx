import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FaEdit,
  FaRegClock,
  FaCopy,
  FaChevronDown,
  FaTrash,
} from "react-icons/fa";
import { BookOpen } from "react-feather";
import {
  deleteContent,
  fetchContentById,
  updateContent,
} from "../../../redux/Content/ContentSlice";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

const ContentDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { content, loading, error } = useSelector((state) => state.content);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchContentById(id));
    }
  }, [dispatch, id]);

  const getCategoryStyle = (category) => {
    return {
      class: "bg-gray-100 text-gray-800",
      icon: category?.icon || "✦",  // use icon from DB or fallback
    };
  };


  const handleStatusToggle = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const updatedStatus = content.status === "published" ? "draft" : "published";
      await dispatch(updateContent({ id: content._id, contentData: { status: updatedStatus } }));
      dispatch(fetchContentById(id)); // Refresh content after update
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = () => {
    Swal.fire({
      title: "Delete content?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete",
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        await dispatch(deleteContent(content._id)).unwrap();
        toast.success("Content deleted successfully");
        navigate("/admin/content-management");
      } catch (deleteError) {
        toast.error(`Failed to delete content: ${deleteError}`);
      }
    });
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading content...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  if (!content) {
    return <div className="p-6 text-gray-600">Content not found.</div>;
  }
  const categoryObj = content.category || { name: "Uncategorized", icon: "✦" };
  const style = getCategoryStyle(content.category);

  return (
    <div className="min-h-screen rounded-[2rem] bg-[#f6f3ee] p-4 sm:p-6">
      {/* Top Action Buttons */}
      <div className="mb-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#181512] via-[#3d3026] to-[#8b5e34] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-200">
              Learning Content
            </p>
            <h1 className="mt-3 text-3xl font-semibold">{content.courseName}</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              Review modules, lessons, publishing state, and curriculum structure.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200/50 bg-white/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500 hover:text-white"
            >
              <FaTrash /> Delete Content
            </button>

            {/* Toggle Status Button */}
            <button
              type="button"
              onClick={handleStatusToggle}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-gray-950 disabled:opacity-60"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span>Processing...</span>
              ) : content.status === "published" ? (
                <>
                  <FaRegClock /> Move to Draft
                </>
              ) : (
                <>
                  <FaRegClock /> Publish Content
                </>
              )}
            </button>

            {/* Edit Button */}
            <Link
              to={`/admin/content/edit/${content._id}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-gray-950 transition hover:bg-orange-50"
            >
              <FaEdit /> Edit Content
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm ring-1 ring-orange-100">
        {/* Category and Subcategory */}
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${style.class}`}
          >
            {style.icon} {categoryObj.name}
          </span>
          <span className="text-sm text-gray-600">| {content.subCategory?.name}</span>
        </div>

        {/* Title & Module Count */}
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-semibold">{content.courseName}</h1>
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-sm flex items-center gap-1">
              {content.modules?.length || 0} module{content.modules?.length !== 1 ? "s" : ""}
            </span>
            <BookOpen className="text-gray-500" />
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${content.status === "published"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
              }`}
          >
            {content.status === "published" ? "Published" : "Draft"}
          </span>
        </div>

        {/* Course Code */}
        <div className="flex justify-between items-center mb-6">
          <div />
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">{content.courseCode}</span>
            <FaCopy className="text-gray-500 cursor-pointer" />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-6">{content.courseDescription}</p>

        {/* Curriculum */}
        <div className="space-y-2">
          {content.modules?.map((module, mIdx) => (
            <details key={mIdx} className="bg-gray-50 rounded-lg border">
              <summary className="p-3 flex items-center cursor-pointer list-none">
                <FaChevronDown className="text-gray-500 mr-2" />
                <span className="text-gray-500 text-sm mr-4">
                  <FaRegClock className="inline-block mr-1" />
                  {module.duration}
                </span>
                <span className="font-semibold flex-1">{module.title}</span>
              </summary>

              <div className="p-4 border-t border-gray-200 space-y-2">
                {module.lessons?.map((lesson, lIdx) => (
                  <details key={lIdx}>
                    <summary className="p-3 flex items-center cursor-pointer list-none">
                      <FaChevronDown className="text-gray-500 mr-2" />
                      <span className="font-medium flex-1">{lesson.title}</span>
                    </summary>

                    <div className="p-3 border-t border-gray-200 space-y-2">
                      {lesson.topics?.map((topic, tIdx) => (
                        <div key={tIdx} className="bg-gray-50 rounded-md p-3">
                          <span className="text-sm font-semibold block">{topic.title}</span>
                          <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContentDetails;
