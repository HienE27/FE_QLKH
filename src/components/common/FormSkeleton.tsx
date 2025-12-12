'use client';

type Props = {
  fields?: number;
};

export function FormSkeleton({ fields = 4 }: Props) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <div className="h-4 bg-blue-gray-200 rounded w-24 animate-pulse" />
          <div className="h-10 bg-blue-gray-200 rounded-lg w-full animate-pulse" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <div className="h-10 bg-blue-gray-200 rounded-lg w-24 animate-pulse" />
        <div className="h-10 bg-blue-gray-200 rounded-lg w-24 animate-pulse" />
      </div>
    </div>
  );
}

