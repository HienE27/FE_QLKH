'use client';

type Props = {
  columns: number;
  rows?: number;
};

export function TableSkeleton({ columns, rows = 6 }: Props) {
  const cols = Array.from({ length: columns });
  const rs = Array.from({ length: rows });

  return (
    <div className="w-full border border-blue-gray-100 rounded-xl overflow-hidden bg-white">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-blue-gray-50 via-blue-gray-100/50 to-blue-gray-50 h-12 relative overflow-hidden">
        <div className="absolute inset-0 shimmer" />
        <div className="relative h-full flex items-center px-4">
          {cols.map((_, cIdx) => (
            <div
              key={cIdx}
              className="flex-1"
              style={{ animationDelay: `${cIdx * 0.1}s` }}
            >
              <div className="h-4 w-3/4 bg-blue-gray-200/60 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Rows Skeleton */}
      <div className="divide-y divide-blue-gray-100">
        {rs.map((_, rIdx) => (
          <div
            key={rIdx}
            className="grid bg-white hover:bg-blue-gray-50/30 transition-colors duration-200"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              animationDelay: `${rIdx * 0.05}s`,
            }}
          >
            {cols.map((_, cIdx) => (
              <div
                key={cIdx}
                className="px-4 py-4 relative overflow-hidden"
                style={{ animationDelay: `${(rIdx * columns + cIdx) * 0.05}s` }}
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 shimmer opacity-30" />
                
                {/* Content skeleton with varying widths */}
                <div className="relative z-10">
                  <div
                    className={`h-3 rounded-full bg-gradient-to-r from-blue-gray-100 via-blue-gray-200 to-blue-gray-100 ${
                      cIdx === 0 ? 'w-8' : cIdx === columns - 1 ? 'w-16' : 'w-3/4'
                    }`}
                    style={{
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .shimmer {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

