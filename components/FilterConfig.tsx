'use client';

import { useEffect, useState } from 'react';
import { FilterConditions } from '@/lib/types';

interface FilterConfigProps {
  filters: FilterConditions;
  onChange: (filters: FilterConditions) => void;
  disabled?: boolean;
}

type FilterField = keyof FilterConditions;

const toStringMap = (filters: FilterConditions): Record<FilterField, string> => ({
  maxSearchResults: String(filters.maxSearchResults ?? ''),
  minMonthSales: String(filters.minMonthSales ?? ''),
  maxReviews: String(filters.maxReviews ?? ''),
});

export default function FilterConfig({ filters, onChange, disabled = false }: FilterConfigProps) {
  const [localValues, setLocalValues] = useState<Record<FilterField, string>>(() =>
    toStringMap(filters)
  );

  useEffect(() => {
    setLocalValues(toStringMap(filters));
  }, [filters]);

  const handleChange = (field: FilterField, value: string) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    setLocalValues((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (value === '') {
      return;
    }

    const numValue = Number(value);
    if (!Number.isNaN(numValue)) {
      onChange({
        ...filters,
        [field]: numValue,
      });
    }
  };

  const handleBlur = (field: FilterField) => {
    if (localValues[field] !== '') {
      return;
    }

    setLocalValues((prev) => ({
      ...prev,
      [field]: '0',
    }));

    if (filters[field] !== 0) {
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
            value={localValues.maxSearchResults}
            onChange={(e) => handleChange('maxSearchResults', e.target.value)}
            onBlur={() => handleBlur('maxSearchResults')}
            disabled={disabled}
            min="0"
            inputMode="numeric"
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
            value={localValues.minMonthSales}
            onChange={(e) => handleChange('minMonthSales', e.target.value)}
            onBlur={() => handleBlur('minMonthSales')}
            disabled={disabled}
            min="0"
            inputMode="numeric"
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
            value={localValues.maxReviews}
            onChange={(e) => handleChange('maxReviews', e.target.value)}
            onBlur={() => handleBlur('maxReviews')}
            disabled={disabled}
            min="0"
            inputMode="numeric"
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
