'use client';

type Props = {
  columns: number;
  rows?: number;
};

export function TableSkeleton({ columns, rows = 6 }: Props) {
  const cols = Array.from({ length: columns });
  const rs = Array.from({ length: rows });

  return (
    <div className="w-full border border-blue-gray-100 rounded-xl overflow-hidden">
      <div className="bg-blue-gray-50 h-12" />
      <div className="divide-y divide-blue-gray-100">
        {rs.map((_, rIdx) => (
          <div key={rIdx} className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {cols.map((_, cIdx) => (
              <div
                key={cIdx}
                className="px-4 py-3 bg-white animate-pulse"
              >
                <div className="h-3 rounded-full bg-blue-gray-100" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

