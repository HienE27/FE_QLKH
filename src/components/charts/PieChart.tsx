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
    // Filter out invalid data
    const validData = data.filter(item => item.value > 0 && !isNaN(item.value));
    const total = validData.reduce((sum, item) => sum + item.value, 0);

    if (total === 0 || validData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2" style={{ width: size, height: size }}>
                <p className="text-gray-400 text-sm font-medium">Không có dữ liệu</p>
                <p className="text-gray-300 text-xs">Vui lòng thử lại sau</p>
            </div>
        );
    }

    const radius = size / 2 - 10;
    const centerX = size / 2;
    const centerY = size / 2;

    // Special case: only one item (100%) - draw a full circle
    if (validData.length === 1) {
        const item = validData[0];
        return (
            <div className="flex flex-col items-center gap-4">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle
                        cx={centerX}
                        cy={centerY}
                        r={radius}
                        fill={item.color}
                        stroke="white"
                        strokeWidth="2"
                        className="transition-opacity hover:opacity-80 cursor-pointer"
                    />
                </svg>

                <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-gray-700">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{item.value}</span>
                            <span className="text-gray-500">(100.0%)</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    type Slice = {
        pathData: string;
        percentage: string;
        label: string;
        value: number;
        color: string;
    };

    const slices = validData.reduce<{ slices: Slice[]; currentAngle: number }>(
        (acc, item) => {
            const percentage = (item.value / total) * 100;
            let angle = (item.value / total) * 360;

            if (angle >= 359.99) {
                angle = 359.99;
            }

            const startAngle = acc.currentAngle;
            const endAngle = startAngle + angle;

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
                'Z',
            ].join(' ');

            acc.slices.push({
                ...item,
                pathData,
                percentage: percentage.toFixed(1),
            });

            acc.currentAngle = endAngle;
            return acc;
        },
        { currentAngle: -90, slices: [] },
    ).slices;

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
