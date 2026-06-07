import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    FaChevronDown,
    FaChevronUp,
    FaFolder,
    FaFileAlt,
    FaRegEdit,
    FaTimes,
    FaPlus,
} from "react-icons/fa";
import { fetchContentById } from "../../../redux/Content/ContentSlice";

const CourseContentForm = ({ content, setContent }) => {
    const [objective, setObjective] = useState("");
    const [objectives, setObjectives] = useState([]);
    const [isCurriculumOpen, setIsCurriculumOpen] = useState(true);
    const dispatch = useDispatch();

    const selectedCourseId = Array.isArray(content?.content) && content.content.length > 0
        ? content.content[0]?._id || content.content[0]
        : null;

    useEffect(() => {
        if (selectedCourseId) {
            dispatch(fetchContentById(selectedCourseId));
        }
    }, [dispatch, selectedCourseId]);

    const {
        content: fetchedContent,
        loading,
        error,
    } = useSelector((state) => state.content);

    useEffect(() => {
        setObjectives(Array.isArray(content?.objectives) ? content.objectives : []);
    }, [content?.objectives]);

    useEffect(() => {
        if (selectedCourseId && fetchedContent?._id === selectedCourseId) {
            setContent((prev) => ({
                ...prev,
                content: [fetchedContent._id],
            }));
        }
    }, [fetchedContent, selectedCourseId, setContent]);

    // Add new objective
    const handleAddObjective = () => {
        if (objective.trim() !== "") {
            const newObjectives = [...objectives, objective.trim()];
            setObjectives(newObjectives);
            setObjective("");
            setContent((prev) => ({
                ...prev,
                objectives: newObjectives, // ✅ send to parent state
            }));
        }
    };

    // Remove specific objective
    const handleDeleteObjective = (index) => {
        const newObjectives = objectives.filter((_, i) => i !== index);
        setObjectives(newObjectives);
        setContent((prev) => ({
            ...prev,
            objectives: newObjectives, // ✅ update parent
        }));
    };

    // Allow "Enter" key to add objective
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAddObjective();
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
            {/* Learning Objectives */}
            <div>
                <label
                    htmlFor="objective-textarea"
                    className="block text-sm font-medium mb-1 text-gray-700"
                >
                    Learning Objectives
                </label>
                <div className="relative">
                    <textarea
                        id="objective-textarea"
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        onKeyDown={handleKeyDown}
                        maxLength={200}
                        rows={3}
                        className="w-full border px-3 py-2 rounded-2xl bg-gray-100 resize-none"
                    />
                    <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                        {objective.length}/200
                    </span>
                </div>
                <button
                    onClick={handleAddObjective}
                    className="mt-2 text-sm bg-gray-200 px-4 py-2 rounded-2xl flex items-center gap-2 hover:bg-gray-300 transition"
                >
                    <FaPlus size={16} />
                    Add
                </button>

                {/* List of objectives */}
                <div className="space-y-2 mt-3">
                    {objectives.map((obj, index) => (
                        <div
                            key={index}
                            className="bg-white border border-gray-200 text-sm px-4 py-2 rounded-2xl text-gray-700 flex items-center justify-between"
                        >
                            <span>{obj}</span>
                            <button
                                onClick={() => handleDeleteObjective(index)}
                                className="text-red-500 hover:text-red-700"
                                aria-label={`Remove objective ${index + 1}`}
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Curriculum Display */}
            <div className="space-y-3">
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setIsCurriculumOpen(!isCurriculumOpen)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                        e.key === "Enter" && setIsCurriculumOpen(!isCurriculumOpen)
                    }
                    aria-expanded={isCurriculumOpen}
                    aria-controls="curriculum-section"
                >
                    <label className="text-sm font-medium text-gray-700">
                        Curriculum
                    </label>
                    {isCurriculumOpen ? (
                        <FaChevronUp size={16} />
                    ) : (
                        <FaChevronDown size={16} />
                    )}
                </div>

                {isCurriculumOpen && selectedCourseId && fetchedContent?._id === selectedCourseId && fetchedContent?.modules?.length > 0 ? (
                    <div
                        id="curriculum-section"
                        className="space-y-6 border border-gray-200 rounded-2xl bg-white p-4"
                    >
                        {fetchedContent.modules.map((module, moduleIndex) => (
                            <div key={module._id}>
                                {/* Module */}
                                <div className="flex items-center gap-2 text-yellow-600 font-medium text-sm mb-2">
                                    <FaFolder />
                                    <span>{`Module ${moduleIndex + 1}: ${module.title}`}</span>
                                </div>

                                {/* Lessons inside module */}
                                {module.lessons?.length > 0 ? (
                                    module.lessons.map((lesson, lessonIndex) => (
                                        <div key={lesson._id} className="ml-6 mt-3 space-y-1">
                                            <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                                                <FaFileAlt />
                                                <span>{`Lesson ${lessonIndex + 1}: ${lesson.title}`}</span>
                                            </div>

                                            {/* Topics inside lesson */}
                                            <div className="ml-6 mt-1 text-sm text-gray-600 space-y-3">
                                                {lesson.topics?.length > 0 ? (
                                                    lesson.topics.map((topic, topicIndex) => (
                                                        <div key={topic._id}>
                                                            <div className="flex items-center gap-2 font-medium text-gray-700">
                                                                <FaRegEdit />
                                                                <span>{`Topic ${topicIndex + 1}: ${topic.title}`}</span>
                                                            </div>
                                                            <p className="text-gray-500 ml-5 text-sm">
                                                                {topic.description || "No description available"}
                                                            </p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="ml-5 text-gray-500">
                                                        No topics available
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="ml-6 text-gray-500">No lessons available</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">
                        {selectedCourseId ? "No modules available" : "Select course content first"}
                    </p>
                )}
            </div>
        </div>
    );
};

export default CourseContentForm;
