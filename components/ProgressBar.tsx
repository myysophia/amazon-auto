'use client';

interface ProgressBarProps {
  current: number;
  total: number;
  currentKeyword?: string;
}

export default function ProgressBar({ current, total, currentKeyword }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-2" role="status" aria-live="polite" aria-atomic="true">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          进度: {current} / {total}
        </span>
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {percentage}%
        </span>
      </div>
      
      {/* 进度条 */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* 当前处理的关键词 */}
      {currentKeyword && (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          正在处理: <span className="font-medium">{currentKeyword}</span>
        </p>
      )}
    </div>
  );
}

