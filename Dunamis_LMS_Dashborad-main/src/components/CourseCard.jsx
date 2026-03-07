// CourseCard.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FaUsers, FaRupeeSign, FaMapMarkerAlt } from 'react-icons/fa';
import { FiMoreHorizontal } from 'react-icons/fi';
import { MdMusicNote, MdLanguage } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { getCourses, deleteCourse, updateCourse } from '../redux/Course/CourseSlice';
import { DEFAULT_AVATAR, resolveImageUrl } from '../utils/resolveImageUrl';
const IMAGE = import.meta.env.VITE_IMAGE;
const categoryIcons = {
    Music: <MdMusicNote className="inline-block mr-1 text-blue-600" size={16} />,
    Language: <MdLanguage className="inline-block mr-1 text-green-600" size={16} />,
    Dance: <span className="inline-block mr-1 text-yellow-600">🕺</span>,
};

const CourseCard = ({ course }) => {
    if (!course) {
        return (
            <div className="bg-gray-200 p-6 text-center text-gray-500 font-semibold">
                Course Not Found
            </div>
        );
    }

    const {
        _id,
        image,
        category,
        level,
        name: title,
        isPublished,
        mode,
        description,
        students,
        totalStudents,
        // locations,
        price,
        teacher = [],
    } = course;

    const avatars = teacher.map((item) =>
        resolveImageUrl(item?.teacherDetail?.profilePicture || item?.userId?.image, DEFAULT_AVATAR)
    );

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef();

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
                    await dispatch(updateCourse({
                        courseId: _id,
                        updates: { isPublished: true },
                    })).unwrap();
                    toast.success('Course published.');
                    dispatch(getCourses());
                } catch (err) {
                    toast.error(`Failed to publish course: ${err.message || err}`);
                }
                break;

            case 'Move to drafts':
                try {
                    await dispatch(updateCourse({
                        courseId: _id,
                        updates: { isPublished: false },
                    })).unwrap();
                    toast.success('Course moved to drafts.');
                    dispatch(getCourses());
                } catch (err) {
                    toast.error(`Failed to move to drafts: ${err.message || err}`);
                }
                break;

            case 'Delete':
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
                        await dispatch(deleteCourse(_id)).unwrap();
                        toast.success('Course has been deleted.');
                    } catch (err) {
                        toast.error(`Failed to delete course: ${err.message || err}`);
                    }
                }
                break;

            default:
                break;
        }
        setMenuOpen(false);
    };

    return (
        <div
            className="cursor-pointer relative bg-white rounded-xl border border-gray-200 shadow-sm p-4 w-full max-w-sm
        hover:shadow-lg transition-shadow duration-200"
            onClick={handleCardClick}
        >
            <img
                src={`${IMAGE}${image}`}
                alt={title}
                className="rounded-md w-full h-40 object-cover mb-4"
                draggable={false}
            />
            <div className="flex items-center justify-between mb-2">
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

                <div
                    ref={menuRef}
                    className="relative"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(!menuOpen);
                    }}
                    aria-label="Course options menu"
                >
                    <FiMoreHorizontal
                        className="text-gray-500 hover:text-black"
                        size={20}
                        aria-haspopup="true"
                        aria-expanded={menuOpen}
                    />
                    {menuOpen && (
                        <ul className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-30 text-sm font-medium">
                            <li
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleMenuAction('Edit')}
                            >
                                Edit
                            </li>
                            <li
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleMenuAction(isPublished ? 'Move to drafts' : 'Publish')}
                            >
                                {isPublished ? 'Move to drafts' : 'Publish Course'}
                            </li>
                            <li
                                className="px-4 py-2 text-red-600 hover:bg-red-100 cursor-pointer"
                                onClick={() => handleMenuAction('Delete')}
                            >
                                Delete
                            </li>
                        </ul>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-md text-gray-900">{title}</h3>
                <span className={`text-xs font-semibold px-3 py-0.5 rounded-full select-none 
                    ${mode === 'online' ? 'bg-green-100 text-green-700'
                        : mode === 'offline' ? 'bg-gray-200 text-gray-700'
                            : 'bg-gray-100 text-gray-600'}`}>
                    {mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Offline'}
                </span>
            </div>

            <p className="text-sm text-gray-500 line-clamp-2 mb-4">{description}</p>

            <div className="flex items-center justify-between text-sm select-none">
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
    );
};

const getSelectedMonthlyFee = (priceArr) => {
    if (!Array.isArray(priceArr)) return '-';
    const selected = priceArr.find(p => p.isSelected);
    return selected ? selected.monthlyFee : '-';
};

export default CourseCard;
