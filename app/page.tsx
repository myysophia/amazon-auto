'use client';

import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import KeywordInput from '@/components/KeywordInput';
import FilterConfig from '@/components/FilterConfig';
import ExecutionConfig from '@/components/ExecutionConfig';
import ConcurrencyConfig from '@/components/ConcurrencyConfig';
import ProgressBar from '@/components/ProgressBar';
import ResultsTable from '@/components/ResultsTable';
import { useKeywordProcessor } from '@/hooks/useKeywordProcessor';
import type { FilterConditions, KeywordTask, SkippedKeywordTask } from '@/lib/types';
import Papa from 'papaparse';
import { Play, StopCircle, RotateCcw, LogOut, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import VersionBadge from '@/components/VersionBadge';

export default function Home() {
  const router = useRouter();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';
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
  const [skippedKeywords, setSkippedKeywords] = useState<SkippedKeywordTask[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 使用自定义Hook
  const {
    isProcessing,
    results,
    currentIndex,
    currentKeyword,
    progressTotal,
    startProcessing,
    retryErrorKeywords,
    stopProcessing,
    reset,
  } = useKeywordProcessor();
  const [isSending, setIsSending] = useState(false);

  // 验证输入（邮编可选，如果填写则必须是5位数字）
  const isValid = keywords.length > 0 && (zipCode === '' || zipCode.trim() === '' || (zipCode.length === 5 && /^\d{5}$/.test(zipCode)));

  // 处理关键词输入变化
  const handleKeywordsChange = (text: string, keywordList: string[]) => {
    setKeywordsText(text);
    setKeywords(keywordList);
    setHasUnsavedChanges(true);
    setSkippedKeywords([]);
  };

  // 开始处理
  const handleStart = async () => {
    if (!isValid) {
      alert('请输入有效的关键词，邮编为可选项（如填写必须是5位数字）');
      return;
    }

    setHasUnsavedChanges(false);
    try {
      const response = await fetch('/api/keywords/prepare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '准备关键词失败');
      }

      const payload = data.data as { tasks: KeywordTask[]; skipped: SkippedKeywordTask[] };
      const preparedTasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
      const skipped = Array.isArray(payload?.skipped) ? payload.skipped : [];
      setSkippedKeywords(skipped);

      if (preparedTasks.length === 0) {
        alert('近30天内已搜索过所有关键词，本次无需重复搜索');
        return;
      }

      await startProcessing({ tasks: preparedTasks, zipCode, filters, headless, concurrency });
    } catch (error: any) {
      console.error('准备关键词失败:', error);
      setSkippedKeywords([]);
      alert(error?.message || '准备关键词失败，请稍后重试');
    }
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
    setSkippedKeywords([]);
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

    // 导出所有关键词（包括符合和不符合条件的）
    const allKeywords = results.map(r => ({
      '关键词': r.keyword,
      '翻译': r.translation ?? '',
      '搜索结果数': r.searchResults ?? '-',
      '最高月销量': r.maxMonthSales ?? '-',
      '最多评论数': r.maxReviews ?? '-',
      '是否符合': r.meetsConditions ? '是' : '否',
      '耗时(秒)': r.duration ? (r.duration / 1000).toFixed(2) : '-',
      '错误信息': r.error || '',
    }));

    // 转换为CSV
    const csv = Papa.unparse(allKeywords);
    
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

  const handleSend = async () => {
    if (results.length === 0) {
      alert('没有可发送的数据');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ results }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '发送失败');
      }

      alert('已上传 OSS 并发送企微通知');
    } catch (error: any) {
      alert(`发送失败: ${error.message || '未知错误'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryErrors = () => {
    retryErrorKeywords({ zipCode, filters, headless });
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const parseCsvEntries = (text: string) => {
    const headerParsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const toStringValue = (value: unknown) => {
      if (value === undefined || value === null) {
        return '';
      }
      return String(value);
    };

    const hasHeader = Array.isArray(headerParsed.meta.fields)
      && headerParsed.meta.fields.some(field => field && String(field).trim().length > 0);

    let entries: Array<{ keyword: string; translation?: string }> = [];

    if (hasHeader) {
      const rawFields = (headerParsed.meta.fields ?? []).map(field => toStringValue(field));
      const normalized = rawFields.map(field => field.trim().toLowerCase());
      const keywordIndex = normalized.findIndex(field => ['keyword', 'keywords', '关键词'].includes(field));
      const translationIndex = normalized.findIndex(field => ['translation', '翻译'].includes(field));
      const resolvedKeywordIndex = keywordIndex >= 0 ? keywordIndex : 0;
      const resolvedTranslationIndex = translationIndex >= 0 ? translationIndex : (rawFields.length > 1 ? 1 : -1);

      const extractValue = (row: Record<string, unknown>, fieldName: string) => {
        if (fieldName in row) {
          return row[fieldName];
        }
        const trimmed = fieldName.trim();
        if (trimmed in row) {
          return row[trimmed];
        }
        return undefined;
      };

      entries = (headerParsed.data as Record<string, unknown>[]).map(row => {
        const keywordValue = extractValue(row, rawFields[resolvedKeywordIndex] ?? '');
        const translationField = resolvedTranslationIndex >= 0 ? rawFields[resolvedTranslationIndex] : undefined;
        const translationValue = translationField ? extractValue(row, translationField) : undefined;
        return {
          keyword: toStringValue(keywordValue),
          translation: translationValue !== undefined ? toStringValue(translationValue) : undefined,
        };
      });
    } else {
      const plainParsed = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
      entries = (plainParsed.data as string[][]).map(row => ({
        keyword: toStringValue(row[0]),
        translation: row.length > 1 ? toStringValue(row[1]) : undefined,
      }));
    }

    const seen = new Set<string>();
    return entries
      .map(entry => ({
        keyword: entry.keyword.trim(),
        translation: entry.translation?.trim(),
      }))
      .filter(entry => {
        if (!entry.keyword) {
          return false;
        }
        if (seen.has(entry.keyword)) {
          return false;
        }
        seen.add(entry.keyword);
        return true;
      });
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const entries = parseCsvEntries(text);

      if (entries.length === 0) {
        throw new Error('CSV 中没有有效的关键词');
      }

      const response = await fetch('/api/keywords/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: entries.map(entry => ({
            keyword: entry.keyword,
            translation: entry.translation ?? null,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '导入失败');
      }

      const summary = data.data as { total: number; inserted: number; updated: number; unchanged: number };

      setKeywordsText(entries.map(entry => entry.keyword).join('\n'));
      setKeywords(entries.map(entry => entry.keyword));
      setHasUnsavedChanges(true);
      setSkippedKeywords([]);

      alert(
        `导入完成，共 ${summary?.total ?? entries.length} 条，新增 ${summary?.inserted ?? 0} 条，更新 ${summary?.updated ?? 0} 条，未变化 ${summary?.unchanged ?? 0} 条。`
      );
    } catch (error: any) {
      console.error('导入关键词失败:', error);
      alert(error?.message || '导入失败，请检查 CSV 格式');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const skippedPreview = skippedKeywords.slice(0, 10);
  const skippedRemainder = skippedKeywords.length - skippedPreview.length;

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
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-gray-600 dark:text-gray-400">
                批量搜索Amazon关键词，自动筛选符合条件的关键词
              </p>
              <VersionBadge version={appVersion} />
            </div>
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
              actions={(
                <>
                  <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileImport}
                  />
                  <button
                    onClick={handleImportButtonClick}
                    disabled={isProcessing || isImporting}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-500/10"
                  >
                    {isImporting ? '导入中…' : '导入CSV'}
                  </button>
                </>
              )}
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
                  {results.length > 0 && (
                    <button
                      onClick={handleSend}
                      disabled={isSending}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg
                                 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                                 transition-colors duration-200 font-medium min-h-[44px]"
                      aria-label="一键发送"
                    >
                      <Share2 size={20} />
                      <span>{isSending ? '发送中...' : '一键发送'}</span>
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

          {skippedKeywords.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-100 rounded-xl p-4">
              <p className="text-sm font-medium">
                已自动跳过近30天内搜索过的 {skippedKeywords.length} 个关键词：
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {skippedPreview.map(item => (
                  <li key={`${item.keyword}-${item.lastSearchedAt}`} className="flex flex-wrap gap-2">
                    <span className="font-medium">
                      {item.translation ? `${item.keyword}（${item.translation}）` : item.keyword}
                    </span>
                    <span className="text-xs text-amber-700 dark:text-amber-200">
                      上次搜索：{new Date(item.lastSearchedAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
              {skippedRemainder > 0 && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
                  另外 {skippedRemainder} 个关键词已省略显示
                </p>
              )}
            </div>
          )}

          {/* 进度显示 */}
          {(isProcessing || results.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <ProgressBar
                current={currentIndex}
                total={progressTotal || keywords.length}
                currentKeyword={currentKeyword}
              />
            </div>
          )}

          {/* 结果表格 */}
          {results.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <ResultsTable
                results={results}
                onExport={handleExport}
                onRetryErrors={handleRetryErrors}
                isProcessing={isProcessing}
              />
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
