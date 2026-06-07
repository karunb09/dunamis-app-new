import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getStudentById, clearStudentState } from "../../redux/Student/StudentSlice";
import { getCourseDetails } from "../../redux/Course/CourseSlice";
import { fetchTeacherById } from "../../redux/Intructor/teacherSlice";
import CourseDetails from "./CourseDetails";

function CourseCard({
  id,
  image,
  tags,
  title,
  instructor,
  progress,
  onViewDetails,
}) {
  return (
    <div className="flex flex-col lg:flex-row group relative bg-white rounded-2xl border border-[#EDECF9] shadow-sm w-full min-h-[135px] hover:shadow-md transition overflow-hidden">
      {/* Image Section */}
      <div className="flex-none w-full h-[180px] lg:w-[185px] rounded-t-2xl rounded-b-none lg:rounded-l-2xl lg:rounded-tr-none overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none"
        />
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col justify-between p-5 lg:pl-5 lg:pr-6">
        {/* Top Section - Tags, Title, Instructor */}
        <div className="flex flex-col gap-3">
          {/* Tags */}
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {tags.map((t, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center font-normal text-[10px] sm:text-[12px] md:text-[14px] h-[20px] sm:h-[22px] px-2 ${
                  t.bg || ""
                } ${t.text || ""} rounded`}
                style={{ lineHeight: 1 }}
              >
                {t.label}
              </span>
            ))}
          </div>

          {/* Title and Instructor */}
          <div>
            <div className="text-[14px] md:text-[15px] font-semibold text-gray-900 leading-snug">
              {title}
            </div>
            <div className="text-[12px] text-gray-500 mt-1 leading-snug">
              by {instructor}
            </div>
          </div>
        </div>

        {/* Bottom Section - Progress Bar and Button */}
        <div className="flex flex-col gap-3 mt-4">
          {/* Progress Bar */}
          <div className="flex items-center">
            <div className="relative flex-1 mr-2">
              <div className="h-[2px] bg-[#E1E2E9] rounded-full w-full"></div>
              <div
                className="absolute top-0 left-0 h-[2px] bg-[#23243C] rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-black/40 select-none w-8 text-right">
              {progress}%
            </span>
          </div>

          {/* View Details Button */}
          <div className="flex justify-end">
            <button
              onClick={() => onViewDetails(id)}
              className="text-gray-900 border border-[#e2e8f0] hover:border-[#23243C] text-sm sm:text-base px-5 py-1.5 rounded-full font-semibold flex items-center gap-2 transition-all shadow-sm w-full sm:w-auto justify-center"
            >
              View Details <span className="text-xl">&#8594;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function CoursePage() {
  const [selected, setSelected] = useState(null);
  const [courseDetailsMap, setCourseDetailsMap] = useState({});
  const [teacherDetailsMap, setTeacherDetailsMap] = useState({});
  const [preloadingCourses, setPreloadingCourses] = useState(false);
  const [preloadError, setPreloadError] = useState(null);
  const fetchedCourseIds = useRef(new Set());
  const fetchedTeacherIds = useRef(new Set());

  const dispatch = useDispatch();
  const { currentStudent, loading, error } = useSelector(
    (state) => state.student
  );

  useEffect(() => {
    try {
      const userDataString = localStorage.getItem('user');
      
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        const studentId = userData.roleId;
        
        if (studentId) {
          dispatch(getStudentById(studentId));
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }

    return () => {
      dispatch(clearStudentState());
      setCourseDetailsMap({});
      setTeacherDetailsMap({});
      fetchedCourseIds.current.clear();
      fetchedTeacherIds.current.clear();
    };
  }, [dispatch]);

  useEffect(() => {
    const preloadAllCourseDetails = async () => {
      if (!currentStudent?.enrolledCourses || currentStudent.enrolledCourses.length === 0) {
        setPreloadingCourses(false);
        return;
      }

      setPreloadingCourses(true);
      setPreloadError(null);

      const courseIds = currentStudent.enrolledCourses
        .filter(e => e?.courseId?._id)
        .map(enrollment => enrollment.courseId._id);
      
      if (courseIds.length === 0) {
        setPreloadingCourses(false);
        return;
      }

      try {
        const detailsMap = {};
        const teacherMap = {};
        const teacherIdsToFetch = new Set();

        for (const courseId of courseIds) {
          if (fetchedCourseIds.current.has(courseId)) {
            continue;
          }

          try {
            const result = await dispatch(getCourseDetails(courseId)).unwrap();
            
            const courseData = result?.data || result;
            if (courseData) {
              detailsMap[courseId] = courseData;
              fetchedCourseIds.current.add(courseId);

              if (courseData.teacher && Array.isArray(courseData.teacher)) {
                courseData.teacher.forEach((t) => {
                  const teacherId = typeof t === 'string' ? t : t._id;
                  if (teacherId && !fetchedTeacherIds.current.has(teacherId)) {
                    teacherIdsToFetch.add(teacherId);
                  }
                });
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (err) {
            console.error('Error fetching course:', err);
          }
        }

        for (const teacherId of teacherIdsToFetch) {
          try {
            const teacherResult = await dispatch(fetchTeacherById(teacherId)).unwrap();
            const teacherData = teacherResult?.data || teacherResult;
            if (teacherData) {
              teacherMap[teacherId] = teacherData;
              fetchedTeacherIds.current.add(teacherId);
            }
            await new Promise(resolve => setTimeout(resolve, 150));
          } catch (err) {
            console.error('Error fetching teacher:', err);
          }
        }

        if (Object.keys(detailsMap).length > 0) {
          setCourseDetailsMap(prev => ({ ...prev, ...detailsMap }));
        }

        if (Object.keys(teacherMap).length > 0) {
          setTeacherDetailsMap(prev => ({ ...prev, ...teacherMap }));
        }
      } catch (err) {
        console.error('Preload error:', err);
        setPreloadError('Failed to load course details');
      } finally {
        setPreloadingCourses(false);
      }
    };

    if (!loading && currentStudent) {
      preloadAllCourseDetails();
    }
  }, [currentStudent, loading, dispatch]);

  const getCategoryColor = (mode) => {
    if (mode === 'online') return { bg: 'bg-[#DDF4FA]', text: 'text-black' };
    if (mode === 'offline') return { bg: 'bg-[#FFE5E5]', text: 'text-black' };
    return { bg: 'bg-[#F0F0F0]', text: 'text-black' };
  };

  const getLevelColor = (level) => {
    if (level === 'beginner') return { bg: 'bg-[#C9E9FA] rounded-full', text: 'text-black' };
    if (level === 'intermediate') return { bg: 'bg-[#FFD36E80] rounded-full', text: 'text-black' };
    if (level === 'advanced') return { bg: 'bg-[#FF6F614D] rounded-full', text: 'text-black' };
    return { bg: 'bg-[#F0F0F0] rounded-full', text: 'text-black' };
  };

  const getTeacherNameFromDetails = (teacherId) => {
    const teacherDetail = teacherDetailsMap[teacherId];
    
    if (teacherDetail?.name?.firstName) {
      const firstName = teacherDetail.name.firstName || '';
      const lastName = teacherDetail.name.lastName || '';
      return `${firstName} ${lastName}`.trim();
    }

    if (teacherDetail?.user?.name?.firstName) {
      const firstName = teacherDetail.user.name.firstName || '';
      const lastName = teacherDetail.user.name.lastName || '';
      return `${firstName} ${lastName}`.trim();
    }
    
    return null;
  };

const formatCourseData = (enrolledCourses) => {
  if (!enrolledCourses || enrolledCourses.length === 0) return [];

  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE || '';

  return enrolledCourses
    .filter(enrollment => enrollment?.courseId)
    .map((enrollment) => {
      const course = enrollment.courseId;
      
      if (!course || !course._id) return null;

      const categoryColor = getCategoryColor(course.mode);
      const levelColor = getLevelColor(course.level);
      const categoryIcon = course.category?.icon || '📚';

      let teacherNames = 'Instructor';
      
      const uniqueTeacherNames = new Set();
      
      if (course.teacher && Array.isArray(course.teacher) && course.teacher.length > 0) {
        course.teacher.forEach((t) => {
          const teacherId = typeof t === 'string' ? t : t._id;
          
          const nameFromApi = getTeacherNameFromDetails(teacherId);
          if (nameFromApi) {
            uniqueTeacherNames.add(nameFromApi);
            return;
          }

          if (typeof t === 'object') {
            if (t?.teacherDetail?.name?.firstName) {
              const firstName = t.teacherDetail.name.firstName || '';
              const lastName = t.teacherDetail.name.lastName || '';
              const fullName = `${firstName} ${lastName}`.trim();
              if (fullName) uniqueTeacherNames.add(fullName);
              return;
            }

            if (t?.userId?.name?.firstName) {
              const firstName = t.userId.name.firstName || '';
              const lastName = t.userId.name.lastName || '';
              const fullName = `${firstName} ${lastName}`.trim();
              if (fullName) uniqueTeacherNames.add(fullName);
              return;
            }
          }
        });
        
        if (uniqueTeacherNames.size > 0) {
          teacherNames = Array.from(uniqueTeacherNames).join(', ');
        }
      }

      const courseImage = course.image 
        ? (course.image.startsWith('http') 
            ? course.image 
            : `${IMAGE_BASE_URL}${course.image}`)
        : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=640&h=360';

      return {
        id: course._id,
        image: courseImage,
        tags: [
          {
            label: course.category?.name || 'General',
            icon: categoryIcon,
            bg: categoryColor.bg,
            text: categoryColor.text,
            isCategory: true,
          },
          {
            label: course.level?.charAt(0).toUpperCase() + course.level?.slice(1) || 'Beginner',
            bg: levelColor.bg,
            text: levelColor.text,
            isCategory: false,
          },
        ],
        title: course.name,
        instructor: teacherNames,
        progress: enrollment.progress || 0,
        description: course.description || 'No description available',
        mode: course.mode,
        courseType: course.courseType,
        level: course.level,
        status: enrollment.status,
        startDate: course.startDate,
        endDate: course.endDate,
        objectives: course.objectives || [],
        price: course.price || [],
        teacher: course.teacher || [],
      };
    })
    .filter(course => course !== null);
};


  const handleViewDetails = (courseId) => {
    setSelected(courseId);
  };

  const handleBack = () => {
    setSelected(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafafb]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-gray-700">Loading courses...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafafb]">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Error Loading Courses</h3>
            <p className="text-gray-600 text-center">
              {typeof error === "string" ? error : error?.message || "Failed to load courses"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const courses = currentStudent?.enrolledCourses ? formatCourseData(currentStudent.enrolledCourses) : [];

  if (selected) {
    const detailedCourse = courseDetailsMap[selected];
    
    if (!detailedCourse) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#fafafb]">
          <div className="flex flex-col items-center gap-4">
            <div className="text-xl font-bold text-gray-900">Loading course details...</div>
            <div className="w-8 h-8 border-3 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 mt-4"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    const courseTeachers = detailedCourse.teacher?.map((t) => {
      const teacherId = typeof t === 'string' ? t : t._id;
      const teacherDetail = teacherDetailsMap[teacherId] || t;
      return teacherDetail;
    }) || [];
    
    return (
      <CourseDetails 
        course={detailedCourse}
        onBack={handleBack}
        studentData={currentStudent}
        courseTeachers={courseTeachers}
      />
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafafb]">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Enrolled Courses</h3>
          <p className="text-gray-600">You haven't enrolled in any courses yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafb] px-4 py-6 font-sans">
      {preloadingCourses && (
        <div className="fixed inset-0 bg-black/5 flex items-center justify-center z-40 pointer-events-none">
          <div className="flex flex-col items-center gap-2 bg-white/80 px-6 py-4 rounded-lg backdrop-blur-sm">
            <div className="w-8 h-8 border-3 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            <span className="text-sm text-gray-700">Preparing courses...</span>
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <p className="text-gray-600 mt-1">You are enrolled in {courses.length} {courses.length === 1 ? 'course' : 'courses'}</p>
        {preloadError && (
          <p className="text-sm text-red-600 mt-2">{preloadError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            {...course}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>
    </div>
  );
}
