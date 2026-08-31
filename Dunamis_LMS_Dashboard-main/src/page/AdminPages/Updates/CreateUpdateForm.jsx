import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import { FaUpload, FaSave, FaPaperPlane, FaTimes } from "react-icons/fa";
import { createNotice, sendNotice } from "../../../redux/AdminNotice/AdminNoticeSlice";
import BackButton from "../../../components/BackButton";

const CreateUpdateForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    targetUsers: "",
    specificUsers: [],
    notificationType: "",
    contentType: "",
    modeOfUpdate: "",
    attachments: [],
    recurrence: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "specificUsers") {
      const ids = value
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      setFormData((prev) => ({ ...prev, specificUsers: ids }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
    e.target.value = "";
  };

  const handleRemoveAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  };

  const validNotificationTypes = [
    "Banners",
    "Modal windows",
    "Notification bars",
  ];

  const validTargetUsers = ["All", "All Students", "All Admins", "Specific Users"];

  const validContentTypes = [
    "Informational",
    "Promotional",
    "Reminder",
    "Transactional",
    "Social",
    "Recurrent",
  ];

  const validModesOfUpdate = [
    "Email notification",
    "Dashboard notification",
    "Both",
  ];

  const handleSubmit = async (isDraft = false) => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Title and Message are required");
      return;
    }
    if (!validTargetUsers.includes(formData.targetUsers)) {
      toast.error("Please select a valid target users group");
      return;
    }
    if (formData.targetUsers === "Specific Users" && formData.specificUsers.length === 0) {
      toast.error("Please enter at least one specific user ID (comma separated)");
      return;
    }
    if (!validNotificationTypes.includes(formData.notificationType)) {
      toast.error("Please select a valid notification type");
      return;
    }
    if (!validContentTypes.includes(formData.contentType)) {
      toast.error("Please select a valid content type");
      return;
    }
    if (!validModesOfUpdate.includes(formData.modeOfUpdate)) {
      toast.error("Please select a valid mode of update");
      return;
    }

    try {
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("message", formData.message.trim());
      data.append("targetUsers", formData.targetUsers);
      data.append("notificationType", formData.notificationType);
      data.append("contentType", formData.contentType);
      data.append("modeOfUpdate", formData.modeOfUpdate);

      if (formData.contentType === "Recurrent" && formData.recurrence.trim()) {
        data.append("recurrence", formData.recurrence.trim());
      }

      if (formData.targetUsers === "Specific Users") {
        data.append("specificUsers", JSON.stringify(formData.specificUsers));
      }

      formData.attachments.forEach((file) => {
        data.append("attachments", file);
      });

      // Dispatch createNotice thunk
      const resultAction = await dispatch(createNotice(data));

      if (createNotice.fulfilled.match(resultAction)) {
        toast.success("Notice created successfully!");
        navigate("/admin/updates");
        const shouldSendEmail =
          formData.modeOfUpdate === "Both" ||
          formData.modeOfUpdate === "Email notification";

        const noticeId = resultAction.payload?.data?._id;

        if (shouldSendEmail && noticeId) {
          // Dispatch sendNotice to trigger email
          const sendResult = await dispatch(sendNotice(noticeId));

          if (sendNotice.fulfilled.match(sendResult)) {
            toast.success("Email notification sent successfully!");

            // Show warning if some emails failed
            if (sendResult.payload?.failedEmails?.length > 0) {
              toast.error(
                `Failed to send emails to ${sendResult.payload.failedEmails.length} user(s)`
              );
            }
          } else {
            toast.error(
              "Notice created but failed to send email: " +
              (sendResult.payload || "Unknown error")
            );
          }
        } else if (shouldSendEmail && !noticeId) {
          toast.error("Notice created but could not retrieve notice ID for sending email");
        }

        navigate("/admin/updates");
      } else {
        toast.error(resultAction.payload || "Failed to create notice");
      }
    } catch (error) {
      toast.error("Something went wrong: " + error.message);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <BackButton className="mb-4" />
      <h2 className="text-xl font-semibold mb-6">Create Update</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Title of the update"
            className="w-full border rounded-xl px-4 py-2"
          />
        </div>

        {/* Target Users */}
        <div>
          <label className="block text-sm mb-1">Target users</label>
          <select
            name="targetUsers"
            value={formData.targetUsers}
            onChange={handleChange}
            className="w-full border rounded-xl px-4 py-2"
          >
            <option value="">Select group</option>
            <option value="All">All</option>
            <option value="All Students">All Students</option>
            <option value="All Admins">All Admins</option>
            <option value="Specific Users">Specific Users</option>
          </select>
        </div>

        {/* Specific Users Input */}
        {formData.targetUsers === "Specific Users" && (
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">
              Specific User IDs (comma separated)
            </label>
            <input
              type="text"
              name="specificUsers"
              onChange={handleChange}
              placeholder="Enter user IDs separated by commas"
              className="w-full border rounded-xl px-4 py-2"
            />
          </div>
        )}

        {/* Message */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Message</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Write your message here..."
            rows="3"
            className="w-full border rounded-xl px-4 py-2"
          />
        </div>
        </div>

        {/* Notification Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Notification Type</label>
          <select
            name="notificationType"
            value={formData.notificationType}
            onChange={handleChange}
            className="w-full border rounded-xl px-4 py-2"
          >
            <option value="">Select type</option>
            <option value="Banners">Banners</option>
            <option value="Modal windows">Modal windows</option>
            <option value="Notification bars">Notification bars</option>
          </select>
        </div>

        {/* Content Type */}
        <div>
          <label className="block text-sm mb-1">Content Type</label>
          <select
            name="contentType"
            value={formData.contentType}
            onChange={handleChange}
            className="w-full border rounded-xl px-4 py-2"
          >
            <option value="">Select type</option>
            <option value="Informational">Informational</option>
            <option value="Promotional">Promotional</option>
            <option value="Reminder">Reminder</option>
            <option value="Transactional">Transactional</option>
            <option value="Social">Social</option>
            <option value="Recurrent">Recurrent</option>
          </select>
        </div>

        {/* Recurrence Duration */}
        {formData.contentType === "Recurrent" && (
          <div>
            <label className="block text-sm mb-1">Recurrence Duration</label>
            <input
              type="text"
              name="recurrence"
              value={formData.recurrence}
              onChange={handleChange}
              placeholder="e.g., Every 7 days"
              className="w-full border rounded-xl px-4 py-2"
            />
          </div>
        )}

        {/* Mode of Update */}
        <div>
          <label className="block text-sm mb-1">Mode of Update</label>
          <select
            name="modeOfUpdate"
            value={formData.modeOfUpdate}
            onChange={handleChange}
            className="w-full border rounded-xl px-4 py-2"
          >
            <option value="">Select mode</option>
            <option value="Email notification">Email notification</option>
            <option value="Dashboard notification">Dashboard notification</option>
            <option value="Both">Both</option>
          </select>
        </div>
        </div>

        {/* Upload Section */}
        <div
          className="md:col-span-2 border-dashed border-2 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 w-full mt-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <FaUpload className="text-2xl mb-2" />
          <p className="text-sm mb-2 text-center">
            Drag and drop images or documents here, or click to browse
          </p>
          <label className="cursor-pointer text-black bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">
            Upload
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Preview selected files */}
          {formData.attachments.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
              {formData.attachments.map((file, index) => {
                const isImage = file.type.startsWith("image/");
                return (
                  <div
                    key={index}
                    className="relative border rounded-lg p-2 flex flex-col items-center bg-gray-50"
                  >
                    {isImage && (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-24 h-24 object-cover rounded"
                      />
                    )}
                    {!isImage && (
                      <span className="text-xs truncate">{file.name}</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-red-100"
                    >
                      <FaTimes className="text-red-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
  

      {/* Buttons */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => navigate("/admin/updates")}
          className="px-6 py-2 border rounded-xl hover:bg-gray-100"
        >
          Cancel
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => handleSubmit(true)}
            className="flex items-center gap-2 px-6 py-2 border rounded-xl hover:bg-gray-100"
          >
            <FaSave /> Save Draft
          </button>
          <button
            onClick={() => handleSubmit(false)}
            className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-xl hover:bg-gray-700"
          >
            <FaPaperPlane /> Send Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateUpdateForm;
