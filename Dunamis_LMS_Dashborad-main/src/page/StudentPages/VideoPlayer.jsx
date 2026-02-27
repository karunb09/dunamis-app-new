import React, { useRef, useState, useEffect } from "react";

export default function VideoPopup({ videoUrl, onClose }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    setProgress(0);
    setIsPlaying(true);
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      const p = v.play?.();
      if (p?.catch) p.catch(() => setIsPlaying(false));
    }
  }, [videoUrl]);

  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handlePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? (v.play(), setIsPlaying(true)) : (v.pause(), setIsPlaying(false));
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  const handleSeek = (e) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    v.currentTime = (percent / 100) * v.duration;
    setProgress(percent);
  };

  const handleVolumeChange = (e) => {
    const v = videoRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    if (v) v.volume = percent;
    setVolume(percent);
  };

  if (!videoUrl || error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-[9999]" onClick={handleBackdrop}>
        <div
          className="bg-[#111] text-white p-6 rounded-xl shadow-2xl text-center w-[90%] sm:w-[480px]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-lg font-semibold mb-3">🎬 Video not available</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/50" onClick={handleBackdrop}>
      <div className="relative bg-gray-900 rounded-xl shadow-2xl p-2 w-[90%] max-w-[820px]">
        <div className="rounded-lg overflow-hidden aspect-video bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            autoPlay
            controls={false}
            onTimeUpdate={handleTimeUpdate}
            onClick={handlePlayPause}
            onError={() => setError(true)}
          />
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-2 bg-black/50 rounded-lg p-2">
<div
  className="w-full h-2 bg-white/20 rounded-full cursor-pointer"
  onClick={handleSeek}
>
  <div
    className="h-2 bg-white rounded-full transition-all"
    style={{ width: `${progress}%` }}
  />
</div>


          <div className="flex justify-between items-center text-white">
            <div className="flex gap-4 items-center">
              <button
                onClick={handlePlayPause}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V5m6 14V5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="white"
                    viewBox="0 0 24 24" className="w-5 h-5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <div
                className="relative w-32 h-2 bg-white/20 rounded-full cursor-pointer"
                onClick={handleVolumeChange}
              >
                <div
                  className="h-2 bg-white rounded-full transition-all"
                  style={{ width: `${volume * 100}%` }}
                />
              </div>
            </div>

            <button
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
