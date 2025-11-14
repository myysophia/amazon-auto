'use client';

import { useState, useCallback, useRef } from 'react';
import type { KeywordResult, FilterConditions, KeywordTask } from '@/lib/types';
import { DEFAULT_RETRY_DELAYS, meetsFilterConditions, sleep } from '@/lib/keyword-utils';

interface UseKeywordProcessorProps {
  tasks: KeywordTask[];
  zipCode: string;
  filters: FilterConditions;
  headless: boolean;
  concurrency?: number;
}

export function useKeywordProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentKeyword, setCurrentKeyword] = useState<string>('');
  const [progressTotal, setProgressTotal] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const timestampResult = (result: Omit<KeywordResult, 'completedAt'>): KeywordResult => ({
    ...result,
    completedAt: new Date().toISOString(),
  });

  const sortByCompletedAtDesc = (entries: KeywordResult[]) =>
    entries.sort((a, b) => {
      const aTime = a.completedAt ? Date.parse(a.completedAt) : 0;
      const bTime = b.completedAt ? Date.parse(b.completedAt) : 0;
      return bTime - aTime;
    });

  const processKeyword = useCallback(
    async (
      task: KeywordTask,
      zipCode: string,
      headless: boolean,
      filters: FilterConditions,
      signal: AbortSignal
    ): Promise<KeywordResult> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= DEFAULT_RETRY_DELAYS.length; attempt++) {
        try {
          const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              keyword: task.keyword,
              keywordId: task.keywordId,
              translation: task.translation ?? null,
              zipCode,
              headless,
              filters,
            }),
            signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
          }

          const data = await response.json();

          if (!data.success || !data.data) {
            throw new Error(data.error || '服务器返回无效数据');
          }

          const { searchResults, maxMonthSales, maxReviews } = data.data;
          const meetsConditions = meetsFilterConditions(
            searchResults,
            maxMonthSales,
            maxReviews,
            filters
          );

          return timestampResult({
            keywordId: task.keywordId,
            keyword: task.keyword,
            translation: task.translation,
            searchResults,
            maxMonthSales,
            maxReviews,
            meetsConditions,
            duration: data.duration,
          });
        } catch (error: any) {
          if (error.name === 'AbortError') {
            throw error;
          }

          lastError = error instanceof Error ? error : new Error(String(error));

          const retryDelay = DEFAULT_RETRY_DELAYS[attempt];
          if (!retryDelay) {
            break;
          }

          console.warn(
            `关键词 "${task.keyword}" 请求失败（第${attempt + 1}次），将在 ${retryDelay / 1000
            } 秒后重试：${lastError.message}`
          );

          await sleep(retryDelay);
        }
      }

      return timestampResult({
        keywordId: task.keywordId,
        keyword: task.keyword,
        translation: task.translation,
        searchResults: null,
        maxMonthSales: null,
        maxReviews: null,
        meetsConditions: false,
        error: lastError?.message || '请求失败',
        duration: undefined,
      });
    },
    []
  );

  const startProcessing = useCallback(
    async ({ tasks, zipCode, filters, headless, concurrency = 1 }: UseKeywordProcessorProps) => {
      if (tasks.length === 0) {
        return;
      }

      console.log(`\n🚀 开始批量搜索: ${tasks.length} 个关键词，并发数: ${concurrency}\n`);
      const batchStartTime = Date.now();

      setIsProcessing(true);
      setResults([]);
      setCurrentIndex(0);
      setCurrentKeyword('');
      setProgressTotal(tasks.length);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const processedResults: KeywordResult[] = [];

      try {
        // 并发处理
        for (let i = 0; i < tasks.length; i += concurrency) {
          if (controller.signal.aborted) {
            break;
          }

          // 获取当前批次的关键词
          const batch = tasks.slice(i, i + concurrency);

          // 并发处理当前批次
          const batchPromises = batch.map((task, batchIndex) => {
            const globalIndex = i + batchIndex;
            setCurrentIndex(globalIndex + 1);
            setCurrentKeyword(task.keyword);

            return processKeyword(
              task,
              zipCode,
              headless,
              filters,
              controller.signal
            );
          });

          // 等待当前批次完成
          const batchResults = await Promise.all(batchPromises);
          processedResults.push(...batchResults);
          sortByCompletedAtDesc(processedResults);
          setResults([...processedResults]);

          // 更新进度
          setCurrentIndex(Math.min(i + concurrency, tasks.length));

          // 批次之间添加延迟（除了最后一批）
          if (i + concurrency < tasks.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        // 输出总结
        const totalDuration = Date.now() - batchStartTime;
        const avgDuration = totalDuration / tasks.length;
        const successCount = processedResults.filter(r => !r.error).length;
        const meetsCount = processedResults.filter(r => r.meetsConditions).length;

        console.log('\n========== 批量搜索完成 ==========');
        console.log(`✓ 总关键词数: ${tasks.length}`);
        console.log(`✓ 成功: ${successCount} | 失败: ${tasks.length - successCount}`);
        console.log(`✓ 符合条件: ${meetsCount}`);
        console.log(`✓ 总耗时: ${(totalDuration / 1000 / 60).toFixed(2)} 分钟`);
        console.log(`✓ 平均耗时: ${(avgDuration / 1000).toFixed(2)} 秒/个`);
        console.log(`=====================================\n`);

      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('处理关键词出错:', error);
        }
      } finally {
        setIsProcessing(false);
        setCurrentKeyword('');
        abortControllerRef.current = null;
      }
    },
    [processKeyword]
  );

  const retryErrorKeywords = useCallback(
    async ({ zipCode, filters, headless }: Pick<UseKeywordProcessorProps, 'zipCode' | 'filters' | 'headless'>) => {
      if (isProcessing) {
        console.warn('当前正在处理关键词，请稍后再试。');
        return;
      }

      const erroredEntries = results
        .map((result, index) => ({ result, index }))
        .filter(({ result }) => Boolean(result.error));

      if (erroredEntries.length === 0) {
        console.log('没有需要重新搜索的关键词。');
        return;
      }

      console.log(`\n🔄 开始重新搜索错误关键词: ${erroredEntries.length} 个\n`);

      setIsProcessing(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const updatedResults = [...results];
      let completed = 0;
      let aborted = false;

      try {
        setCurrentIndex(0);
        setProgressTotal(erroredEntries.length);

        for (const { result, index } of erroredEntries) {
          if (controller.signal.aborted) {
            aborted = true;
            break;
          }

          setCurrentKeyword(result.keyword);

          const retriedResult = await processKeyword(
            {
              keywordId: result.keywordId,
              keyword: result.keyword,
              translation: result.translation,
            },
            zipCode,
            headless,
            filters,
            controller.signal
          );

          updatedResults[index] = retriedResult;
          setResults(sortByCompletedAtDesc([...updatedResults]));
          completed += 1;
          setCurrentIndex(completed);
        }

        console.log('\n✅ 错误关键词重新搜索完成\n');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('重新搜索关键词出错:', error);
        }
      } finally {
        setIsProcessing(false);
        setCurrentKeyword('');
        abortControllerRef.current = null;
        if (!aborted) {
          const totalKeywords = updatedResults.length;
          setCurrentIndex(totalKeywords);
          setProgressTotal(totalKeywords);
        }
      }
    },
    [isProcessing, processKeyword, results]
  );

  const stopProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
      setCurrentKeyword('');
      abortControllerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopProcessing();
    setResults([]);
    setCurrentIndex(0);
    setCurrentKeyword('');
    setProgressTotal(0);
  }, [stopProcessing]);

  return {
    isProcessing,
    results,
    currentIndex,
    currentKeyword,
    progressTotal,
    startProcessing,
    retryErrorKeywords,
    stopProcessing,
    reset,
  };
}
