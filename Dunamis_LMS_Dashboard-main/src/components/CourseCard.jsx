// CourseCard.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FaUsers, FaRupeeSign, FaMapMarkerAlt } from 'react-icons/fa';
import { FiMoreHorizontal } from 'react-icons/fi';
import { MdMusicNote, MdLanguage } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useUpdateCourse, useDeleteCourse } from '../hooks/useCourses';
import { DEFAULT_AVATAR, resolveImageUrl } from '../utils/resolveImageUrl';

const DEFAULT_COURSE_IMAGE = "https://placehold.co/640x360?text=Course";
const categoryIcons = {
    Music: <MdMusicNote className="inline-block mr-1 text-blue-600" size={16} />,
    Language: <MdLanguage className="inline-block mr-1 text-green-600" size={16} />,
    Dance: <span className="inline-block mr-1 text-yellow-600">🕺</span>,
};

const CourseCard = ({ course }) => {
    const updateCourseMutation = useUpdateCourse();
    const deleteCourseMutation = useDeleteCourse();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef();
    const {
        _id,
        image,
        category,
        level,
        name: title,
        isPublished,
        mode,
        description,
        totalStudents,
        // locations,
        price,
        teacher = [],
    } = course || {};

    const avatars = teacher.map((item) =>
        resolveImageUrl(item?.teacherDetail?.profilePicture || item?.userId?.image, DEFAULT_AVATAR)
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCardClick = () => {
        navigate(`/course/${_id}`);
    };

    const handleMenuAction = async (action) => {
        switch (action) {
            case 'Edit':
                navigate(`/admin/edit-course/${course._id}`)
                break;

            case 'Publish':
                try {
                    await updateCourseMutation.mutateAsync({
                        courseId: _id,
                        updates: { isPublished: true },
                    });
                    toast.success('Course published.');
                } catch (err) {
                    toast.error(`Failed to publish course: ${err.message || err}`);
                }
                break;

            case 'Move to drafts':
                try {
                    await updateCourseMutation.mutateAsync({
                        courseId: _id,
                        updates: { isPublished: false },
                    });
                    toast.success('Course moved to drafts.');
                } catch (err) {
                    toast.error(`Failed to move to drafts: ${err.message || err}`);
                }
                break;

            case 'Delete': {
                const result = await Swal.fire({
                    title: 'Are you sure?',
                    text: `Do you want to delete the course "${title}"? This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, delete it!',
                    cancelButtonText: 'Cancel',
                });

                if (result.isConfirmed) {
                    try {
                        await deleteCourseMutation.mutateAsync(_id);
                        toast.success('Course has been deleted.');
                    } catch (err) {
                        toast.error(`Failed to delete course: ${err.message || err}`);
                    }
                }
                break;
            }

            default:
                break;
        }
        setMenuOpen(false);
    };

    if (!course) {
        return (
            <div className="bg-gray-200 p-6 text-center text-gray-500 font-semibold">
                Course Not Found
            </div>
        );
    }

    return (
        <div
            className="group cursor-pointer relative overflow-hidden bg-white rounded-3xl border border-orange-100 shadow-sm w-full
        hover:-translate-y-1 hover:shadow-xl transition duration-200"
            onClick={handleCardClick}
        >
            <div className="relative h-44 overflow-hidden bg-gray-100">
                <img
                    src={resolveImageUrl(image, DEFAULT_COURSE_IMAGE)}
                    alt={title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <span className={`absolute bottom-4 left-4 text-xs font-semibold px-3 py-1 rounded-full select-none 
                    ${mode === 'online' ? 'bg-emerald-100 text-emerald-800'
                        : mode === 'offline' ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-700'}`}>
                    {mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Offline'}
                </span>
            </div>

            <div className="p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2 items-center">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full flex items-center select-none
                        ${category === 'Music' ? 'bg-blue-100 text-blue-600'
                            : category === 'Language' ? 'bg-green-100 text-green-600'
                                : category === 'Dance' ? 'bg-yellow-100 text-yellow-600'
                                    : 'bg-gray-100 text-gray-600'}`}>
                        {categoryIcons[category] || null}
                        {category?.name || category || 'N/A'}
                    </span>

                    <span className={`text-xs px-2.5 py-0.5 rounded-full select-none
                        ${level === 'Beginner' ? 'bg-red-100 text-red-700'
                            : level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700'
                                : level === 'Advanced' ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'}`}>
                        {level || 'N/A'}
                    </span>
                </div>

                <div ref={menuRef} className="relative">
                    <button
                        type="button"
                        className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-black"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(!menuOpen);
                        }}
                        aria-label="Course options menu"
                        aria-haspopup="true"
                        aria-expanded={menuOpen}
                    >
                        <FiMoreHorizontal size={20} />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 z-30 mt-2 w-48 rounded-2xl border border-gray-200 bg-white p-2 text-sm font-medium shadow-lg">
                            <button
                                type="button"
                                className="w-full rounded-xl px-3 py-2 text-left text-gray-700 transition hover:bg-gray-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMenuAction('Edit');
                                }}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                className="w-full rounded-xl px-3 py-2 text-left text-gray-700 transition hover:bg-gray-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMenuAction(isPublished ? 'Move to drafts' : 'Publish');
                                }}
                            >
                                {isPublished ? 'Move to drafts' : 'Publish Course'}
                            </button>
                            <button
                                type="button"
                                className="w-full rounded-xl px-3 py-2 text-left text-red-600 transition hover:bg-red-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMenuAction('Delete');
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-2">
                <h3 className="font-semibold text-lg text-gray-950 leading-tight">{title}</h3>
                <span className={`mt-2 inline-flex text-xs font-semibold px-3 py-1 rounded-full select-none 
                    ${isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {isPublished ? 'Published' : 'Draft'}
                </span>
            </div>

            <p className="text-sm text-gray-500 line-clamp-2 mb-4">{description}</p>

            <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-3 text-sm select-none">
                <div className="flex -space-x-2">
                    {avatars.map((avatar, idx) => (
                        <img
                            key={idx}
                            src={avatar}
                            className="w-6 h-6 rounded-full border-2 border-white"
                            alt="instructor"
                            draggable={false}
                        />
                    ))}
                </div>

                <div className="flex gap-4 text-gray-600 items-center">
                    <span className="flex items-center gap-1 whitespace-nowrap">
                        <FaUsers className="text-xs text-blue-500" /> {totalStudents || 0} 
                    </span>
                    {mode === 'offline' && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                            <FaMapMarkerAlt className="text-xs text-red-500" />
                            <p>{course.branchCount}</p>
                        </span>
                    )}
                    <span className="flex items-center gap-1 whitespace-nowrap">
                        <FaRupeeSign className="text-xs text-green-500" /> {getSelectedMonthlyFee(price)}/month
                    </span>
                </div>
            </div>
            </div>
        </div>
    );
};

const getSelectedMonthlyFee = (priceArr) => {
    if (!Array.isArray(priceArr)) return '-';
    const selected = priceArr.find(p => p.isSelected);
    return selected ? selected.monthlyFee : '-';
};

export default CourseCard;
