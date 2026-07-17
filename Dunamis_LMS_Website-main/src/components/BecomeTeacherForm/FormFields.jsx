"use client";

import { useEffect, useRef, useState } from "react";
import { FiCheckCircle, FiEdit2, FiTrash2, FiUploadCloud } from "react-icons/fi";

export const formatFileSize = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

// Streams the file once after selection so the user gets real "processing"
// feedback and unreadable files surface immediately instead of at submit.
function useFileReadProgress(file) {
  const [progress, setProgress] = useState(null);
  const lastPctRef = useRef(-1);

  useEffect(() => {
    if (!file) {
      setProgress(null);
      return;
    }

    let cancelled = false;
    lastPctRef.current = -1;
    setProgress({ pct: 0, status: "reading" });

    let reader;
    try {
      reader = file.stream().getReader();
    } catch {
      setProgress({ pct: 100, status: "done" });
      return;
    }

    let loaded = 0;
    const pump = () =>
      reader.read().then(({ done, value }) => {
        if (cancelled) return;
        if (done) {
          setProgress({ pct: 100, status: "done" });
          return;
        }
        loaded += value.byteLength;
        const pct = file.size
          ? Math.min(99, Math.round((loaded / file.size) * 100))
          : 99;
        if (pct !== lastPctRef.current) {
          lastPctRef.current = pct;
          setProgress({ pct, status: "reading" });
        }
        return pump();
      });

    pump().catch(() => {
      if (!cancelled) setProgress({ pct: 100, status: "done" });
    });

    return () => {
      cancelled = true;
      reader.cancel().catch(() => {});
    };
  }, [file]);

  return progress;
}

const baseInputClassName =
  "w-full border border-gray-200 rounded-2xl px-4 py-3 bg-white shadow-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

export function FieldGroup({ children, className = "" }) {
  return <div className={`space-y-2 ${className}`}>{children}</div>;
}

export function FieldLabel({ children, htmlFor, required = false }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
  );
}

export function FieldError({ error }) {
  if (!error) return null;

  return <p className="text-sm text-red-600">{error}</p>;
}

export function TextInput({
  id,
  label,
  required = false,
  error,
  className = "",
  ...props
}) {
  return (
    <FieldGroup className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <input
        id={id}
        className={`${baseInputClassName} ${error ? "border-red-300 ring-1 ring-red-200" : ""}`}
        {...props}
      />
      <FieldError error={error} />
    </FieldGroup>
  );
}

export function SelectInput({
  id,
  label,
  required = false,
  error,
  children,
  className = "",
  ...props
}) {
  return (
    <FieldGroup className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <select
        id={id}
        className={`${baseInputClassName} ${error ? "border-red-300 ring-1 ring-red-200" : ""}`}
        {...props}
      >
        {children}
      </select>
      <FieldError error={error} />
    </FieldGroup>
  );
}

export function TextareaInput({
  id,
  label,
  required = false,
  error,
  className = "",
  ...props
}) {
  return (
    <FieldGroup className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        className={`${baseInputClassName} min-h-28 resize-y rounded-2xl ${error ? "border-red-300 ring-1 ring-red-200" : ""}`}
        {...props}
      />
      <FieldError error={error} />
    </FieldGroup>
  );
}

export function FileUploadField({
  label,
  accept,
  helperText,
  file,
  error,
  setFile,
  inputRef,
  required = false,
}) {
  const readProgress = useFileReadProgress(file);
  const attached = file && readProgress?.status === "done";

  return (
    <FieldGroup>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div
        className={`border-2 border-dashed rounded-2xl p-4 text-center transition ${
          error
            ? "border-red-300 bg-red-50"
            : attached
              ? "border-green-300 bg-green-50/40"
              : "border-gray-200 hover:border-orange-300 bg-white"
        }`}
      >
        <input
          type="file"
          accept={accept}
          ref={inputRef}
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />

        {!file ? (
          <div className="space-y-2">
            <FiUploadCloud className="mx-auto text-2xl text-gray-400" />
            <button
              type="button"
              className="cursor-pointer text-sm font-semibold text-orange-600 hover:text-orange-700"
              onClick={() => inputRef.current?.click()}
            >
              Click to upload
            </button>
            {helperText ? <p className="text-xs text-gray-500">{helperText}</p> : null}
          </div>
        ) : (
          <div className="rounded-xl bg-white/70 p-3 text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="rounded-full p-2 text-blue-600 hover:bg-blue-50"
                  onClick={() => inputRef.current?.click()}
                  aria-label={`Edit ${label}`}
                >
                  <FiEdit2 />
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setFile(null);
                    if (inputRef.current) {
                      inputRef.current.value = "";
                    }
                  }}
                  aria-label={`Remove ${label}`}
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
            {readProgress?.status === "reading" ? (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-orange-500 transition-all duration-150"
                    style={{ width: `${readProgress.pct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Processing file… {readProgress.pct}%
                </p>
              </div>
            ) : (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-600">
                <FiCheckCircle className="shrink-0" />
                <span>Attached — will upload when you submit</span>
              </p>
            )}
          </div>
        )}
      </div>
      <FieldError error={error} />
    </FieldGroup>
  );
}

export { baseInputClassName };
