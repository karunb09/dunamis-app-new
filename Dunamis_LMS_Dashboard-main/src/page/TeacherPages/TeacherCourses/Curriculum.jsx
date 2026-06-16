import React, { useState } from "react";
import { HiPlay, HiChevronDown, HiChevronRight } from "react-icons/hi2";

import { VscFileSubmodule } from "react-icons/vsc";
import { GoFileDirectory } from "react-icons/go";
import { MdOutlineTopic } from "react-icons/md";

const Curriculum = ({ modules = [] }) => {
  const [expandedModules, setExpandedModules] = useState([]);
  const [expandedLessons, setExpandedLessons] = useState([]);

  const toggleModule = (index) => {
    setExpandedModules((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleLesson = (moduleIndex, lessonIndex) => {
    const key = `${moduleIndex}-${lessonIndex}`;
    setExpandedLessons((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Curriculum</h3>
        <button className="bg-gray-100 text-gray-600 px-4 py-1 rounded-full text-sm flex items-center hover:bg-gray-200 transition">
          <HiPlay className="w-4 h-4 mr-2 text-gray-400" />
          Watch Videos
        </button>
      </div>

      {/* No Curriculum Message */}
      {!modules || modules.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No curriculum available for this course</p>
        </div>
      ) : (
        <>
          {/* Modules */}
          {modules.map((module, mIndex) => (
            <div key={module._id || mIndex} className="mb-4 last:mb-0 p-2 rounded-lg border border-gray-200">
              <button
                onClick={() => toggleModule(mIndex)}
                className="w-full flex items-center py-2 text-left text-gray-900 font-medium hover:bg-gray-50 rounded transition"
              >
                <span className="mr-2 text-gray-600">
                  {expandedModules.includes(mIndex) ? (
                    <HiChevronDown className="w-6 h-6" />
                  ) : (
                    <HiChevronRight className="w-6 h-6" />
                  )}
                </span>
                <span className="bg-yellow-100 text-gray-900 px-2 py-1 rounded mr-2">
                  <VscFileSubmodule />
                </span>
                <span className="flex-1">{module.title || `Module ${mIndex + 1}`}</span>
                {module.duration && (
                  <span className="text-xs text-gray-500 ml-2">{module.duration}</span>
                )}
              </button>

              {expandedModules.includes(mIndex) && (
                <div className="pl-6 mt-2">
                  {module.lessons && module.lessons.length > 0 ? (
                    module.lessons.map((lesson, lIndex) => (
                      <div key={lesson._id || lIndex} className="mb-2 last:mb-0">
                        <button
                          onClick={() => toggleLesson(mIndex, lIndex)}
                          className="w-full flex items-center py-2 text-left text-cyan-600 font-medium hover:bg-cyan-50 rounded transition"
                        >
                          <span className="mr-2 text-gray-600">
                            {expandedLessons.includes(`${mIndex}-${lIndex}`) ? (
                              <HiChevronDown className="w-5 h-5" />
                            ) : (
                              <HiChevronRight className="w-5 h-5" />
                            )}
                          </span>
                          <span className="bg-cyan-100 text-gray-900 px-2 py-1 rounded mr-2 text-sm">
                            <GoFileDirectory />
                          </span>
                          {lesson.title || `Lesson ${lIndex + 1}`}
                        </button>

                        {expandedLessons.includes(`${mIndex}-${lIndex}`) && (
                          <div className="pl-6 mt-2">
                            {lesson.topics && lesson.topics.length > 0 ? (
                              lesson.topics.map((topic, tIndex) => (
                                <div key={topic._id || tIndex} className="mb-3 last:mb-0 p-2 bg-gray-50 rounded">
                                  <div className="flex items-start text-gray-700">
                                    <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded mr-2 text-xs mt-0.5">
                                      <MdOutlineTopic />
                                    </span>
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">
                                        {topic.title || `Topic ${tIndex + 1}`}
                                      </p>
                                      {topic.description && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {topic.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 pl-8 italic">No topics available</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 pl-6 italic">No lessons available</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default Curriculum;
