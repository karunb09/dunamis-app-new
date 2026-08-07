"use client";
import { motion } from "framer-motion";
import CourseCard from "../CourseCards";
import { fetchCourses } from "@/store/courseSlice";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { LuRotateCw } from "react-icons/lu";
import {
  getCoursePlaceholderImage,
  resolveImageUrl,
} from "@/lib/resolveImageUrl";
import { buildBranchSummary, buildTeacherName } from "@/helpers/courseSlots";
import { CardGridSkeleton } from "../Skeletons";

export default function PopularCourses() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { courses, loading, error } = useSelector((state) => state.course);
  const courseFallbackImage = getCoursePlaceholderImage();

  const coursedata = (rawCourses) => {
    if (!Array.isArray(rawCourses)) return [];

    const publishedCourses = rawCourses.filter(course => course.isPublished === true);

    return publishedCourses.map((course) => {

      const activePrice = Array.isArray(course.price)
        ? course.price.find(p => p.isSelected || p.isActive) || course.price[0]
        : course.price;


      const formatDate = (date) => {
        if (!date) return null;
        const dateObj = date.$date ? new Date(date.$date) : new Date(date);
        return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      };

      const startDate = formatDate(course.startDate);
      const endDate = formatDate(course.endDate);


      const calculateCourseRating = () => {
        if (!Array.isArray(course.teacher) || course.teacher.length === 0) {
          return 0;
        }

        const teachersWithRating = course.teacher.filter(t => t.averageRating && t.averageRating > 0);

        if (teachersWithRating.length === 0) {
          return 0;
        }

        const totalRating = teachersWithRating.reduce((sum, teacher) => sum + teacher.averageRating, 0);
        return (totalRating / teachersWithRating.length).toFixed(1);
      };

      const calculateTotalStudents = () => {
        if (Number.isFinite(Number(course.totalStudents))) {
          return Number(course.totalStudents);
        }

        if (!Array.isArray(course.teacher) || course.teacher.length === 0) {
          return 0;
        }

        const aggregateCount = course.teacher.reduce((sum, teacher) => {
          return sum + (Number(teacher?.studentCount) || 0);
        }, 0);

        return aggregateCount;
      };


      const getTeacherNames = () => {
        if (!Array.isArray(course.teacher) || course.teacher.length === 0) {
          return "Staff";
        }

        const teacherNames = course.teacher
          .map((teacher) => buildTeacherName(teacher))
          .filter(Boolean);

        if (teacherNames.length === 0) return "Staff";
        if (teacherNames.length === 1) return teacherNames[0];
        if (teacherNames.length === 2) return teacherNames.join(" & ");
        return `${teacherNames[0]} +${teacherNames.length - 1} more`;
      };

      const getBranchNames = () =>
        buildBranchSummary(course.branches) || "No branches available";

      const courseRating = calculateCourseRating();
      const enrolledStudents = calculateTotalStudents();

      return {
        id: course._id || course.id,
        name: course.name || "Untitled Course",
        title: course.name || "Untitled Course",
        code: course.code || "",
        description: course.description || "",
        category: course.category?.name || course.category || "Not specified",
        categoryIcon: course.category?.icon || "",
        categoryColor: course.category?.color || "",
        subCategory: course.subCategory?.name || course.subCategory || "",
        level: course.level || "Beginner",
        mode: course.mode || "Online",
        courseType: course.courseType || "fixed",
        certification: course.certification || "",
        duration: startDate && endDate
          ? `${startDate} - ${endDate}`
          : "",
        startDate: startDate,
        endDate: endDate,
        price: activePrice,
        monthlyFee: activePrice?.monthlyFee || 0,
        fullPayment: activePrice?.fullPayment || 0,
        discount: activePrice?.discount || 0,
        sessionType: activePrice?.sessionType || "standard",
        installments: activePrice?.installments || 1,
        image: resolveImageUrl(
          course.image,
          courseFallbackImage
        ),
        rating: parseFloat(courseRating) || 0,
        averageRating: parseFloat(courseRating) || 0,
        enrolledStudents: enrolledStudents,
        totalStudents: enrolledStudents,
        studentCount: enrolledStudents,
        tags: [
          course.category?.name || course.category,
          course.level,
        ].filter(Boolean),
        type: course.certification || course.courseType || "Certificate Course",
        teacher: course.teacher || [],
        teacherCount: course.teacher?.length || 0,
        mentor: getTeacherNames(),
        mentorName: getTeacherNames(),
        objectives: course.objectives || [],
        branches: course.branches || [],
        branchCount: course.branchCount || course.branches?.length || 0,
        branchNames: getBranchNames(),
        icon: course.icon || course.category?.icon || "",
        isPublished: course.isPublished
      };
    });
  };

  const transformedCourses = coursedata(courses).slice(0, 4);

  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  if (loading) return <CardGridSkeleton />;

  if (error) {
    return (
      <section className="py-16 px-6 max-w-7xl mx-auto text-center">
        <p className="text-[#CC3700] font-medium mb-2">Student Favorites</p>
        <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4">Popular Courses</h2>
        <p className="text-gray-500 mb-4">Couldn&apos;t load courses right now.</p>
        <button
          type="button"
          onClick={() => dispatch(fetchCourses())}
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#CC3700] hover:text-[#CC3700]"
        >
          <LuRotateCw className="h-4 w-4" /> Retry
        </button>
      </section>
    );
  }

  if (!transformedCourses.length) return null;

  return (
    <motion.section
      className="py-16 px-6 max-w-7xl mx-auto"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.05 }}
      variants={containerVariants}
    >
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true, amount: 0.05 }}
      >
        <p className="text-[#CC3700] font-medium mb-2">Student Favorites</p>
        <h2 className="text-3xl font-bold text-[#2D2D2D]">Popular Courses</h2>
      </motion.div>

      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        viewport={{ once: true, amount: 0.05 }}
      >
        {transformedCourses.map((course, index) => (
          <motion.div key={course.id || index} variants={cardVariants} className="h-full">
            <CourseCard
              image={course.image}
              fallbackImage={courseFallbackImage}
              rating={course.averageRating}
              enrolledStudents={course.enrolledStudents}
              studentCount={course.studentCount}
              type={course.type}
              title={course.name}
              mentor={course.mentor}
              mentorName={course.mentorName}
              teacherCount={course.teacherCount}
              duration={course.duration}
              mode={course.mode}
              icon={course.icon}
              categoryIcon={course.categoryIcon}
              price={course.price}
              monthlyFee={course.monthlyFee}
              fullPayment={course.fullPayment}
              discount={course.discount}
              sessionType={course.sessionType}
              installments={course.installments}
              level={course.level}
              branchCount={course.branchCount}
              branchName={course.branchNames}
              description={course.description}
              certification={course.certification}
              onViewDetails={() => router.push(`/courses/${course.id}`)}
              onBookDemo={() => router.push(`/courses/${course.id}?action=demo`)}
              {...course}
            />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="mt-10 flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        viewport={{ once: true, amount: 0.05 }}
      >
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 12px 28px -8px rgba(255,107,53,0.45)" }}
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push("/courses")}
          className="rounded-full bg-[#CC3700] px-8 py-3 text-sm font-semibold text-white transition-all duration-200"
        >
          Explore All Courses
        </motion.button>
      </motion.div>
    </motion.section>
  );
}
