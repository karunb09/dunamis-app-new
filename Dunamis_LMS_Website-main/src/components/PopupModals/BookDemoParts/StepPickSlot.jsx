"use client";

import { useRef } from "react";
import { HiCheck, HiLocationMarker, HiPhone, HiVideoCamera } from "react-icons/hi";
import DateTimePicker from "./DateTimePicker";
import TeacherList from "./TeacherList";

const MODE_COPY = {
  online: { title: "Online", detail: "Video call from home", Icon: HiVideoCamera },
  offline: { title: "At a Dunamis centre", detail: "Come to a centre near you", Icon: HiLocationMarker },
};

const Question = ({ number, children }) => (
  <h3 className="mb-3 flex items-center gap-2.5 text-[17px] font-bold text-slate-900">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm text-white">
      {number}
    </span>
    {children}
  </h3>
);

// The next question only renders after the answer is saved, so read the ref
// a frame later.
const scrollIntoViewSoon = (ref) => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(() =>
    ref.current?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" })
  );
};

export default function StepPickSlot({
  loading,
  loadError,
  onRetry,
  notice,
  modes,
  deliveryMode,
  onSelectMode,
  cities,
  singleBranch,
  branchId,
  onSelectBranch,
  teachers,
  instructorId,
  onSelectTeacher,
  onWatch,
  days,
  selectedDay,
  onSelectDay,
  slotId,
  onSelectSlot,
  onRequestCallback,
}) {
  const branchRef = useRef(null);
  const teacherRef = useRef(null);
  const dayRef = useRef(null);
  const timeRef = useRef(null);

  if (loading) {
    return (
      <div aria-busy="true">
        <p className="mb-4 text-[15px] font-medium text-slate-700">Finding demo times…</p>
        <div className="space-y-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          ))}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {[0, 1, 2, 3].map((cell) => (
              <div key={cell} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
        <p className="text-[15px] font-semibold text-rose-800">We couldn&apos;t load demo times.</p>
        <p className="mt-1 text-sm text-rose-700">Please check your internet and try again.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 min-h-12 rounded-2xl bg-white px-6 text-[15px] font-semibold text-rose-800 ring-1 ring-rose-200 transition hover:bg-rose-100"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!modes.some((mode) => mode.hasSlots)) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center">
        <p className="text-[17px] font-bold text-slate-900">No demo times open right now</p>
        <p className="mt-1 text-[15px] text-slate-700">We can call you instead and find a time that suits you.</p>
        <button
          type="button"
          onClick={onRequestCallback}
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#CC3700] px-6 text-[15px] font-semibold text-white transition hover:bg-[#B83100] active:scale-[0.97]"
        >
          <HiPhone aria-hidden="true" />
          Request a call back
        </button>
      </div>
    );
  }

  const isOffline = deliveryMode === "offline";
  const showModes = modes.length > 1;
  const showBranches = isOffline && !singleBranch;
  const placeChosen = Boolean(deliveryMode) && (!isOffline || Boolean(branchId));
  const showTeachers = placeChosen;
  const showTimes = showTeachers && Boolean(instructorId) && days.size > 0;

  let number = 0;
  const next = () => {
    number += 1;
    return number;
  };

  return (
    <div className="space-y-8">
      {notice ? (
        <p role="alert" className="rounded-2xl bg-amber-50 px-4 py-3 text-[15px] font-medium text-amber-900 ring-1 ring-amber-200">
          {notice}
        </p>
      ) : null}

      {showModes ? (
        <section>
          <Question number={next()}>How would you like to learn?</Question>
          <div className="grid gap-3 sm:grid-cols-2">
            {modes.map(({ mode, hasSlots }) => {
              const copy = MODE_COPY[mode];
              const selected = deliveryMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={!hasSlots}
                  aria-pressed={selected}
                  onClick={() => {
                    onSelectMode(mode);
                    scrollIntoViewSoon(mode === "offline" && !singleBranch ? branchRef : teacherRef);
                  }}
                  className={`relative flex min-h-16 items-center gap-3 rounded-2xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected ? "border-[#FF6B35] bg-orange-50" : "border-slate-200 bg-white hover:border-orange-200"
                  }`}
                >
                  <copy.Icon aria-hidden="true" className="shrink-0 text-2xl text-[#CC3700]" />
                  <span>
                    <span className="block text-base font-semibold text-slate-900">{copy.title}</span>
                    <span className="block text-sm text-slate-600">
                      {hasSlots ? copy.detail : "No demo times right now"}
                    </span>
                  </span>
                  {selected ? (
                    <HiCheck aria-hidden="true" className="absolute right-3 top-3 text-lg text-[#CC3700]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {isOffline && singleBranch ? (
        <p className="flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-[15px] text-slate-800">
          <HiLocationMarker aria-hidden="true" className="mt-0.5 shrink-0 text-[#CC3700]" />
          <span>
            <span className="font-semibold">{singleBranch.label}</span>
            {singleBranch.city ? `, ${singleBranch.city}` : ""}
          </span>
        </p>
      ) : null}

      {showBranches ? (
        <section ref={branchRef} className="scroll-mt-4">
          <Question number={next()}>Which centre?</Question>
          <div className="space-y-4">
            {cities.map((city) => (
              <div key={city.name || "other"}>
                {cities.length > 1 && city.name ? (
                  <p className="mb-2 text-sm font-semibold text-slate-600">{city.name}</p>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  {city.branches.map((branch) => {
                    const selected = branch.id === branchId;
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        disabled={!branch.hasSlots}
                        aria-pressed={selected}
                        onClick={() => {
                          onSelectBranch(branch.id);
                          scrollIntoViewSoon(teacherRef);
                        }}
                        className={`relative min-h-14 rounded-2xl border-2 px-4 py-3 pr-10 text-left transition disabled:cursor-not-allowed disabled:bg-slate-50 ${
                          selected ? "border-[#FF6B35] bg-orange-50" : "border-slate-200 bg-white hover:border-orange-200"
                        }`}
                      >
                        <span className="block text-[15px] font-semibold text-slate-900">{branch.label}</span>
                        <span className="block text-sm text-slate-600">
                          {branch.hasSlots ? branch.location || city.name : "No demo times"}
                        </span>
                        {selected ? (
                          <HiCheck aria-hidden="true" className="absolute right-3 top-3 text-lg text-[#CC3700]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {showTeachers ? (
        <section ref={teacherRef} className="scroll-mt-4">
          <Question number={next()}>Choose your teacher</Question>
          <TeacherList
            teachers={teachers}
            selectedId={instructorId}
            onSelect={(id) => {
              onSelectTeacher(id);
              scrollIntoViewSoon(dayRef);
            }}
            onWatch={onWatch}
          />
        </section>
      ) : null}

      {showTimes ? (
        <DateTimePicker
          days={days}
          selectedDay={selectedDay}
          onSelectDay={(dayKey) => {
            onSelectDay(dayKey);
            scrollIntoViewSoon(timeRef);
          }}
          selectedSlotId={slotId}
          onSelectSlot={onSelectSlot}
          dayHeading={
            <div ref={dayRef} className="scroll-mt-4">
              <Question number={next()}>Pick a day</Question>
            </div>
          }
          timeHeading={
            <div ref={timeRef} className="scroll-mt-4">
              <Question number={next()}>Pick a time</Question>
            </div>
          }
        />
      ) : null}
    </div>
  );
}
