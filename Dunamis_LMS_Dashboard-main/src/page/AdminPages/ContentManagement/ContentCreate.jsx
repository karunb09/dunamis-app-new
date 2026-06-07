import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaPlus, FaTrash, FaEdit } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchCategories } from "../../../redux/Category/CategorySlice";
import { createContent, fetchContentById, updateContent } from "../../../redux/Content/ContentSlice";
import toast from "react-hot-toast";

const ContentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [curriculum, setCurriculum] = useState([]);  

  const { categories, subCategories, status } = useSelector((state) => state.category);
  const { content, status: contentStatus, error: contentError } = useSelector((state) => state.content);

  const selectedCategoryId =
    typeof category === "object" ? category?._id || "" : category;

  const selectedCategory =
    categories.find((cat) => cat._id === selectedCategoryId) ||
    (typeof category === "object" ? category : null);

  const visibleCategories = categories.filter(
    (cat) => cat.status === "published" || cat._id === selectedCategoryId
  );

  const visibleSubCategories =
    selectedCategory?.subcategories?.length > 0
      ? selectedCategory.subcategories
      : subCategories.filter((subCat) => subCat.categoryId === selectedCategoryId);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchCategories());
    }
  }, [status, dispatch]);

  useEffect(() => {
    if (id) {
      dispatch(fetchContentById(id));  
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (content && id) {
      setCourseName(content.courseName || "");
      setCourseCode(content.courseCode || "");
      setDescription(content.courseDescription || "");
      setCategory(content.category?._id || content.category || "");
      setSubCategory(content.subCategory?._id || content.subCategory || "");

      setCurriculum(
        Array.isArray(content.modules)
          ? content.modules.map((module) => ({
              moduleName: module.title || "",
              duration: module.duration || "",
              lessons: Array.isArray(module.lessons)
                ? module.lessons.map((lesson) => ({
                    lessonName: lesson.title || "",
                    topics:
                      Array.isArray(lesson.topics) && lesson.topics.length > 0
                        ? lesson.topics.map((topic) => ({
                            topicName: topic.title || "",
                            desc: topic.description || "",
                          }))
                        : [{ topicName: "", desc: "" }],
                  }))
                : [],
            }))
          : []
      );
    }
  }, [content, id]);  

  const handleCurriculumChange = (moduleIdx, lessonIdx, topicIdx, field, value) => {
    const updatedCurriculum = curriculum.map((module, mIndex) => {
      if (mIndex === moduleIdx) {
        if (lessonIdx === null) {
          return { ...module, [field]: value };
        }
        if (lessonIdx !== undefined) {
          const updatedLessons = module.lessons.map((lesson, lIndex) => {
            if (lIndex === lessonIdx) {
              if (topicIdx === null) {
                return { ...lesson, [field]: value };
              }
              if (topicIdx !== undefined) {
                const updatedTopics = lesson.topics.map((topic, tIndex) => {
                  if (tIndex === topicIdx) {
                    return { ...topic, [field]: value };
                  }
                  return topic;
                });
                return { ...lesson, topics: updatedTopics };
              }
              return lesson;
            }
            return lesson;
          });
          return { ...module, lessons: updatedLessons };
        }
        return module;
      }
      return module;
    });
    setCurriculum(updatedCurriculum);
  };

  const addModule = () => {
    setCurriculum([
      ...curriculum,
      {
        moduleName: "",
        duration: "",
        lessons: [],
      },
    ]);
  };

  const addLesson = (moduleIdx) => {
    const newCurriculum = [...curriculum];
    newCurriculum[moduleIdx].lessons.push({
      lessonName: "",
      topics: [
        {
          topicName: "",
          desc: "",
        },
      ],
    });
    setCurriculum(newCurriculum);
  };

  const addTopic = (moduleIdx, lessonIdx) => {
    const newCurriculum = [...curriculum];
    newCurriculum[moduleIdx].lessons[lessonIdx].topics.push({
      topicName: "",
      desc: "",
    });
    setCurriculum(newCurriculum);
  };

  const deleteModule = (moduleIdx) => {
    const updatedCurriculum = curriculum.filter((_, i) => i !== moduleIdx);
    setCurriculum(updatedCurriculum);
  };

  const deleteLesson = (moduleIdx, lessonIdx) => {
    setCurriculum((prevCurriculum) =>
      prevCurriculum.map((module, i) => {
        if (i !== moduleIdx) return module;
        return {
          ...module,
          lessons: module.lessons.filter((_, idx) => idx !== lessonIdx),
        };
      })
    );
  };

  const deleteTopic = (moduleIdx, lessonIdx, topicIdx) => {
    setCurriculum((prevCurriculum) =>
      prevCurriculum.map((module, mIdx) => {
        if (mIdx !== moduleIdx) return module;
        return {
          ...module,
          lessons: module.lessons.map((lesson, lIdx) => {
            if (lIdx !== lessonIdx) return lesson;
            return {
              ...lesson,
              topics: lesson.topics.filter((_, tIdx) => tIdx !== topicIdx),
            };
          }),
        };
      })
    );
  };

  const validateForm = () => {
    if (!courseName.trim() || !courseCode.trim() || !category || !subCategory) {
      toast.error("Course name, code, category, and sub-category are required.");
      return false;
    }

    for (const [moduleIndex, module] of curriculum.entries()) {
      if (!module.moduleName.trim()) {
        toast.error(`Module ${moduleIndex + 1} name is required.`);
        return false;
      }

      for (const [lessonIndex, lesson] of module.lessons.entries()) {
        if (!lesson.lessonName.trim()) {
          toast.error(`Lesson ${lessonIndex + 1} name is required in module ${moduleIndex + 1}.`);
          return false;
        }

        for (const [topicIndex, topic] of lesson.topics.entries()) {
          if (!topic.topicName.trim()) {
            toast.error(`Topic ${topicIndex + 1} name is required in lesson ${lessonIndex + 1}.`);
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleSave = async (targetStatus) => {
    if (!validateForm()) return;

    const contentData = {
      courseName: courseName.trim(),
      courseCode: courseCode.trim(),
      courseDescription: description.trim(),
      category,
      subCategory,
      ...(targetStatus ? { status: targetStatus } : {}),
      modules: curriculum.map((module) => ({
        duration: module.duration.trim(),
        title: module.moduleName.trim(),
        lessons: module.lessons.map((lesson) => ({
          title: lesson.lessonName.trim(),
          topics: lesson.topics.map((topic) => ({
            title: topic.topicName.trim(),
            description: topic.desc.trim(),
          })),
        })),
      })),
    };

    try {
      if (id) {
        await dispatch(updateContent({ id, contentData })).unwrap();
        toast.success("Content updated successfully!");
      } else {
        await dispatch(createContent(contentData)).unwrap();
        toast.success(
          targetStatus === "draft"
            ? "Content saved to drafts!"
            : "Content created successfully!"
        );
      }
      navigate("/admin/content-management");
    } catch (error) {
      toast.error(error?.message || "Error occurred while saving content.");
    }
  };

  return (
    <div className="bg-[#F9F9F9] p-6">
      <div className="bg-gray-200/50 p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-6">
          {id ? "Edit Content" : "Create New Content"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-2xl bg-gray-50"
            placeholder="Course Name *"
            required
          />
          <input
            type="text"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-2xl bg-gray-50"
            placeholder="Course Code *"
            required
          />
        </div>
        <div className="mb-4 relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-2xl bg-gray-50 h-24"
            placeholder="Course Description"
            maxLength="200"
          />
          <span className="absolute bottom-2 right-2 text-xs text-gray-400">
            {description.length}/200
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-2xl bg-gray-50"
            required
          >
            <option value="">Select a category *</option>
            {visibleCategories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-2xl bg-gray-50"
            required
          >
            <option value="">Select a sub-category *</option>
            {visibleSubCategories.map((subCat) => (
              <option key={subCat._id} value={subCat._id}>
                {subCat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-gray-200/50 p-6 rounded-lg shadow-sm mt-5">
        <h3 className="text-lg font-semibold">Curriculum</h3>

        {curriculum.length > 0 &&
          curriculum.map((module, mIdx) => (
            <div key={mIdx} className="bg-gray-100 rounded-lg p-3 mb-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <div className="flex items-center gap-2 w-full md:w-1/3">
                  <input
                    type="text"
                    value={module.duration}
                    onChange={(e) =>
                      handleCurriculumChange(mIdx, null, null, "duration", e.target.value)
                    }
                    className="p-2 border border-gray-300 rounded-2xl w-full"
                    placeholder="Duration (e.g., 2w)"
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:flex-1">
                  <input
                    type="text"
                    value={module.moduleName}
                    onChange={(e) =>
                      handleCurriculumChange(mIdx, null, null, "moduleName", e.target.value)
                    }
                    className="flex-1 p-2 border border-gray-300 rounded-2xl"
                    placeholder="Module Name *"
                    required
                  />
                  <button onClick={() => deleteModule(mIdx)} className="text-gray-500">
                    <FaTrash />
                  </button>
                </div>
              </div>

              {module.lessons.length > 0 &&
                module.lessons.map((lesson, lIdx) => (
                  <div key={lIdx} className="ml-6 bg-gray-200/50 rounded-lg p-3 my-2">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={lesson.lessonName}
                        onChange={(e) =>
                          handleCurriculumChange(mIdx, lIdx, null, "lessonName", e.target.value)
                        }
                        className="flex-1 p-2 border border-gray-300 rounded-2xl"
                        placeholder="Lesson Name *"
                        required
                      />
                      <button onClick={() => deleteLesson(mIdx, lIdx)}>
                        <FaTrash />
                      </button>
                    </div>

                    {/* Render topics only if topics exist */}
                    {lesson.topics.length > 0 &&
                      lesson.topics.map((topic, tIdx) => (
                        <div key={tIdx} className="bg-transparent rounded-lg">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={topic.topicName}
                                onChange={(e) =>
                                  handleCurriculumChange(mIdx, lIdx, tIdx, "topicName", e.target.value)
                                }
                                className="block w-full p-2 border border-gray-300 rounded-2xl mb-2"
                                placeholder="Topic Name *"
                                required
                              />
                              <textarea
                                value={topic.desc}
                                onChange={(e) =>
                                  handleCurriculumChange(mIdx, lIdx, tIdx, "desc", e.target.value)
                                }
                                className="block w-full p-2 border border-gray-300 rounded-2xl h-16"
                                placeholder="Description"
                              />
                            </div>
                            <button onClick={() => deleteTopic(mIdx, lIdx, tIdx)}>
                              <FaTrash />
                            </button>
                          </div>
                          <button
                            onClick={() => addTopic(mIdx, lIdx)}
                            className="ml-6 mt-2 text-sm text-blue-600 font-semibold flex items-center gap-1"
                          >
                            <FaPlus /> Add Topic
                          </button>
                        </div>
                      ))}
                  </div>
                ))}

              <button
                onClick={() => addLesson(mIdx)}
                className="ml-6 mt-2 text-sm text-blue-600 font-semibold flex items-center gap-1"
              >
                <FaPlus /> Add Lesson
              </button>
            </div>
          ))}

        <button
          onClick={addModule}
          className="mt-4 text-sm text-blue-600 font-semibold flex items-center gap-1"
        >
          <FaPlus /> Add Module
        </button>
      </div>

      <div className="flex justify-between gap-3 mt-8">
        <button
          onClick={() => navigate("/admin/content-management")}
          className="px-4 py-2 border bg-gray-50 rounded-2xl hover:bg-gray-100"
        >
          Cancel
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave("draft")}
            className="px-4 py-2 border rounded-2xl bg-white hover:bg-gray-100"
          >
            Draft
          </button>
          <button
            onClick={() => handleSave(id ? undefined : "published")}
            className="px-4 py-2 border rounded-2xl bg-black text-white"
          >
            {id ? "Update Content" : "Save Content"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentForm;
