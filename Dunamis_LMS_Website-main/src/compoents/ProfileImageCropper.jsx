"use client";

import { useEffect, useRef, useState } from "react";
import { FiCheck, FiMaximize2, FiX } from "react-icons/fi";

const OUTPUT_SIZE = 720;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const drawCroppedImage = async ({ source, canvas, zoom, offsetX, offsetY }) => {
  if (!canvas || !source) return null;

  const image = await loadImage(source);
  const context = canvas.getContext("2d");
  if (!context) return null;

  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const baseScale = Math.max(
    OUTPUT_SIZE / image.naturalWidth,
    OUTPUT_SIZE / image.naturalHeight
  );
  const scale = baseScale * zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const rawX = (OUTPUT_SIZE - drawWidth) / 2 + (offsetX / 100) * OUTPUT_SIZE;
  const rawY = (OUTPUT_SIZE - drawHeight) / 2 + (offsetY / 100) * OUTPUT_SIZE;
  const x = clamp(rawX, OUTPUT_SIZE - drawWidth, 0);
  const y = clamp(rawY, OUTPUT_SIZE - drawHeight, 0);

  context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.drawImage(image, x, y, drawWidth, drawHeight);

  return canvas;
};

export default function ProfileImageCropper({ file, onApply, onCancel }) {
  const previewCanvasRef = useRef(null);
  const outputCanvasRef = useRef(null);
  const [source, setSource] = useState("");
  const [zoom, setZoom] = useState(1.15);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(-8);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!file) return undefined;

    const objectUrl = URL.createObjectURL(file);
    setSource(objectUrl);
    setZoom(1.15);
    setOffsetX(0);
    setOffsetY(-8);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (!source) return;

    drawCroppedImage({
      source,
      canvas: previewCanvasRef.current,
      zoom,
      offsetX,
      offsetY,
    });
  }, [offsetX, offsetY, source, zoom]);

  if (!file) return null;

  const handleApply = async () => {
    setIsApplying(true);

    try {
      const canvas = await drawCroppedImage({
        source,
        canvas: outputCanvasRef.current,
        zoom,
        offsetX,
        offsetY,
      });

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsApplying(false);
            return;
          }

          const croppedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, "") + "-profile.jpg",
            { type: "image/jpeg" }
          );
          onApply(croppedFile, URL.createObjectURL(blob));
          setIsApplying(false);
        },
        "image/jpeg",
        0.92
      );
    } catch {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
              Face crop
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Frame your face for profile cards
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This crop keeps instructor faces visible across course cards,
              popups, and dashboards.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-slate-100 p-3 text-slate-500 transition hover:bg-slate-200"
            aria-label="Close cropper"
          >
            <FiX />
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[320px,1fr]">
          <div className="mx-auto w-full max-w-[320px]">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-100 p-3 shadow-inner">
              <canvas
                ref={previewCanvasRef}
                className="aspect-square w-full rounded-[1.25rem] bg-white object-cover"
              />
              <div className="pointer-events-none absolute inset-8 rounded-full border-2 border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.18)]" />
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <FiMaximize2 className="text-orange-500" />
                Crop controls
              </div>
              <label className="block text-sm font-medium text-slate-600">Zoom</label>
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 w-full accent-orange-500" />
              <label className="mt-4 block text-sm font-medium text-slate-600">Move left / right</label>
              <input type="range" min="-50" max="50" step="1" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} className="mt-2 w-full accent-orange-500" />
              <label className="mt-4 block text-sm font-medium text-slate-600">Move up / down</label>
              <input type="range" min="-50" max="50" step="1" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} className="mt-2 w-full accent-orange-500" />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onCancel} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Choose another image
              </button>
              <button type="button" onClick={handleApply} disabled={isApplying} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60">
                <FiCheck />
                {isApplying ? "Applying..." : "Use cropped photo"}
              </button>
            </div>
          </div>
        </div>

        <canvas ref={outputCanvasRef} className="hidden" />
      </div>
    </div>
  );
}
