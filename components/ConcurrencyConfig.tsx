'use client';

interface ConcurrencyConfigProps {
  concurrency: number;
  onChange: (concurrency: number) => void;
  disabled?: boolean;
}

export default function ConcurrencyConfig({
  concurrency,
  onChange,
  disabled = false,
}: ConcurrencyConfigProps) {
  const handleChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 10) {
      onChange(num);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="concurrency" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        并发数
      </label>
      <input
        type="number"
        id="concurrency"
        name="concurrency"
        value={concurrency}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        min="1"
        max="10"
        className="w-full px-4 py-2 text-base border border-gray-300 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:bg-gray-100 disabled:cursor-not-allowed
                   dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        style={{ fontSize: '16px' }}
        autoComplete="off"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        同时搜索的关键词数量（1-10），建议值：1-3
      </p>
      <div className="text-xs space-y-1">
        <p className="text-gray-600 dark:text-gray-400">
          💡 <strong>并发数1（串行）</strong>：最稳定，避免被Amazon检测
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          ⚡ <strong>并发数2-3</strong>：速度较快，适度风险
        </p>
        <p className="text-yellow-600 dark:text-yellow-400">
          ⚠️ <strong>并发数&gt;3</strong>：速度最快，但可能被限制
        </p>
      </div>
    </div>
  );
}

