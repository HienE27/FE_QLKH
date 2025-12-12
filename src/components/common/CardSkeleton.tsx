'use client';

type Props = {
  count?: number;
};

export function CardSkeleton({ count = 1 }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-lg shadow-sm border border-blue-gray-200 p-6 animate-pulse"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <div className="h-4 bg-blue-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-blue-gray-200 rounded w-32" />
            </div>
            <div className="w-12 h-12 bg-blue-gray-200 rounded-full" />
          </div>
        </div>
      ))}
    </>
  );
}

