'use client';

interface ExecutionConfigProps {
  zipCode: string;
  headless: boolean;
  onZipCodeChange: (zipCode: string) => void;
  onHeadlessChange: (headless: boolean) => void;
  disabled?: boolean;
}

export default function ExecutionConfig({
  zipCode,
  headless,
  onZipCodeChange,
  onHeadlessChange,
  disabled = false,
}: ExecutionConfigProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">执行配置</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 邮编输入 */}
        <div className="space-y-2">
          <label htmlFor="zipCode" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            美国邮编（可选）
          </label>
          <input
            type="text"
            id="zipCode"
            name="zipCode"
            value={zipCode}
            onChange={(e) => onZipCodeChange(e.target.value.trim())}
            disabled={disabled}
            placeholder="12345（可留空）"
            maxLength={5}
            pattern="\d{5}"
            className="w-full px-4 py-2 text-base border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:bg-gray-100 disabled:cursor-not-allowed
                       dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            style={{ fontSize: '16px' }}
            autoComplete="postal-code"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            可选项。如填写需为5位数字邮编，例如：12345。留空则跳过邮编设置。
          </p>
        </div>

        {/* 运行模式选择 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            浏览器模式
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="radio"
                name="headless"
                checked={headless}
                onChange={() => onHeadlessChange(true)}
                disabled={disabled}
                className="w-4 h-4 text-blue-600 border-gray-300 
                           focus:ring-2 focus:ring-blue-500
                           disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600">
                无头模式（后台运行，更快）
              </span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="radio"
                name="headless"
                checked={!headless}
                onChange={() => onHeadlessChange(false)}
                disabled={disabled}
                className="w-4 h-4 text-blue-600 border-gray-300 
                           focus:ring-2 focus:ring-blue-500
                           disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600">
                有头模式（显示浏览器窗口，便于调试）
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

