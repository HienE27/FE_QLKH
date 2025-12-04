'use client';

import { useState } from 'react';

interface TimeFilterProps {
    defaultValue?: 'day' | 'week' | 'month' | 'year';
    onChange?: (value: 'day' | 'week' | 'month' | 'year') => void;
}

export default function TimeFilter({ defaultValue = 'day', onChange }: TimeFilterProps) {
    const [selected, setSelected] = useState(defaultValue);

    const handleChange = (value: 'day' | 'week' | 'month' | 'year') => {
        setSelected(value);
        onChange?.(value);
    };

    const buttonClass = (value: string) =>
        `px-5 py-2 text-base font-medium border transition-all duration-200 ${selected === value
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600 shadow-lg scale-105 z-10'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-blue-300'
        } ${value === 'day' ? 'rounded-l-lg' : value === 'year' ? 'rounded-r-lg' : ''} -ml-[1px] first:ml-0`;

    return (
        <div className="inline-flex shadow-md rounded-lg overflow-hidden">
            <button
                onClick={() => handleChange('day')}
                className={buttonClass('day')}
            >
                Ngày
            </button>
            <button
                onClick={() => handleChange('week')}
                className={buttonClass('week')}
            >
                Tuần
            </button>
            <button
                onClick={() => handleChange('month')}
                className={buttonClass('month')}
            >
                Tháng
            </button>
            <button
                onClick={() => handleChange('year')}
                className={buttonClass('year')}
            >
                Năm
            </button>
        </div>
    );
}
