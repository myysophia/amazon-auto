'use client';

import { useState, useCallback, useRef } from 'react';
import type { KeywordResult, FilterConditions } from '@/lib/types';

interface UseKeywordProcessorProps {
  keywords: string[];
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkConditions = useCallback(
    (
      searchResults: number | null,
      maxMonthSales: number | null,
      maxReviews: number | null,
      filters: FilterConditions
    ): boolean => {
      // 1. 搜索结果数必须符合条件
      if (searchResults === null || searchResults >= filters.maxSearchResults) {
        return false;
      }

      // 2. 月销和评论必须存在
      if (maxMonthSales === null || maxReviews === null) {
        return false;
      }

      // 3. 检查月销和评论的具体数值是否符合条件
      const salesOk = maxMonthSales > filters.minMonthSales;
      const reviewsOk = maxReviews < filters.maxReviews;

      return salesOk && reviewsOk;
    },
    []
  );

  const processKeyword = useCallback(
    async (
      keyword: string,
      zipCode: string,
      headless: boolean,
      filters: FilterConditions,
      signal: AbortSignal
    ): Promise<KeywordResult> => {
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ keyword, zipCode, headless, filters }),
          signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          const { searchResults, maxMonthSales, maxReviews } = data.data;
          const meetsConditions = checkConditions(
            searchResults,
            maxMonthSales,
            maxReviews,
            filters
          );

          return {
            keyword,
            searchResults,
            maxMonthSales,
            maxReviews,
            meetsConditions,
            duration: data.duration,
          };
        } else {
          return {
            keyword,
            searchResults: null,
            maxMonthSales: null,
            maxReviews: null,
            meetsConditions: false,
            error: data.error || '未知错误',
            duration: undefined,
          };
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw error;
        }
        return {
          keyword,
          searchResults: null,
          maxMonthSales: null,
          maxReviews: null,
          meetsConditions: false,
          error: error.message || '请求失败',
          duration: undefined,
        };
      }
    },
    [checkConditions]
  );

  const startProcessing = useCallback(
    async ({ keywords, zipCode, filters, headless, concurrency = 1 }: UseKeywordProcessorProps) => {
      if (keywords.length === 0) {
        return;
      }

      console.log(`\n🚀 开始批量搜索: ${keywords.length} 个关键词，并发数: ${concurrency}\n`);
      const batchStartTime = Date.now();

      setIsProcessing(true);
      setResults([]);
      setCurrentIndex(0);
      setCurrentKeyword('');

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const processedResults: KeywordResult[] = [];

      try {
        // 并发处理
        for (let i = 0; i < keywords.length; i += concurrency) {
          if (controller.signal.aborted) {
            break;
          }

          // 获取当前批次的关键词
          const batch = keywords.slice(i, i + concurrency);
          
          // 并发处理当前批次
          const batchPromises = batch.map((keyword, batchIndex) => {
            const globalIndex = i + batchIndex;
            setCurrentIndex(globalIndex + 1);
            setCurrentKeyword(keyword);

            return processKeyword(
              keyword,
              zipCode,
              headless,
              filters,
              controller.signal
            );
          });

          // 等待当前批次完成
          const batchResults = await Promise.all(batchPromises);
          processedResults.push(...batchResults);
          setResults([...processedResults]);

          // 更新进度
          setCurrentIndex(Math.min(i + concurrency, keywords.length));

          // 批次之间添加延迟（除了最后一批）
          if (i + concurrency < keywords.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        // 输出总结
        const totalDuration = Date.now() - batchStartTime;
        const avgDuration = totalDuration / keywords.length;
        const successCount = processedResults.filter(r => !r.error).length;
        const meetsCount = processedResults.filter(r => r.meetsConditions).length;

        console.log('\n========== 批量搜索完成 ==========');
        console.log(`✓ 总关键词数: ${keywords.length}`);
        console.log(`✓ 成功: ${successCount} | 失败: ${keywords.length - successCount}`);
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

  const stopProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
      setCurrentKeyword('');
    }
  }, []);

  const reset = useCallback(() => {
    stopProcessing();
    setResults([]);
    setCurrentIndex(0);
    setCurrentKeyword('');
  }, [stopProcessing]);

  return {
    isProcessing,
    results,
    currentIndex,
    currentKeyword,
    startProcessing,
    stopProcessing,
    reset,
  };
}

