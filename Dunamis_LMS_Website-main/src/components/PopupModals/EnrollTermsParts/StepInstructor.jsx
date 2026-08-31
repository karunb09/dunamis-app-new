import { HiUser } from 'react-icons/hi';
import { getInitialsImage } from '@/lib/resolveImageUrl';

// EnrollTerms step 1 — instructor selection.
export default function StepInstructor({
  visibleInstructors,
  slotsStatus,
  selectedInstructorId,
  setSelectedInstructorId,
  setSelectedSlotId,
  selectedDeliveryMode,
  setVideoPreview,
  getVisibleSlotsForInstructor,
}) {
  return (
    <div className="mt-7 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <HiUser />
          Select Instructor
        </label>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {visibleInstructors.length} available
        </span>
      </div>

      {slotsStatus === 'loading' ? (
        <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          Loading instructors and class slots...
        </div>
      ) : visibleInstructors.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleInstructors.map((instructor) => {
            const isSelected = selectedInstructorId === instructor.id;
            const hasVideo = Boolean(instructor.profileVideo);

            return (
              <div
                key={instructor.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedInstructorId(instructor.id);
                  setSelectedSlotId('');
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  setSelectedInstructorId(instructor.id);
                  setSelectedSlotId('');
                }}
                className={`cursor-pointer rounded-3xl border p-4 transition ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30'
                }`}
              >
                <div className="flex gap-4">
                  <img
                    src={instructor.profilePicture || getInitialsImage(instructor.name)}
                    alt={instructor.name}
                    className="h-20 w-20 rounded-2xl object-cover object-top"
                    onError={(event) => {
                      event.currentTarget.src = getInitialsImage(instructor.name);
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          {instructor.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {instructor.averageRating
                            ? `${instructor.averageRating.toFixed(1)} rating`
                            : 'Course instructor'}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-gray-600 ring-1 ring-gray-200">
                        {instructor.mode || selectedDeliveryMode}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                        {getVisibleSlotsForInstructor(instructor).length} slots
                      </span>
                      {instructor.teachLanguages?.length > 0 && (
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
                          Teaches in {instructor.teachLanguages.join(', ')}
                        </span>
                      )}
                      {hasVideo ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setVideoPreview({
                              url: instructor.profileVideo,
                              title: `${instructor.name} demo video`,
                            });
                          }}
                          className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-gray-700"
                        >
                          Watch demo video
                        </button>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                          Demo video not uploaded yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          No instructors are currently available for this course and
          delivery mode.
        </div>
      )}
    </div>
  );
}
