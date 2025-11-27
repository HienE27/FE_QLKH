import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import AiAssistant from '@/components/ai/AiAssistant';
import AiFeaturePanels from '@/components/ai/AiFeaturePanels';

export default function AiPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-sky-50">
      <Header />
      <Sidebar />

      <main className="ml-[377px] mt-[113px] p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Trợ lý AI thông minh</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  Phân tích và gợi ý dựa trên dữ liệu thực tế
                </p>
              </div>
            </div>
          </div>

          {/* Advanced feature panels */}
          <AiFeaturePanels />

          {/* Chat Interface */}
          <AiAssistant />
        </div>
      </main>
    </div>
  );
}
