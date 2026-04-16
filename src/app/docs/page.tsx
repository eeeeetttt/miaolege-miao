import { Suspense } from 'react';

// 强制动态渲染，因为使用了 useSearchParams
export const dynamic = 'force-dynamic';

import DocsClient from './DocsClient';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            文档中心
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            快速了解平台功能，开始您的跟单之旅
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <Suspense fallback={
            <div className="flex items-center justify-center w-full h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          }>
            <DocsClient />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
