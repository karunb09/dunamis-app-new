export function SectionSkeleton() {
  return (
    <div className="py-16 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-10 space-y-3">
        <div className="h-3 rounded-full w-28 mx-auto shimmer" />
        <div className="h-7 rounded-full w-56 mx-auto shimmer" />
        <div className="h-3 rounded-full w-80 mx-auto shimmer" />
      </div>
    </div>
  );
}

export function CardGridSkeleton() {
  return (
    <div className="py-16 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-10 space-y-3">
        <div className="h-3 rounded-full w-28 mx-auto shimmer" />
        <div className="h-7 rounded-full w-56 mx-auto shimmer" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="h-40 shimmer" />
            <div className="p-4 space-y-3">
              <div className="h-4 rounded-full w-3/4 shimmer" />
              <div className="h-3 rounded-full w-full shimmer" />
              <div className="h-3 rounded-full w-2/3 shimmer" />
              <div className="mt-4 h-9 rounded-2xl shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
