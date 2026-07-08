import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createTeacher } from "../../../../redux/Intructor/teacherSlice";
import BackButton from "../../../../components/BackButton";

const getTodayDateString = () => {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
};

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  mobileNo: "",
  gender: "female",
  readLanguage: "",
  speakLanguage: "",
  currentState: "",
  currentCity: "",
  currentAddress: "",
  areaOfExpertise: "",
  yearOfExperience: "",
  highestQualification: "",
  currentCTC: "",
  expectedCTC: "",
  noticePeriod: getTodayDateString(),
  availability: "Flexible",
  mode: "online",
  specialization: "",
  employeeUnit: "DSM",
};

const AddInstructorForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.teachers);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "mobileNo" ? value.replace(/\D/g, "").slice(0, 10) : value,
    }));
  };

  const validateForm = () => {
    const requiredFields = [
      ["First name", formData.firstName],
      ["Last name", formData.lastName],
      ["Email", formData.email],
      ["Mobile number", formData.mobileNo],
      ["Read language", formData.readLanguage],
      ["Speak language", formData.speakLanguage],
      ["State", formData.currentState],
      ["City", formData.currentCity],
      ["Address", formData.currentAddress],
      ["Area of expertise", formData.areaOfExpertise],
      ["Years of experience", formData.yearOfExperience],
      ["Highest qualification", formData.highestQualification],
      ["Current CTC", formData.currentCTC],
      ["Expected CTC", formData.expectedCTC],
      ["When will you Join", formData.noticePeriod],
    ];

    const missing = requiredFields.find(([, value]) => !String(value || "").trim());
    if (missing) {
      toast.error(`${missing[0]} is required`);
      return false;
    }

    if (!/^\d{10}$/.test(formData.mobileNo)) {
      toast.error("Mobile number must be 10 digits");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error("Enter a valid email address");
      return false;
    }

    if (Number(formData.yearOfExperience) < 0) {
      toast.error("Years of experience cannot be negative");
      return false;
    }

    if (formData.noticePeriod < getTodayDateString()) {
      toast.error("Join date cannot be in the past");
      return false;
    }

    return true;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    dispatch(
      createTeacher({
        ...formData,
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        currentState: formData.currentState.trim(),
        currentCity: formData.currentCity.trim(),
        currentAddress: formData.currentAddress.trim(),
        areaOfExpertise: formData.areaOfExpertise.trim(),
        highestQualification: formData.highestQualification.trim(),
        currentCTC: formData.currentCTC.trim(),
        expectedCTC: formData.expectedCTC.trim(),
        specialization: formData.specialization.trim(),
        employeePrefix: `${formData.employeeUnit}T`,
      })
    )
      .unwrap()
      .then((res) => {
        const employeeId = res?.data?.employeeId;
        toast.success(
          employeeId
            ? `Instructor created (${employeeId}). Credentials have been emailed.`
            : "Instructor created. Credentials have been emailed."
        );
        navigate("/admin/instructor-management", { replace: true });
      })
      .catch((error) => {
        toast.error(error || "Failed to create instructor");
      });
  };

  return (
    <div className="max-w-7xl mx-auto bg-gray-100 p-6 rounded-xl shadow">
      <BackButton className="mb-4" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Add Instructor</h2>
          <p className="text-sm text-gray-500 mt-1">
            This creates the instructor directly and emails login credentials.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border">
          <h3 className="font-semibold mb-4 text-lg">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter first name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter last name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mode</label>
              <select
                name="mode"
                value={formData.mode}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="hybrid">Hybrid (Online + Offline)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Employee Unit</label>
              <select
                name="employeeUnit"
                value={formData.employeeUnit}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="DSM">DSM</option>
                <option value="DSD">DSD</option>
                <option value="DCC">DCC</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                The employee ID (e.g. {formData.employeeUnit}T001) is generated from this unit.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border">
          <h3 className="font-semibold mb-4 text-lg">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter email address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mobile Number</label>
              <input
                type="tel"
                name="mobileNo"
                value={formData.mobileNo}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter 10-digit mobile number"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Read Languages
              </label>
              <input
                type="text"
                name="readLanguage"
                value={formData.readLanguage}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="English, Hindi"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Speak Languages
              </label>
              <input
                type="text"
                name="speakLanguage"
                value={formData.speakLanguage}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="English, Hindi"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <input
                type="text"
                name="currentState"
                value={formData.currentState}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter state"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input
                type="text"
                name="currentCity"
                value={formData.currentCity}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter city"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Address</label>
              <textarea
                name="currentAddress"
                value={formData.currentAddress}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black min-h-28"
                placeholder="Enter full address"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border">
          <h3 className="font-semibold mb-4 text-lg">Professional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Area of Expertise
              </label>
              <input
                type="text"
                name="areaOfExpertise"
                value={formData.areaOfExpertise}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Carnatic Music"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Highest Qualification
              </label>
              <input
                type="text"
                name="highestQualification"
                value={formData.highestQualification}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter qualification"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Years of Experience
              </label>
              <input
                type="number"
                min="0"
                name="yearOfExperience"
                value={formData.yearOfExperience}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter years of experience"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Specialization</label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Optional specialization"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Current CTC</label>
              <input
                type="text"
                name="currentCTC"
                value={formData.currentCTC}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter current CTC"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Expected CTC</label>
              <input
                type="text"
                name="expectedCTC"
                value={formData.expectedCTC}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter expected CTC"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                When will you Join
              </label>
              <input
                type="date"
                name="noticePeriod"
                value={formData.noticePeriod}
                onChange={handleChange}
                min={getTodayDateString()}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Availability</label>
              <select
                name="availability"
                value={formData.availability}
                onChange={handleChange}
                className="w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="Flexible">Flexible</option>
                <option value="Week Days">Week Days</option>
                <option value="Weekends Only">Weekends Only</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/instructor-management")}
            className="px-5 py-3 rounded-2xl border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 rounded-2xl bg-black text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Create Instructor"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddInstructorForm;
