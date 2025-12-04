interface StatCardProps {
    title: string;
    value: string | number;
    icon: 'document' | 'export' | 'import' | 'inventory';
    color?: 'teal' | 'teal-light';
}

export default function StatCard({ title, value, icon, color = 'teal' }: StatCardProps) {
    const bgGradient = color === 'teal'
        ? 'bg-gradient-to-br from-[#07b4a9] to-[#05a89e]'
        : 'bg-gradient-to-br from-[#05b6aa] to-[#04a89d]';

    return (
        <div className={`${bgGradient} rounded-xl p-5 flex items-center gap-5 shadow-lg hover:shadow-2xl transition-all duration-300 card-hover group h-[110px]`}>
            <div className="w-[90px] h-[90px] bg-white/95 backdrop-blur rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                {icon === 'document' && (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="drop-shadow">
                        <rect x="12" y="8" width="24" height="32" rx="2" fill="#07b4a9" />
                        <line x1="16" y1="16" x2="32" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        <line x1="16" y1="22" x2="32" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        <line x1="16" y1="28" x2="26" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                )}
                {icon === 'export' && (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="drop-shadow">
                        <path d="M24 12L24 30M24 12L18 18M24 12L30 18" stroke="#05b6aa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="12" y="28" width="24" height="8" rx="2" fill="#05b6aa" />
                    </svg>
                )}
                {icon === 'import' && (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="drop-shadow">
                        <path d="M24 30L24 12M24 30L18 24M24 30L30 24" stroke="#05b6aa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="12" y="28" width="24" height="8" rx="2" fill="#05b6aa" />
                    </svg>
                )}
                {icon === 'inventory' && (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="drop-shadow">
                        <rect x="10" y="12" width="28" height="24" rx="2" fill="#07b4a9" />
                        <rect x="15" y="17" width="6" height="6" rx="1" fill="white" />
                        <rect x="25" y="17" width="6" height="6" rx="1" fill="white" />
                        <rect x="15" y="26" width="6" height="6" rx="1" fill="white" />
                        <rect x="25" y="26" width="6" height="6" rx="1" fill="white" />
                    </svg>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white/90 text-sm mb-1.5 font-medium uppercase tracking-wide">{title}</p>
                <p className="text-white text-3xl font-bold drop-shadow-lg">{value}</p>
            </div>
        </div>
    );
}
