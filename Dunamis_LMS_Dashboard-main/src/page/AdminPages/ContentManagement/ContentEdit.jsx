import { useState, useEffect } from "react";

const ContentCreate = ({ isEdit, initialCourse }) => {
  const [course, setCourse] = useState(initialCourse || {
    title: "",
    description: "",
    curriculum: []
  });

  useEffect(() => {
    if (isEdit && initialCourse) {
      setCourse(initialCourse);
    }
  }, [isEdit, initialCourse]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCourse({
      ...course,
      [name]: value,
    });
  };

  const handleModuleChange = (mIdx, e) => {
    const { name, value } = e.target;
    const updatedCurriculum = [...course.curriculum];
    updatedCurriculum[mIdx] = { ...updatedCurriculum[mIdx], [name]: value };
    setCourse({ ...course, curriculum: updatedCurriculum });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted", course);
    // Here, you would typically make an API call to save the course
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">{isEdit ? "Edit Course" : "Create Course"}</h2>
      <form onSubmit={handleSubmit}>
        {/* Course Title */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            value={course.title}
            onChange={handleChange}
            className="mt-2 p-2 w-full border border-gray-300 rounded-md"
            disabled={isEdit}  // Make title non-editable when in edit mode
          />
        </div>

        {/* Course Description */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium">Description</label>
          <textarea
            id="description"
            name="description"
            value={course.description}
            onChange={handleChange}
            className="mt-2 p-2 w-full border border-gray-300 rounded-md"
          />
        </div>

        {/* Curriculum (Modules, Lessons, Topics) */}
        <div>
          {course.curriculum.map((module, mIdx) => (
            <div key={mIdx} className="mb-6">
              <div className="font-semibold">{module.moduleName}</div>
              <div className="pl-4">
                {module.lessons.map((lesson, lIdx) => (
                  <div key={lIdx} className="mb-4">
                    <div className="font-medium">{lesson.lessonName}</div>
                    <div className="pl-4">
                      {lesson.topics.map((topic, tIdx) => (
                        <div key={tIdx} className="mb-2">
                          <div className="font-normal">{topic.topicName}</div>
                          <p className="text-sm text-gray-600">{topic.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button type="submit" className="px-4 py-2 bg-black text-white rounded-xl">
          {isEdit ? "Save Changes" : "Create Course"}
        </button>
      </form>
    </div>
  );
};

export default ContentCreate;
