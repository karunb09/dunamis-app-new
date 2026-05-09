"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import StudentShell from "@/components/student/StudentShell";
import { getWebsiteToken } from "@/lib/authSession";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export default function StudentUploadPage() {
  const [assignmentId, setAssignmentId] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("Assignment Due");
  const [url, setUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAssignmentId(params.get("assignmentId") || "");
    setAssignmentTitle(params.get("title") || "Assignment Due");
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!assignmentId) {
      toast.error("Assignment ID is missing. Please open upload from Assignments.");
      return;
    }

    setSaving(true);
    try {
      const token = getWebsiteToken();
      const response = await fetch(`${BASE_URL}/v1/assignment/submit`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ assignmentId, submissionUrl: url }),
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to submit assignment.");
      }

      setSubmitted(true);
      toast.success(data.message || "Assignment submitted successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to submit assignment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <StudentShell
      title="Upload Assignment"
      description="Submit a YouTube, Drive, Vimeo, or accessible URL for your assignment."
    >
      <div className="flex items-center justify-center">
        <div className="w-full max-w-3xl rounded-md border border-blue-300 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg text-red-500">Document</span>
              <h2 className="text-lg font-semibold text-gray-800">Assignment Due</h2>
            </div>
            <p className="text-sm text-gray-500">11:59 PM, Today</p>
          </div>

          <div className="mb-3 flex items-center space-x-2">
            <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">Submission</span>
          </div>

          <h3 className="mb-1 text-2xl font-semibold text-gray-800">{assignmentTitle}</h3>
          <p className="mb-5 text-gray-600">Assignment Details</p>
          <p className="mb-5 text-gray-600">
            Upload a YouTube, Drive, or Vimeo link and make sure access is enabled for review.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="mb-1 block font-medium text-gray-700">URL</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className="w-full rounded-md border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-red-500 px-6 py-2 text-white transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="mb-6">
                <label className="mb-1 block font-medium text-gray-700">URL</label>
                <input
                  type="url"
                  value={url}
                  readOnly
                  className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 p-3 text-gray-600"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="rounded-full border border-gray-400 px-6 py-2 text-gray-800 transition-all hover:bg-gray-100"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="rounded-full bg-gray-800 px-6 py-2 text-white transition-all hover:bg-gray-900"
                >
                  Re-submit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </StudentShell>
  );
}
