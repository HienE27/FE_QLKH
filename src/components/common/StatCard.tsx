import {
    ArrowUpTrayIcon,
    ArrowDownTrayIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/solid';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: 'document' | 'export' | 'import' | 'inventory';
    color?: 'blue' | 'teal' | 'green' | 'gray';
}

export default function StatCard({ title, value, icon, color = 'gray' }: StatCardProps) {
    const iconComponent = {
        document: <Squares2X2Icon className="w-6 h-6 text-white" />,
        export: <ArrowUpTrayIcon className="w-6 h-6 text-white" />,
        import: <ArrowDownTrayIcon className="w-6 h-6 text-white" />,
        inventory: <Squares2X2Icon className="w-6 h-6 text-white" />,
    };

    return (
        <div className="border border-blue-gray-100 shadow-sm rounded-xl overflow-hidden relative">
            <div
                className={`absolute grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${color === 'blue' ? 'from-blue-500 to-blue-600' :
                    color === 'teal' ? 'from-teal-500 to-teal-600' :
                        color === 'green' ? 'from-green-500 to-green-600' :
                            'from-blue-gray-500 to-blue-gray-600'
                    } shadow-lg shadow-blue-gray-500/40`}
                style={{ top: '1rem', left: '1rem' }}
            >
                {iconComponent[icon]}
            </div>
            <div className="p-4 text-right">
                <p className="font-normal text-sm text-blue-gray-600 mb-1">
                    {title}
                </p>
                <p className="text-2xl font-bold text-blue-gray-800">
                    {value}
                </p>
            </div>
        </div>
    );
}
