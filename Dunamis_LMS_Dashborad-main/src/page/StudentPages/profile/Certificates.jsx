import React, { useState } from "react";

// DEMO DATA (swap for your backend as needed)
const certificates = [
  {
    id: "cert1",
    checked: false,
    title: "Keyboard Fundamentals",
    isMain: true,
    type: "Completion Certificate",
    recipient: "Akhil Joy",
    date: "24 Dec, 2024",
    desc: "Your tireless efforts and commitment to learning have set a high standard of excellence, and we are honored to recognize your achievement.",
    issuer: "DUNAMIS ONLINE LEARNING",
    course: "Keyboard Fundamentals",
  },
  {
    id: "cert2",
    checked: false,
    title: "Keyboard GRADE 1 Certificate TCL",
    isMain: false,
    link: "#",
    course: "Keyboard Fundamentals",
  },
];

export default function Certificates() {
  const [certs, setCerts] = useState(certificates);
  const checked = certs.filter((c) => c.checked);
  const allChecked = checked.length === certs.length && certs.length > 0;

  // Handlers
  const toggleCheck = (id) =>
    setCerts((cs) =>
      cs.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c))
    );
  const checkAll = () =>
    setCerts((cs) => cs.map((c) => ({ ...c, checked: !allChecked })));

  const handleUpload = () =>
    alert("Show upload certificate modal (not implemented)");
  const handleDownload = () =>
    alert("Download certificate(s) (not implemented)");

  return (
    <div
      className="w-full max-w-6xl mx-auto pt-2 px-4 sm:px-6 md:px-8"
      style={{ fontFamily: "'Open Sans', sans-serif" }}
    >
      {/* Header/action bar */}
      <div className="flex flex-wrap justify-between items-center my-2 mb-4 gap-y-2">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={checkAll}
            className="accent-[#6348c1] w-5 h-5"
          />
        </div>
        <div className="flex gap-2">
          <button
            className="border border-[#d9d9d9] rounded-full px-4 py-2 text-black bg-white hover:bg-[#f5f6fb] transition text-[14px] font-normal"
            onClick={handleUpload}
            style={{
              fontFamily: "'Open Sans', sans-serif",
              fontWeight: 400,
              fontSize: 14,
              lineHeight: "100%",
              letterSpacing: 0,
            }}
          >
            <span className="inline-flex items-center gap-2">
              <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
                <path
                  d="M10 4v12m0 0-4-4m4 4 4-4"
                  stroke="#1a1a1a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Upload Certificate
            </span>
          </button>
          <button
            className={`border rounded-full px-4 py-2 text-[#b0b0b0] bg-[#fafafb] transition text-[14px] font-normal ${
              checked.length
                ? "border-[#dadada] text-black bg-white cursor-pointer"
                : "border-[#dadada] cursor-not-allowed"
            }`}
            onClick={handleDownload}
            style={{
              fontFamily: "'Open Sans', sans-serif",
              fontWeight: 400,
              fontSize: 14,
              lineHeight: "100%",
              letterSpacing: 0,
            }}
            disabled={!checked.length}
          >
            <span className="inline-flex items-center gap-2">
              <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
                <path
                  d="M16 6v6.175a2.75 2.75 0 0 1-.78 1.927l-1.118 1.118A2.75 2.75 0 0 1 12.175 16H7.825a2.75 2.75 0 0 1-1.927-.78l-1.118-1.118A2.75 2.75 0 0 1 4 12.175V6"
                  stroke={checked.length ? "#000" : "#b0b0b0"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.333 10.833 10 12.5l1.667-1.667M10 12.5V7"
                  stroke={checked.length ? "#000" : "#b0b0b0"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Download Certificate
            </span>
          </button>
        </div>
      </div>

      {/* Certificates List */}
      <div className="flex flex-col gap-3">
        {certs.map((cert) => (
          <div key={cert.id} className="w-full">
            <div className="flex flex-col gap-2">
              <div className="flex items-center mb-1">
                <input
                  type="checkbox"
                  checked={cert.checked}
                  onChange={() => toggleCheck(cert.id)}
                  className="accent-[#6348c1] w-5 h-5 mr-2"
                />
                <span
                  className="text-black"
                  style={{
                    fontFamily: "'Open Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: 16,
                    lineHeight: "100%",
                    letterSpacing: 0,
                  }}
                >
                  {cert.title}
                </span>
              </div>
              {cert.isMain ? (
                <div
                  className="rounded-2xl border border-[#fbeec9] bg-[#FFF7E4] px-4 sm:px-10 py-6 mb-2 flex flex-col gap-2"
                  style={{
                    boxShadow: "0 2px 6.8px 0 #f7dcc440",
                    fontFamily: "'Open Sans', sans-serif",
                  }}
                >
                  <div className="flex items-center justify-center mb-2">
                    <span className="inline-flex items-center justify-center w-8 h-8">
                      <svg
                        width="32"
                        height="32"
                        fill="none"
                        viewBox="0 0 32 32"
                      >
                        <circle cx="16" cy="16" r="16" fill="#FEF2E3" />
                        <path
                          d="M16 6C14.3431 6 13 7.34315 13 9V13.3022C13 14.8688 12.0725 16.292 10.642 16.9291L9.49764 17.4413C8.57788 17.8563 8 18.774 8 19.7808C8 20.8515 8.84865 21.75 9.90099 21.75H22.099C23.1513 21.75 24 20.8515 24 19.7808C24 18.774 23.4221 17.8563 22.5024 17.4413L21.358 16.9291C19.9275 16.292 19 14.8688 19 13.3022V9C19 7.34315 17.6569 6 16 6Z"
                          stroke="#F0BA57"
                          strokeWidth="1.5"
                          fill="#F9E5C7"
                        />
                        <path
                          d="M13 24H19"
                          stroke="#FDD072"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </div>
                  <div
                    className="text-center"
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: 24,
                      lineHeight: "100%",
                      letterSpacing: 0,
                      color: "#000000",
                    }}
                  >
                    Completion Certificate
                  </div>
                  <div
                    className="text-center px-2 sm:px-10"
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontWeight: 400,
                      fontSize: 14,
                      lineHeight: "150%",
                      letterSpacing: 0,
                      color: "#222222",
                    }}
                  >
                    This certificate is awarded to Mr. {cert.recipient} for the
                    completion of <b>{cert.course}</b> on {cert.date}.{" "}
                    {cert.desc}
                  </div>
                  <div
                    className="text-center mt-1"
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#B8986F",
                      letterSpacing: 0,
                    }}
                  >
                    {cert.issuer}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#dadada] bg-[#fcfcfe] px-4 sm:px-10 py-6 mb-2 flex flex-col gap-2">
                  <div
                    className="text-black"
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: 19,
                      lineHeight: "100%",
                      letterSpacing: 0,
                    }}
                  >
                    {cert.course}
                  </div>
                  <a
                    href={cert.link}
                    className="underline text-black/70 w-fit"
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontWeight: 400,
                      fontSize: 14,
                      lineHeight: "100%",
                      letterSpacing: 0,
                    }}
                  >
                    View Certificate here
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
