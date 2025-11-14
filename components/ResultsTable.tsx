'use client';

import { useState, useMemo } from 'react';
import { KeywordResult } from '@/lib/types';
import { Download, ArrowUpDown, RotateCcw } from 'lucide-react';

interface ResultsTableProps {
  results: KeywordResult[];
  onExport: () => void;
  onRetryErrors: () => void;
  isProcessing: boolean;
}

type SortField = 'keyword' | 'translation' | 'searchResults' | 'maxMonthSales' | 'maxReviews' | 'completedAt';
type SortDirection = 'asc' | 'desc';

const formatCompletedAt = (value?: string) => {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
};

export default function ResultsTable({ results, onExport, onRetryErrors, isProcessing }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('completedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterMeetsConditions, setFilterMeetsConditions] = useState<'all' | 'yes' | 'no'>('all');

  // 排序和筛选
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results;

    // 筛选
    if (filterMeetsConditions === 'yes') {
      filtered = results.filter(r => r.meetsConditions);
    } else if (filterMeetsConditions === 'no') {
      filtered = results.filter(r => !r.meetsConditions);
    }

    // 排序
    return [...filtered].sort((a, b) => {
      if (sortField === 'translation') {
        const aText = (a.translation ?? '').toString();
        const bText = (b.translation ?? '').toString();
        return sortDirection === 'asc'
          ? aText.localeCompare(bText)
          : bText.localeCompare(aText);
      }

      if (sortField === 'completedAt') {
        const aTime = a.completedAt ? Date.parse(a.completedAt) : -Infinity;
        const bTime = b.completedAt ? Date.parse(b.completedAt) : -Infinity;
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      }

      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // 处理null值
      if (aValue === null) aValue = -Infinity;
      if (bValue === null) bValue = -Infinity;

      if (typeof aValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [results, sortField, sortDirection, filterMeetsConditions]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const meetsConditionsCount = results.filter(r => r.meetsConditions).length;
  const hasErrors = useMemo(() => results.some(r => r.error), [results]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            搜索结果
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              总计: {results.length}
            </span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              符合条件: {meetsConditionsCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* 筛选器 */}
          <select
            value={filterMeetsConditions}
            onChange={(e) => setFilterMeetsConditions(e.target.value as any)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="all">全部结果</option>
            <option value="yes">仅符合条件</option>
            <option value="no">仅不符合条件</option>
          </select>

          <button
            onClick={onRetryErrors}
            disabled={!hasErrors || isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg
                       hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500
                       disabled:bg-gray-400 disabled:cursor-not-allowed
                       transition-colors duration-200"
            aria-label="重新搜索错误关键词"
          >
            <RotateCcw size={18} />
            <span className="text-sm font-medium">重搜错误关键词</span>
          </button>

          {/* 导出按钮 */}
          <button
            onClick={onExport}
            disabled={results.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg
                       hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500
                       disabled:bg-gray-400 disabled:cursor-not-allowed
                       transition-colors duration-200"
            aria-label="导出CSV"
          >
            <Download size={18} />
            <span className="text-sm font-medium">导出CSV</span>
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('keyword')}
              >
                <div className="flex items-center gap-2">
                  关键词
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('translation')}
              >
                <div className="flex items-center gap-2">
                  翻译
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('searchResults')}
              >
                <div className="flex items-center gap-2">
                  搜索结果数
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('maxMonthSales')}
              >
                <div className="flex items-center gap-2">
                  最高月销量
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('maxReviews')}
              >
                <div className="flex items-center gap-2">
                  最多评论数
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('completedAt')}
              >
                <div className="flex items-center gap-2">
                  完成时间
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                是否符合
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                耗时(秒)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedResults.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  暂无数据
                </td>
              </tr>
            ) : (
              filteredAndSortedResults.map((result, index) => (
                <tr
                  key={index}
                  className={`${
                    result.meetsConditions
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : ''
                  } hover:bg-gray-50 dark:hover:bg-gray-800`}
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                    {result.keyword}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {result.translation ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-variant-numeric tabular-nums">
                    {result.searchResults !== null ? result.searchResults.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 tabular-nums">
                    {result.maxMonthSales !== null ? result.maxMonthSales.toLocaleString() : '-'}
                  </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 tabular-nums">
                  {result.maxReviews !== null ? result.maxReviews.toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                  {formatCompletedAt(result.completedAt)}
                </td>
                  <td className="px-4 py-3">
                    {result.error ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        错误
                      </span>
                    ) : result.meetsConditions ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        符合
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        不符合
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 tabular-nums">
                    {result.duration ? (result.duration / 1000).toFixed(2) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
