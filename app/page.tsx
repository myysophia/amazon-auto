'use client';

import { useState, useEffect } from 'react';
import KeywordInput from '@/components/KeywordInput';
import FilterConfig from '@/components/FilterConfig';
import ExecutionConfig from '@/components/ExecutionConfig';
import ConcurrencyConfig from '@/components/ConcurrencyConfig';
import ProgressBar from '@/components/ProgressBar';
import ResultsTable from '@/components/ResultsTable';
import { useKeywordProcessor } from '@/hooks/useKeywordProcessor';
import type { FilterConditions } from '@/lib/types';
import Papa from 'papaparse';
import { Play, StopCircle, RotateCcw, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  // 状态管理
  const [keywordsText, setKeywordsText] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [zipCode, setZipCode] = useState('');
  const [headless, setHeadless] = useState(true);
  const [concurrency, setConcurrency] = useState(1);
  const [filters, setFilters] = useState<FilterConditions>({
    maxSearchResults: 500,
    minMonthSales: 500,
    maxReviews: 100,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 使用自定义Hook
  const {
    isProcessing,
    results,
    currentIndex,
    currentKeyword,
    startProcessing,
    stopProcessing,
    reset,
  } = useKeywordProcessor();

  // 验证输入（邮编可选，如果填写则必须是5位数字）
  const isValid = keywords.length > 0 && (zipCode === '' || zipCode.trim() === '' || (zipCode.length === 5 && /^\d{5}$/.test(zipCode)));

  // 处理关键词输入变化
  const handleKeywordsChange = (text: string, keywordList: string[]) => {
    setKeywordsText(text);
    setKeywords(keywordList);
    setHasUnsavedChanges(true);
  };

  // 开始处理
  const handleStart = async () => {
    if (!isValid) {
      alert('请输入有效的关键词，邮编为可选项（如填写必须是5位数字）');
      return;
    }

    setHasUnsavedChanges(false);
    await startProcessing({ keywords, zipCode, filters, headless, concurrency });
  };

  // 停止处理
  const handleStop = () => {
    stopProcessing();
  };

  // 重置
  const handleReset = () => {
    if (isProcessing) {
      stopProcessing();
    }
    reset();
    setKeywordsText('');
    setKeywords([]);
    setHasUnsavedChanges(false);
  };

  // 登出
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  // 导出CSV
  const handleExport = () => {
    if (results.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    // 筛选出符合条件的关键词
    const qualifiedKeywords = results
      .filter(r => r.meetsConditions)
      .map(r => ({
        '关键词': r.keyword,
        '搜索结果数': r.searchResults ?? 0,
        '最高月销量': r.maxMonthSales ?? 0,
        '最多评论数': r.maxReviews ?? 0,
        '耗时(秒)': r.duration ? (r.duration / 1000).toFixed(2) : '-',
      }));

    // 转换为CSV
    const csv = Papa.unparse(qualifiedKeywords);
    
    // 创建Blob并下载
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `amazon-keywords-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 警告未保存的更改
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && keywords.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, keywords.length]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 标题 */}
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Amazon关键词筛选工具
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              批量搜索Amazon关键词，自动筛选符合条件的关键词
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg
                       hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                       transition-colors duration-200 text-sm font-medium"
            aria-label="登出"
          >
            <LogOut size={18} />
            <span>登出</span>
          </button>
        </header>

        {/* 主要内容区域 */}
        <div className="space-y-6">
          {/* 输入表单卡片 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* 关键词输入 */}
            <KeywordInput
              value={keywordsText}
              onChange={handleKeywordsChange}
              disabled={isProcessing}
            />

            {/* 执行配置 */}
            <ExecutionConfig
              zipCode={zipCode}
              headless={headless}
              onZipCodeChange={setZipCode}
              onHeadlessChange={setHeadless}
              disabled={isProcessing}
            />

            {/* 并发配置 */}
            <ConcurrencyConfig
              concurrency={concurrency}
              onChange={setConcurrency}
              disabled={isProcessing}
            />

            {/* 筛选条件 */}
            <FilterConfig
              filters={filters}
              onChange={setFilters}
              disabled={isProcessing}
            />

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {!isProcessing ? (
                <>
                  <button
                    onClick={handleStart}
                    disabled={!isValid}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg
                               hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                               disabled:bg-gray-400 disabled:cursor-not-allowed
                               transition-colors duration-200 font-medium min-h-[44px]"
                    aria-label="开始搜索"
                  >
                    <Play size={20} />
                    <span>开始搜索</span>
                  </button>
                  {results.length > 0 && (
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg
                                 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                                 transition-colors duration-200 font-medium min-h-[44px]"
                      aria-label="重置"
                    >
                      <RotateCcw size={20} />
                      <span>重置</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg
                             hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                             transition-colors duration-200 font-medium min-h-[44px]"
                  aria-label="停止搜索"
                >
                  <StopCircle size={20} />
                  <span>停止搜索</span>
                </button>
              )}
            </div>
          </div>

          {/* 进度显示 */}
          {(isProcessing || results.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <ProgressBar
                current={currentIndex}
                total={keywords.length}
                currentKeyword={currentKeyword}
              />
            </div>
          )}

          {/* 结果表格 */}
          {results.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <ResultsTable results={results} onExport={handleExport} />
            </div>
          )}
        </div>

        {/* 页脚 */}
        <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p> 数据来源于Amazon.com</p>
        </footer>
      </div>
    </main>
  );
}

