import { searchAmazonKeyword } from './amazon-scraper';
import type { FilterConditions, KeywordResult } from './types';
import { DEFAULT_RETRY_DELAYS, meetsFilterConditions, sleep } from './keyword-utils';

export interface BatchRoundOptions {
  keywords: string[];
  zipCode: string;
  filters: FilterConditions;
  headless: boolean;
  concurrency: number;
  retryDelays?: number[];
  onProgress?: (payload: { keyword: string; index: number; total: number }) => void;
}

export interface BatchRunnerOptions extends BatchRoundOptions {
  maxRetryRounds?: number;
  onRoundStart?: (payload: { round: number; keywords: string[] }) => void;
  onRoundComplete?: (payload: { round: number; results: KeywordResult[] }) => void;
}

const runSingleKeyword = async (
  keyword: string,
  options: Omit<BatchRoundOptions, 'keywords' | 'concurrency' | 'onProgress'>
): Promise<KeywordResult> => {
  const { zipCode, filters, headless, retryDelays = DEFAULT_RETRY_DELAYS } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    try {
      const result = await searchAmazonKeyword(keyword, zipCode, filters, headless);
      if (result.error) {
        throw new Error(result.error);
      }

      const meetsConditions = meetsFilterConditions(
        result.searchResults,
        result.maxMonthSales,
        result.maxReviews,
        filters
      );

      return {
        keyword,
        searchResults: result.searchResults,
        maxMonthSales: result.maxMonthSales,
        maxReviews: result.maxReviews,
        meetsConditions,
        duration: result.duration,
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));
      const delay = retryDelays[attempt];

      if (!delay) {
        break;
      }

      console.warn(
        `关键词 "${keyword}" 执行失败（第${attempt + 1}次），${(delay / 1000).toFixed(
          0
        )} 秒后重试: ${lastError.message}`
      );
      await sleep(delay);
    }
  }

  return {
    keyword,
    searchResults: null,
    maxMonthSales: null,
    maxReviews: null,
    meetsConditions: false,
    error: lastError?.message || '未知错误',
  };
};

export async function runBatchRound({
  keywords,
  concurrency,
  onProgress,
  ...rest
}: BatchRoundOptions): Promise<KeywordResult[]> {
  const results: KeywordResult[] = [];

  for (let i = 0; i < keywords.length; i += concurrency) {
    const batch = keywords.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (keyword, batchIndex) => {
        const globalIndex = i + batchIndex + 1;
        onProgress?.({ keyword, index: globalIndex, total: keywords.length });
        return runSingleKeyword(keyword, rest);
      })
    );
    results.push(...batchResults);
  }

  return results;
}

export async function runBatchWithRetries({
  maxRetryRounds = 3,
  onRoundStart,
  onRoundComplete,
  ...options
}: BatchRunnerOptions): Promise<KeywordResult[]> {
  let aggregatedResults = await runBatchRound(options);
  onRoundComplete?.({ round: 1, results: aggregatedResults });

  for (let round = 2; round <= maxRetryRounds + 1; round++) {
    const errored = aggregatedResults.filter((item) => item.error);
    if (errored.length === 0) {
      break;
    }

    const retryKeywords = errored.map((item) => item.keyword);
    onRoundStart?.({ round, keywords: retryKeywords });

    const retryResults = await runBatchRound({
      ...options,
      keywords: retryKeywords,
    });

    aggregatedResults = aggregatedResults.map((item) => {
      const replacement = retryResults.find((retryItem) => retryItem.keyword === item.keyword);
      return replacement ?? item;
    });

    onRoundComplete?.({ round, results: aggregatedResults });
  }

  return aggregatedResults;
}
