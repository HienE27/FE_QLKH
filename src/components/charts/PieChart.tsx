'use client';

interface PieChartProps {
    data: {
        label: string;
        value: number;
        color: string;
    }[];
    size?: number;
}

export default function PieChart({ data, size = 200 }: PieChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <p className="text-gray-400 text-sm">Không có dữ liệu</p>
            </div>
        );
    }

    let currentAngle = -90; // Start from top
    const radius = size / 2 - 10;
    const centerX = size / 2;
    const centerY = size / 2;

    const slices = data.map((item) => {
        const percentage = (item.value / total) * 100;
        const angle = (item.value / total) * 360;

        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;

        currentAngle = endAngle;

        // Calculate path for pie slice
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = centerX + radius * Math.cos(startRad);
        const y1 = centerY + radius * Math.sin(startRad);
        const x2 = centerX + radius * Math.cos(endRad);
        const y2 = centerY + radius * Math.sin(endRad);

        const largeArc = angle > 180 ? 1 : 0;

        const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
            'Z'
        ].join(' ');

        return {
            ...item,
            pathData,
            percentage: percentage.toFixed(1),
        };
    });

    return (
        <div className="flex flex-col items-center gap-4">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {slices.map((slice, index) => (
                    <g key={index}>
                        <path
                            d={slice.pathData}
                            fill={slice.color}
                            stroke="white"
                            strokeWidth="2"
                            className="transition-opacity hover:opacity-80 cursor-pointer"
                        />
                    </g>
                ))}
            </svg>

            <div className="flex flex-col gap-2 w-full">
                {slices.map((slice, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: slice.color }}
                            />
                            <span className="text-gray-700">{slice.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{slice.value}</span>
                            <span className="text-gray-500">({slice.percentage}%)</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
