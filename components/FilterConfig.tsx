'use client';

import { FilterConditions } from '@/lib/types';

interface FilterConfigProps {
  filters: FilterConditions;
  onChange: (filters: FilterConditions) => void;
  disabled?: boolean;
}

export default function FilterConfig({ filters, onChange, disabled = false }: FilterConfigProps) {
  const handleChange = (field: keyof FilterConditions, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange({
        ...filters,
        [field]: numValue,
      });
    } else if (value === '') {
      // 允许清空输入框，设置为0
      onChange({
        ...filters,
        [field]: 0,
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">筛选条件</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 搜索结果数上限 */}
        <div className="space-y-2">
          <label htmlFor="maxSearchResults" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            搜索结果数上限
          </label>
          <input
            type="number"
            id="maxSearchResults"
            name="maxSearchResults"
            value={filters.maxSearchResults}
            onChange={(e) => handleChange('maxSearchResults', e.target.value)}
            disabled={disabled}
            min="0"
            className="w-full px-4 py-2 text-base border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:bg-gray-100 disabled:cursor-not-allowed
                       dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            style={{ fontSize: '16px' }}
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            搜索结果数 &lt; 此值
          </p>
        </div>

        {/* 月销量下限 */}
        <div className="space-y-2">
          <label htmlFor="minMonthSales" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            月销量下限
          </label>
          <input
            type="number"
            id="minMonthSales"
            name="minMonthSales"
            value={filters.minMonthSales}
            onChange={(e) => handleChange('minMonthSales', e.target.value)}
            disabled={disabled}
            min="0"
            className="w-full px-4 py-2 text-base border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:bg-gray-100 disabled:cursor-not-allowed
                       dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            style={{ fontSize: '16px' }}
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            月销量 &gt; 此值
          </p>
        </div>

        {/* 评论数上限 */}
        <div className="space-y-2">
          <label htmlFor="maxReviews" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            评论数上限
          </label>
          <input
            type="number"
            id="maxReviews"
            name="maxReviews"
            value={filters.maxReviews}
            onChange={(e) => handleChange('maxReviews', e.target.value)}
            disabled={disabled}
            min="0"
            className="w-full px-4 py-2 text-base border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:bg-gray-100 disabled:cursor-not-allowed
                       dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            style={{ fontSize: '16px' }}
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            评论数 &lt; 此值
          </p>
        </div>
      </div>
    </div>
  );
}

