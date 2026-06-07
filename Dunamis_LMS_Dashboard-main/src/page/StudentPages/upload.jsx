import React, { useState } from "react";

export default function Upload() {
  const [url, setUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim() !== "") {
      setSubmitted(true);
    }
  };

  const handleResubmit = () => {
    setSubmitted(false);
  };

  return (
    <div className="flex justify-center items-center">
      <div className="w-full max-w-3xl border border-blue-300 rounded-md shadow-sm p-6">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-red-500 text-lg">📄</span>
            <h2 className="text-lg font-semibold text-gray-800">Assignment Due</h2>
          </div>
          <p className="text-gray-500 text-sm">11:59 PM, Today</p>
        </div>

        <div className="flex items-center space-x-2 mb-3">
          <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-md">🎵 Music</span>
        </div>

        <h3 className="text-2xl font-semibold text-gray-800 mb-1">
          Keyboard Fundamentals : Video Submission
        </h3>
        <p className="text-gray-600 mb-5">Assignment Details</p>
        <p className="text-gray-600 mb-5">
          Upload a YouTube, Drive or Vimeo Link and do not forget to give access to the link.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700 mb-1 font-medium">URL</label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=&t=2m30s"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-red-500 text-white px-6 py-2 rounded-full hover:bg-red-600 transition-all"
              >
                Submit
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="mb-6">
              <label className="block text-gray-700 mb-1 font-medium">URL</label>
              <input
                type="url"
                value={url}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSubmitted(false)}
                className="border border-gray-400 text-gray-800 px-6 py-2 rounded-full hover:bg-gray-100 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleResubmit}
                className="bg-gray-800 text-white px-6 py-2 rounded-full hover:bg-gray-900 transition-all"
              >
                Re-submit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
