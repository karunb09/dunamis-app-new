import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import {
    createBranch,
    fetchAllBranches,
    fetchBranchById,
    updateBranch,
} from "../../../redux/Branch/branchSlice";
import { fetchTeachers } from "../../../redux/Intructor/teacherSlice";
import { deleteCity, getAllCities } from "../../../redux/City/CitySlice";
import { PiUpload } from "react-icons/pi";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { resolveImageUrl } from "../../../utils/resolveImageUrl";
import { getCurrentFix } from "../../../utils/geolocation";
import { mapsUrl } from "../../../utils/checkInFormat";
import { useCreateZone, useDeleteZone, useRenameZone, useStaffDirectory, useZones } from "../../../hooks/useOrg";
import { designationLabel } from "../../../constants/orgStructure";

// "17.4156, 78.4347", as Google Maps copies a dropped pin.
const COORDINATE_PAIR = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

const AddBranch = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const daysRef = useRef();

    const [formData, setFormData] = useState({
        branchName: "",
        location: "",
        zone: "",
        city: "",
        branchManager: "",
        branchAdminContact: "",
        branchAdminEmail: "",
        startTime: "",
        endTime: "",
        branchOpenDays: [],
        branchCapacity: "",
        centreFacilities: "",
        branchImage: null,
        teachers: [],
        geoLat: "",
        geoLng: "",
        geofenceRadiusM: "200",
    });

    const [showDaysDropdown, setShowDaysDropdown] = useState(false);
    const [pinning, setPinning] = useState(false);
    const [pinAccuracy, setPinAccuracy] = useState(null);

    const { loading, error, selectedBranch } = useSelector(
        (state) => state.branch
    );

    const { data: staff = [], isLoading: staffLoading } = useStaffDirectory();
    const { data: zones = [] } = useZones();
    const createZone = useCreateZone();
    const renameZone = useRenameZone();
    const removeZone = useDeleteZone();
    const cityZones = zones.filter((zone) => (zone.city?._id || zone.city) === formData.city);
    const { cities = [], loading: citiesLoading, listStatus: cityListStatus } = useSelector(
        (state) => state.city
    );
    const {
        teachers: instructorRecords = [],
        loading: instructorsLoading,
        error: instructorsError,
    } = useSelector((state) => state.teachers);

    const branchFallbackImage = `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
        formData.branchName || selectedBranch?.branchName || "Branch"
    )}`;

    useEffect(() => {
        if (cityListStatus === "idle") {
            dispatch(getAllCities());
        }
    }, [dispatch, cityListStatus]);

    useEffect(() => {
        dispatch(fetchTeachers());
    }, [dispatch]);

    useEffect(() => {
        if (id) {
            dispatch(fetchBranchById(id));
        }
    }, [dispatch, id]);

    useEffect(() => {
        if (error) {
            toast.error(`Error: ${error}`);
        }
    }, [error]);

    useEffect(() => {
        if (id && selectedBranch?._id === id) {
            setFormData({
                branchName: selectedBranch.branchName || "",
                location: selectedBranch.location || "",
                zone: selectedBranch.zone?._id || selectedBranch.zone || "",
                city: selectedBranch.city?._id || selectedBranch.city || "",
                branchManager:
                    selectedBranch.branchManager?._id || selectedBranch.branchManager || "",
                branchAdminContact: selectedBranch.branchAdminContact || "",
                branchAdminEmail: selectedBranch.branchAdminEmail || "",
                startTime: selectedBranch.branchTimings?.[0] || "",
                endTime: selectedBranch.branchTimings?.[1] || "",
                branchOpenDays: selectedBranch.branchOpenDays || [],
                branchCapacity: String(selectedBranch.branchCapacity || ""),
                centreFacilities: selectedBranch.centreFacilities || "",
                branchImage: null,
                teachers: (selectedBranch.teachers || []).map((teacher) => ({
                    value: teacher._id || teacher.id,
                    label: getInstructorLabel(teacher),
                })).filter((teacher) => teacher.value),
                geoLat: selectedBranch.geo?.lat != null ? String(selectedBranch.geo.lat) : "",
                geoLng: selectedBranch.geo?.lng != null ? String(selectedBranch.geo.lng) : "",
                geofenceRadiusM: String(selectedBranch.geofenceRadiusM || 200),
            });
        }
    }, [id, selectedBranch]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (daysRef.current && !daysRef.current.contains(e.target)) {
                setShowDaysDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        return () => {
            if (formData.branchImage) URL.revokeObjectURL(formData.branchImage);
        };
    }, [formData.branchImage]);

    // Handle input change
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "branchManager") {
            const selected = staff.find((u) => u._id === value);
            if (selected && selected.email && selected.mobileNo != null) {
                setFormData({
                    ...formData,
                    branchManager: value,
                    branchAdminEmail: selected.email,
                    branchAdminContact: String(selected.mobileNo),
                });
            } else {
                setFormData({
                    ...formData,
                    branchManager: value,
                    branchAdminEmail: "",
                    branchAdminContact: "",
                });
            }
        } else if (name === "city") {
            // A zone belongs to one city, so a new city needs a new zone.
            setFormData({ ...formData, city: value, zone: "" });
        } else if ((name === "geoLat" || name === "geoLng") && COORDINATE_PAIR.test(value)) {
            const [, lat, lng] = value.match(COORDINATE_PAIR);
            setFormData({ ...formData, geoLat: lat, geoLng: lng });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const toggleDay = (day) => {
        setFormData((prev) => {
            const arr = prev.branchOpenDays.includes(day)
                ? prev.branchOpenDays.filter((d) => d !== day)
                : [...prev.branchOpenDays, day];
            return { ...prev, branchOpenDays: arr };
        });
    };

    const handleCancel = () => {
        setFormData({
            branchName: "",
            location: "",
            zone: "",
            city: "",
            branchManager: "",
            branchAdminContact: "",
            branchAdminEmail: "",
            startTime: "",
            endTime: "",
            branchOpenDays: [],
            branchCapacity: "",
            centreFacilities: "",
            branchImage: null,
            teachers: [],
            geoLat: "",
            geoLng: "",
            geofenceRadiusM: "200",
        });
        navigate("/admin/centers");
    };

    const pinFromDevice = async () => {
        setPinning(true);
        try {
            const fix = await getCurrentFix();
            setFormData((prev) => ({
                ...prev,
                geoLat: fix.lat.toFixed(6),
                geoLng: fix.lng.toFixed(6),
            }));
            setPinAccuracy(fix.accuracyM);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setPinning(false);
        }
    };

    const buildPayload = (status) => {
        const required = [
            "branchName",
            "location",
            "zone",
            "city",
            "branchManager",
            "branchAdminEmail",
            "branchAdminContact",
            "startTime",
            "endTime",
            "branchOpenDays",
            "branchCapacity",
        ];

        for (const field of required) {
            if (!formData[field] || (Array.isArray(formData[field]) && formData[field].length === 0)) {
                throw new Error(`Please fill ${field}`);
            }
        }

        if (!/^\d{10}$/.test(String(formData.branchAdminContact))) {
            throw new Error("Branch admin contact must be 10 digits.");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.branchAdminEmail)) {
            throw new Error("Branch admin email must be valid.");
        }

        if (!Number.isFinite(Number(formData.branchCapacity)) || Number(formData.branchCapacity) <= 0) {
            throw new Error("Branch capacity must be a positive number.");
        }

        if (formData.startTime === formData.endTime) {
            throw new Error("Start time and end time must be different.");
        }

        const lat = String(formData.geoLat).trim();
        const lng = String(formData.geoLng).trim();
        if (Boolean(lat) !== Boolean(lng)) {
            throw new Error("Enter both latitude and longitude for the check-in location, or leave both blank.");
        }
        if (lat && (Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180 || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)))) {
            throw new Error("The check-in location's latitude or longitude is out of range.");
        }
        const radius = Number(formData.geofenceRadiusM);
        if (!Number.isFinite(radius) || radius < 50 || radius > 2000) {
            throw new Error("Check-in radius must be between 50 and 2000 metres.");
        }

        const img = formData.branchImage;
        if (img) {
            if (!(img instanceof File) || !img.type.startsWith("image/")) {
                throw new Error("Please upload a valid image file.");
            }
            if (img.size > 5 * 1024 * 1024) {
                throw new Error("Image too large. Must be under 5MB.");
            }
        }

        const payload = new FormData();
        payload.append("branchName", formData.branchName);
        payload.append("location", formData.location);
        payload.append("zone", formData.zone);
        payload.append("city", formData.city);
        payload.append("branchManager", formData.branchManager);
        payload.append("branchAdminEmail", formData.branchAdminEmail);
        payload.append("branchAdminContact", formData.branchAdminContact);
        payload.append(
            "branchTimings",
            JSON.stringify([formData.startTime, formData.endTime])
        );
        payload.append("branchOpenDays", JSON.stringify(formData.branchOpenDays));
        payload.append("branchCapacity", formData.branchCapacity);
        payload.append("centreFacilities", formData.centreFacilities || "");
        payload.append(
            "teachers",
            JSON.stringify((formData.teachers || []).map((teacher) => teacher.value || teacher))
        );
        payload.append("geoLat", lat);
        payload.append("geoLng", lng);
        payload.append("geofenceRadiusM", String(radius));
        payload.append("status", status);
        if (formData.branchImage) {
            payload.append("branchImage", formData.branchImage);
        }

        return payload;
    };

    const saveBranch = async (status) => {
        let toastId;
        try {
            const payload = buildPayload(status);
            toastId = toast.loading(
                id
                    ? status === "draft"
                        ? "Updating draft..."
                        : "Updating branch..."
                    : status === "draft"
                        ? "Saving draft..."
                        : "Saving branch..."
            );

            if (id) {
                await dispatch(updateBranch({ id, branchData: payload })).unwrap();
            } else {
                await dispatch(createBranch(payload)).unwrap();
            }

            dispatch(fetchAllBranches());

            toast.success(
                id
                    ? status === "draft"
                        ? "Branch draft updated!"
                        : "Branch updated successfully!"
                    : status === "draft"
                        ? "Branch saved to drafts!"
                        : "Branch created successfully!"
            );
            navigate("/admin/centers");
        } catch (saveError) {
            const message =
                typeof saveError === "string"
                    ? saveError
                    : saveError?.message || "Failed to save branch";
            toast.error(message);
        } finally {
            if (toastId) {
                toast.dismiss(toastId);
            }
        }
    };

    const handleSaveDraft = async () => {
        await saveBranch("draft");
    };

    const handleSaveBranch = async () => {
        await saveBranch("active");
    };

    const handleDeleteCity = () => {
        if (!formData.city) {
            toast.error("Select a city first");
            return;
        }

        const selectedCity = cities.find((city) => city._id === formData.city);

        Swal.fire({
            title: "Delete city?",
            text: `This will delete ${selectedCity?.cityName || "the selected city"}.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "Delete",
        }).then(async (result) => {
            if (!result.isConfirmed) return;

            try {
                await dispatch(deleteCity(formData.city)).unwrap();
                toast.success("City deleted successfully");
                setFormData((prev) => ({ ...prev, city: "" }));
            } catch (deleteError) {
                toast.error(deleteError?.message || "Failed to delete city");
            }
        });
    };

    const errorText = (err, fallback) => err?.message || fallback;

    const handleAddZone = async () => {
        if (!formData.city) {
            toast.error("Select a city first");
            return;
        }
        const { value: name, isConfirmed } = await Swal.fire({
            title: "Add zone",
            input: "text",
            inputPlaceholder: "e.g. Hyderabad South",
            showCancelButton: true,
            confirmButtonText: "Add",
            confirmButtonColor: "#FF6B35",
            inputValidator: (value) => (!value?.trim() ? "Enter a zone name" : undefined),
        });
        if (!isConfirmed) return;
        try {
            const zone = await createZone.mutateAsync({ name: name.trim(), city: formData.city });
            setFormData((prev) => ({ ...prev, zone: zone._id }));
            toast.success("Zone added");
        } catch (zoneError) {
            toast.error(errorText(zoneError, "Failed to add zone"));
        }
    };

    const handleRenameZone = async () => {
        const current = cityZones.find((zone) => zone._id === formData.zone);
        if (!current) return;
        const { value: name, isConfirmed } = await Swal.fire({
            title: "Rename zone",
            input: "text",
            inputValue: current.name,
            showCancelButton: true,
            confirmButtonText: "Save",
            confirmButtonColor: "#FF6B35",
            inputValidator: (value) => (!value?.trim() ? "Enter a zone name" : undefined),
        });
        if (!isConfirmed) return;
        try {
            await renameZone.mutateAsync({ id: current._id, name: name.trim() });
            toast.success("Zone renamed");
        } catch (zoneError) {
            toast.error(errorText(zoneError, "Failed to rename zone"));
        }
    };

    const handleDeleteZone = async () => {
        const current = cityZones.find((zone) => zone._id === formData.zone);
        if (!current) return;
        const { isConfirmed } = await Swal.fire({
            title: "Delete zone?",
            text: `This will delete ${current.name}.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "Delete",
        });
        if (!isConfirmed) return;
        try {
            await removeZone.mutateAsync(current._id);
            setFormData((prev) => ({ ...prev, zone: "" }));
            toast.success("Zone deleted");
        } catch (zoneError) {
            toast.error(errorText(zoneError, "Failed to delete zone"));
        }
    };

    function getInstructorLabel(instructor) {
        const detailName = instructor?.teacherDetail?.name;
        const userName = instructor?.user?.name || instructor?.userId?.name;
        const nameSource = detailName || userName || instructor?.name;

        if (typeof nameSource === "string" && nameSource.trim()) {
            return nameSource.trim();
        }

        const fullName = `${nameSource?.firstName || ""} ${nameSource?.lastName || ""}`.trim();
        const expertise =
            instructor?.teacherApplication?.areaOfExpertise ||
            instructor?.teacherDetail?.areaOfExpertise;

        return `${fullName || "Instructor"}${expertise ? ` (${expertise})` : ""}`;
    }

    const instructorOptions = (instructorRecords || [])
        .filter((instructor) => {
            const mode =
                instructor?.teacherApplication?.mode ||
                instructor?.teacherDetail?.mode ||
                "";
            return !mode || String(mode).toLowerCase() === "offline" || String(mode).toLowerCase() === "hybrid";
        })
        .map((instructor) => ({
            value: instructor.id || instructor._id,
            label: getInstructorLabel(instructor),
        }))
        .filter((option) => option.value);

    return (
        <div className="p-6 bg-gray-50 rounded-2xl">
            <h2 className="text-lg font-semibold mb-4">
                {id ? "Edit Branch" : "Create New Branch"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch Name */}
                <label>
                    Branch Name
                    <input
                        type="text"
                        name="branchName"
                        value={formData.branchName}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                    />
                </label>

                {/* Location */}
                <label>
                    Location
                    <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                    />
                </label>

                {/* Instructor check-in pin */}
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-800">Check-in location</p>
                            <p className="text-xs text-slate-500">
                                Instructors can only check in within the radius of this pin. Without a pin, their
                                check-ins are accepted but marked unverified.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={pinFromDevice}
                            disabled={pinning}
                            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-orange-300 hover:text-orange-600 disabled:opacity-60"
                        >
                            {pinning ? "Reading location…" : "Use my current location"}
                        </button>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <label className="text-sm">
                            Latitude
                            <input
                                type="text"
                                inputMode="decimal"
                                name="geoLat"
                                value={formData.geoLat}
                                onChange={handleChange}
                                placeholder="17.415600"
                                className="p-3 border rounded-2xl w-full"
                            />
                        </label>
                        <label className="text-sm">
                            Longitude
                            <input
                                type="text"
                                inputMode="decimal"
                                name="geoLng"
                                value={formData.geoLng}
                                onChange={handleChange}
                                placeholder="78.434700"
                                className="p-3 border rounded-2xl w-full"
                            />
                        </label>
                        <label className="text-sm">
                            Radius (metres)
                            <input
                                type="number"
                                min="50"
                                max="2000"
                                step="10"
                                name="geofenceRadiusM"
                                value={formData.geofenceRadiusM}
                                onChange={handleChange}
                                className="p-3 border rounded-2xl w-full"
                            />
                        </label>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>Paste "lat, lng" from Google Maps into either box to fill both.</span>
                        {formData.geoLat && formData.geoLng && (
                            <>
                                <a
                                    href={mapsUrl(formData.geoLat, formData.geoLng)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-orange-600 underline underline-offset-2"
                                >
                                    Check on Google Maps
                                </a>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData((prev) => ({ ...prev, geoLat: "", geoLng: "" }));
                                        setPinAccuracy(null);
                                    }}
                                    className="font-medium text-rose-600 underline underline-offset-2"
                                >
                                    Remove pin
                                </button>
                            </>
                        )}
                    </div>
                    {pinAccuracy != null && (
                        <p className={`mt-2 text-xs ${pinAccuracy > 50 ? "text-amber-700" : "text-emerald-700"}`}>
                            {pinAccuracy > 50
                                ? `This reading is only accurate to ±${pinAccuracy} m. Step outside or near the entrance and try again for a tighter pin.`
                                : `Pinned from this device, accurate to ±${pinAccuracy} m.`}
                        </p>
                    )}
                </div>

                {/* City */}
                <label>
                    City
                    <select
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        disabled={citiesLoading}
                    >
                        <option value="">Select City</option>
                        {cities.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.cityName}
                            </option>
                        ))}
                    </select>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => navigate("/admin/centers/add-city")}
                            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-100"
                        >
                            Add City
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(`/admin/centers/add-city/${formData.city}`)}
                            disabled={!formData.city}
                            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Edit City
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteCity}
                            disabled={!formData.city}
                            className="rounded-xl border border-red-500 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Delete City
                        </button>
                    </div>
                </label>

                {/* Zone — BDEs are responsible for zones, so every branch needs one */}
                <label>
                    Zone
                    <select
                        name="zone"
                        value={formData.zone}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        disabled={!formData.city}
                    >
                        <option value="">{formData.city ? "Select zone" : "Select a city first"}</option>
                        {cityZones.map((zone) => (
                            <option key={zone._id} value={zone._id}>
                                {zone.name}
                            </option>
                        ))}
                    </select>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleAddZone}
                            disabled={!formData.city}
                            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Add Zone
                        </button>
                        <button
                            type="button"
                            onClick={handleRenameZone}
                            disabled={!formData.zone}
                            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Rename Zone
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteZone}
                            disabled={!formData.zone}
                            className="rounded-xl border border-red-500 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Delete Zone
                        </button>
                    </div>
                </label>

                {/* Centre contact — the person shown for this branch. Who is responsible
                    for it in the org chart is set on staff (Admins → Reporting structure). */}
                <label>
                    Centre contact
                    <select
                        name="branchManager"
                        value={formData.branchManager}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                        disabled={staffLoading}
                    >
                        <option value="">{staffLoading ? "Loading..." : "Select centre contact"}</option>
                        {staff.map((person) => (
                            <option key={person._id} value={person._id}>
                                {person.name?.firstName} {person.name?.lastName}
                                {person.org?.designation ? ` · ${designationLabel(person.org.designation)}` : ""}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">
                        Branch Instructors
                    </label>
                    <Select
                        isMulti
                        options={instructorOptions}
                        value={formData.teachers}
                        onChange={(selectedOptions) =>
                            setFormData((prev) => ({
                                ...prev,
                                teachers: selectedOptions || [],
                            }))
                        }
                        isDisabled={instructorsLoading}
                        placeholder={
                            instructorsLoading
                                ? "Loading offline instructors..."
                                : "Select instructors for this branch"
                        }
                        noOptionsMessage={() =>
                            instructorsError || "No offline instructors found"
                        }
                        className="w-full"
                        styles={{
                            control: (base, state) => ({
                                ...base,
                                minHeight: 48,
                                borderRadius: 16,
                                borderColor: state.isFocused ? "#111827" : "#e5e7eb",
                                boxShadow: state.isFocused ? "0 0 0 1px #111827" : "none",
                                "&:hover": { borderColor: "#111827" },
                            }),
                            multiValue: (base) => ({
                                ...base,
                                borderRadius: 999,
                                backgroundColor: "#f3f4f6",
                            }),
                        }}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        These instructors will appear as branch instructors and can be used for offline scheduling.
                    </p>
                </div>

                {/* Branch Admin Contact */}
                {formData.branchAdminContact && (
                    <label>
                        Centre contact phone
                        <input
                            type="text"
                            name="branchAdminContact"
                            value={formData.branchAdminContact}
                            readOnly
                            className="p-3 border rounded-2xl w-full bg-gray-100 cursor-not-allowed"
                        />
                    </label>
                )}

                {/* Branch Admin Email */}
                {formData.branchAdminEmail && (
                    <label>
                        Centre contact email
                        <input
                            type="email"
                            name="branchAdminEmail"
                            value={formData.branchAdminEmail}
                            readOnly
                            className="p-3 border rounded-2xl w-full bg-gray-100 cursor-not-allowed"
                        />
                    </label>
                )}

                {/* Branch Capacity */}
                <label>
                    Branch Capacity
                    <input
                        type="number"
                        name="branchCapacity"
                        value={formData.branchCapacity}
                        onChange={handleChange}
                        className="p-3 border rounded-2xl w-full"
                    />
                </label>

                {/* Branch Timings */}
                <div>
                    <label>Branch Timings</label>
                    <div className="flex gap-2">
                        <input
                            type="time"
                            name="startTime"
                            value={formData.startTime}
                            onChange={handleChange}
                            className="p-3 border rounded-2xl w-full"
                        />
                        <input
                            type="time"
                            name="endTime"
                            value={formData.endTime}
                            onChange={handleChange}
                            className="p-3 border rounded-2xl w-full"
                        />
                    </div>
                </div>

                {/* Branch Open Days */}
                <div className="relative" ref={daysRef}>
                    <label>Branch Open Days</label>
                    <div
                        onClick={() => setShowDaysDropdown(!showDaysDropdown)}
                        className="p-3 border rounded-2xl cursor-pointer w-full bg-white"
                    >
                        {formData.branchOpenDays.length > 0
                            ? formData.branchOpenDays.join(", ")
                            : "Select Days"}
                    </div>
                    {showDaysDropdown && (
                        <div className="absolute bg-white shadow-md rounded-lg mt-2 p-4 z-10 w-full">
                            {[
                                "Monday",
                                "Tuesday",
                                "Wednesday",
                                "Thursday",
                                "Friday",
                                "Saturday",
                                "Sunday",
                            ].map((day) => (
                                <div key={day} className="flex items-center mb-1">
                                    <input
                                        type="checkbox"
                                        id={day}
                                        checked={formData.branchOpenDays.includes(day)}
                                        onChange={() => toggleDay(day)}
                                        className="mr-2"
                                    />
                                    <label htmlFor={day}>{day}</label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Centre Facilities */}
            <label className="mt-4 block">
                Centre Facilities (Optional)
                <textarea
                    name="centreFacilities"
                    value={formData.centreFacilities}
                    onChange={handleChange}
                    rows="4"
                    className="p-3 border rounded-2xl w-full mt-2"
                    placeholder="Enter details (Optional)"
                />
            </label>

            {/* Branch Image Upload */}
            <div className="mt-4">
                <label className="block mb-2 font-small">Branch Image</label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 bg-gray-50 hover:bg-gray-100 transition cursor-pointer">
                    {formData.branchImage ? (
                        <img
                            src={URL.createObjectURL(formData.branchImage)}
                            alt="Branch Preview"
                            className="w-32 h-32 object-cover rounded-xl mb-2"
                        />
                    ) : id && selectedBranch ? (
                        <img
                            src={resolveImageUrl(
                                selectedBranch.branchImage,
                                branchFallbackImage
                            )}
                            alt="Branch Preview"
                            className="w-32 h-32 object-cover rounded-xl mb-2"
                        />
                    ) : (
                        <PiUpload className="text-gray-600 text-4xl" />
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file)
                                setFormData((prev) => ({ ...prev, branchImage: file }));
                        }}
                        className="hidden"
                        id="branchImage"
                    />
                    <label
                        htmlFor="branchImage"
                        className="cursor-pointer text-sm text-blue-600 hover:text-blue-950"
                    >
                        {formData.branchImage ? "Change Image" : "Upload Image"}
                    </label>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-6">
                <button
                    onClick={handleCancel}
                    className="bg-white flex items-center gap-2 border px-4 py-2 rounded-2xl text-black hover:bg-gray-200"
                >
                    Cancel
                </button>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSaveDraft}
                        className="bg-white flex items-center gap-2 border px-4 py-2 rounded-2xl text-black hover:bg-gray-200"
                    >
                        Save Draft
                    </button>
                    <button
                        onClick={handleSaveBranch}
                        disabled={loading}
                        className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-2xl hover:bg-gray-900"
                    >
                        {loading ? "Saving..." : id ? "Update Branch" : "Save Branch"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddBranch;
