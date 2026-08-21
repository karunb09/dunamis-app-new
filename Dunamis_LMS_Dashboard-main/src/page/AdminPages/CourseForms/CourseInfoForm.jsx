import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import ReactSelect from "react-select";
import { fetchAllBranches } from "../../../redux/Branch/branchSlice";
import { fetchAllContent } from "../../../redux/Content/ContentSlice";
import { LANGUAGE_OPTIONS, toLanguageOptions } from "../../../constants/languages";


const CourseInfoForm = ({ courseInfo, setCourseInfo, setContent, branches, setBranches }) => {
    const dispatch = useDispatch();

    const {
        contentList,
        loading: contentLoading,
        error: contentError,
    } = useSelector((state) => state.content);
    const { branches: allBranches, listStatus: branchListStatus } = useSelector((state) => state.branch);
    const publishedContentList = contentList.filter(content => content.status === "published");

    const [showDateFields, setShowDateFields] = useState(false);
    const [showBranchField, setShowBranchField] = useState(false);

    useEffect(() => {
        if (branchListStatus === "idle") {
            dispatch(fetchAllBranches());
        }
        dispatch(fetchAllContent());
    }, [dispatch, branchListStatus]);

    useEffect(() => {
        if (!courseInfo) return;

        setShowDateFields(courseInfo.courseType === "fixed");
        setShowBranchField(courseInfo.mode === "offline");
    }, [courseInfo]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCourseInfo({ ...courseInfo, [name]: value });
    };

    const handleLanguagesChange = (selectedOptions) => {
        setCourseInfo({
            ...courseInfo,
            languages: (selectedOptions || []).map((option) => option.value),
        });
    };

    const handleCourseNameChange = (selectedOption) => {
        if (!selectedOption) {
            setCourseInfo({
                ...courseInfo,
                name: "",
                courseCode: "",
                category: "",
                subCategory: "",
            });
            setContent([]);
            return;
        }

        const selectedCourse = publishedContentList.find(
            (course) => course.courseName === selectedOption.label
        );

        if (selectedCourse) {
            setContent([selectedCourse._id]);

            setCourseInfo({
                ...courseInfo,
                name: selectedOption.label,
                courseCode: selectedCourse.courseCode,
                category: selectedCourse.category._id || "",
                subCategory: selectedCourse.subCategory?._id || "",
            });
        } else {
            setContent([]);
            setCourseInfo({
                ...courseInfo,
                name: selectedOption.label,
                courseCode: "",
                category: "",
                subCategory: "",
            });
        }
    };

    const handleCourseCodeChange = (selectedOption) => {
        setCourseInfo({
            ...courseInfo,
            courseCode: selectedOption ? selectedOption.value : "",
        });
    };

    const getBranchCityName = (branch) =>
        branch?.city?.cityName || branch?.city?.name || "Unassigned city";

    const getBranchCityId = (branch) =>
        branch?.city?._id || branch?.city || "unassigned";

    const branchOptions = Array.isArray(allBranches)
        ? allBranches
            .filter((branch) => branch?._id)
            .map((branch) => {
                const cityName = getBranchCityName(branch);
                return {
                    value: branch._id,
                    label: `${branch.branchName || "Unnamed Branch"} · ${cityName}`,
                    branchName: branch.branchName || "Unnamed Branch",
                    cityName,
                    cityId: getBranchCityId(branch),
                    optionType: "branch",
                };
            })
        : [];

    const branchOptionsByCity = branchOptions.reduce((acc, option) => {
        if (!acc[option.cityId]) {
            acc[option.cityId] = {
                cityId: option.cityId,
                cityName: option.cityName,
                branches: [],
            };
        }
        acc[option.cityId].branches.push(option);
        return acc;
    }, {});

    const branchSelectOptions = branchOptions.length
        ? [
            {
                label: "Quick select",
                options: [
                    {
                        value: "__all_branches__",
                        label: `All cities (${branchOptions.length} branches)`,
                        optionType: "all",
                    },
                ],
            },
            ...Object.values(branchOptionsByCity)
                .sort((a, b) => a.cityName.localeCompare(b.cityName))
                .map((cityGroup) => ({
                    label: cityGroup.cityName,
                    options: [
                        {
                            value: `__city_${cityGroup.cityId}__`,
                            label: `All branches in ${cityGroup.cityName}`,
                            cityId: cityGroup.cityId,
                            optionType: "city",
                        },
                        ...cityGroup.branches.sort((a, b) =>
                            a.branchName.localeCompare(b.branchName)
                        ),
                    ],
                })),
        ]
        : [];

    const toBranchSelection = (option) => ({
        label: option.label,
        value: option.value,
        cityName: option.cityName,
    });

    const selectedBranchOptions = Array.isArray(branches)
        ? branches
            .map((branch) => {
                const value = branch?.value || branch;
                return (
                    branchOptions.find((option) => option.value === value) || {
                        value,
                        label: branch?.label || "Selected branch",
                        optionType: "branch",
                    }
                );
            })
            .filter((branch) => branch?.value)
        : [];

    const handleBranchesChange = (selectedOptions) => {
        const selected = selectedOptions || [];

        if (selected.some((option) => option.optionType === "all")) {
            setBranches(branchOptions.map(toBranchSelection));
            return;
        }

        const selectedBranchIds = new Set();

        selected.forEach((option) => {
            if (option.optionType === "branch") {
                selectedBranchIds.add(option.value);
                return;
            }

            if (option.optionType === "city") {
                branchOptions
                    .filter((branch) => branch.cityId === option.cityId)
                    .forEach((branch) => selectedBranchIds.add(branch.value));
            }
        });

        setBranches(
            branchOptions
                .filter((option) => selectedBranchIds.has(option.value))
                .map(toBranchSelection)
        );
    };

    if (contentLoading) return <div>Loading content...</div>;
    if (contentError) return <div>Error: {contentError}</div>;

    const courseOptions = publishedContentList.map((course) => ({
        value: course.courseCode,
        label: course.courseName,
    }));

    const filteredCourseCodes = publishedContentList
        .filter((course) => course.courseName === courseInfo?.name)
        .map((course) => ({
            value: course.courseCode,
            label: course.courseCode,
        }));

    const uniqueCategories = Array.from(
        new Set(publishedContentList.map((course) => course.category._id))
    ).map((categoryId) => {
        return publishedContentList.find((course) => course.category._id === categoryId)
            ?.category;
    });

    const subCategoriesSet = new Set();
    publishedContentList.forEach((course) => {
        if (course.category._id === courseInfo?.category) {
            const subCats = Array.isArray(course.subCategory) 
                ? course.subCategory 
                : course.subCategory ? [course.subCategory] : [];
            
            subCats.forEach(subCat => {
                if (subCat && subCat._id) {
                    subCategoriesSet.add(
                        JSON.stringify({
                            id: subCat._id,
                            name: subCat.name,
                        })
                    );
                }
            });
        }
    });
    const subCategories = Array.from(subCategoriesSet).map((item) =>
        JSON.parse(item)
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-1">Course Name <span className="text-red-500">*</span></label>
                <ReactSelect
                    name="name"
                    value={
                        courseInfo?.name
                            ? { label: courseInfo.name, value: courseInfo.name }
                            : null
                    }
                    onChange={handleCourseNameChange}
                    options={courseOptions}
                    placeholder="Select a course name"
                    className="w-full pr-10"
                    isClearable
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Course Code <span className="text-red-500">*</span></label>
                <ReactSelect
                    name="courseCode"
                    value={
                        courseInfo?.courseCode
                            ? { value: courseInfo.courseCode, label: courseInfo.courseCode }
                            : null
                    }
                    onChange={handleCourseCodeChange}
                    options={filteredCourseCodes}
                    placeholder="Select a course code"
                    isDisabled={!courseInfo?.name}
                    className="w-full pr-10"
                    isClearable
                />
            </div>

            <div className="col-span-full mt-2">
                <label className="block text-sm font-medium mb-1">
                    Course Description <span className="text-red-500">*</span>
                </label>
                <textarea
                    name="description"
                    value={courseInfo?.description || ""}
                    onChange={handleChange}
                    placeholder="Enter course description"
                    maxLength={200}
                    className="w-full border px-3 py-2 rounded-2xl bg-gray-100 h-28 resize-none text-sm placeholder-gray-400"
                />
                <p className="text-right text-xs text-gray-400 mt-1">
                    {(courseInfo?.description || "").length}/200
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                    name="category"
                    value={courseInfo?.category || ""}
                    disabled
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded-2xl bg-gray-100 pr-10"
                >
                    <option value="">Select a category</option>
                    {uniqueCategories.map((category) => (
                        <option key={category._id} value={category._id}>
                            {category.name || "Unknown"}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Sub-category</label>
                <select
                    name="subCategory"
                    value={courseInfo?.subCategory || ""}
                    disabled
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded-2xl bg-gray-100 pr-10"
                >
                    <option value="">Select a sub-category</option>
                    {subCategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                            {sub.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Mode <span className="text-red-500">*</span></label>
                <select
                    name="mode"
                    value={courseInfo?.mode || ""}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded-2xl bg-gray-100 pr-10"
                >
                    <option value="">Select a mode</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                </select>
            </div>

            {showBranchField && (
                <div className="col-span-full">
                    <label className="block text-sm font-medium mb-1">Branches <span className="text-red-500">*</span></label>
                    <ReactSelect
                        isMulti
                        name="branches"
                        options={branchSelectOptions}
                        value={selectedBranchOptions}
                        onChange={handleBranchesChange}
                        className="w-full pr-10"
                        placeholder="Select all cities, a full city, or individual branches"
                        closeMenuOnSelect={false}
                        isDisabled={branchListStatus === "loading"}
                        noOptionsMessage={() => "No branches available"}
                        styles={{
                            control: (base, state) => ({
                                ...base,
                                minHeight: 48,
                                borderRadius: 16,
                                borderColor: state.isFocused ? "#111827" : "#e5e7eb",
                                boxShadow: state.isFocused ? "0 0 0 1px #111827" : "none",
                                "&:hover": {
                                    borderColor: "#111827",
                                },
                            }),
                            groupHeading: (base) => ({
                                ...base,
                                color: "#111827",
                                fontWeight: 700,
                                letterSpacing: "0.02em",
                            }),
                            option: (base, state) => ({
                                ...base,
                                backgroundColor: state.isFocused ? "#f3f4f6" : "white",
                                color: "#111827",
                                fontWeight: state.data.optionType !== "branch" ? 700 : 400,
                            }),
                            multiValue: (base) => ({
                                ...base,
                                borderRadius: 999,
                                backgroundColor: "#f3f4f6",
                            }),
                            multiValueLabel: (base) => ({
                                ...base,
                                color: "#111827",
                                fontWeight: 500,
                            }),
                        }}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                        Choose “All cities” for every branch, or use a city group to add all branches in that city.
                    </p>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium mb-1">Course Type <span className="text-red-500">*</span></label>
                <select
                    name="courseType"
                    value={courseInfo?.courseType || ""}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded-2xl bg-gray-100 pr-10"
                >
                    <option value="">Select type</option>
                    <option value="fixed">Fixed</option>
                    <option value="running">Running</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Level <span className="text-red-500">*</span></label>
                <select
                    name="level"
                    value={courseInfo?.level || ""}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded-2xl bg-gray-100 pr-10"
                >
                    <option value="">Select a level</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Teaching Languages</label>
                <ReactSelect
                    isMulti
                    name="languages"
                    options={LANGUAGE_OPTIONS}
                    value={toLanguageOptions(courseInfo?.languages)}
                    onChange={handleLanguagesChange}
                    className="w-full pr-10"
                    placeholder="Select languages"
                    closeMenuOnSelect={false}
                    styles={{
                        control: (base, state) => ({
                            ...base,
                            minHeight: 42,
                            borderRadius: 16,
                            backgroundColor: "#f3f4f6",
                            borderColor: state.isFocused ? "#111827" : "#e5e7eb",
                            boxShadow: state.isFocused ? "0 0 0 1px #111827" : "none",
                            "&:hover": {
                                borderColor: "#111827",
                            },
                        }),
                        multiValue: (base) => ({
                            ...base,
                            borderRadius: 999,
                            backgroundColor: "#ffffff",
                        }),
                        multiValueLabel: (base) => ({
                            ...base,
                            color: "#111827",
                            fontWeight: 500,
                        }),
                    }}
                />
                <p className="mt-2 text-xs text-gray-500">
                    Shown to students on the website. Defaults to English.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Certification <span className="text-red-500">*</span></label>
                <select
                    name="certification"
                    value={courseInfo?.certification || ""}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded-2xl bg-gray-100 pr-10"
                >
                    <option value="">Select certification option</option>
                    <option value="certification">Yes</option>
                    <option value="non-certification">No</option>
                </select>
            </div>

            {showDateFields && (
                <>
                    <div>
                        <label className="block text-sm font-medium mb-1">Start Date <span className="text-red-500">*</span></label>
                        <input
                            type="date"
                            name="startDate"
                            value={courseInfo.startDate || ""}
                            onChange={handleChange}
                            className="w-full border px-3 py-2 rounded-2xl bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">End Date <span className="text-red-500">*</span></label>
                        <input
                            type="date"
                            name="endDate"
                            value={courseInfo.endDate || ""}
                            onChange={handleChange}
                            className="w-full border px-3 py-2 rounded-2xl bg-gray-100"
                        />
                    </div>
                </>
            )}
        </div>
    );
};


export default CourseInfoForm;
