import type { FilterConditions } from './types';

export const DEFAULT_RETRY_DELAYS = [3000, 6000, 10000]; // 失败后依次等待 3s、6s、10s

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * 判断搜索结果是否满足筛选条件
 */
export function meetsFilterConditions(
  searchResults: number | null,
  maxMonthSales: number | null,
  maxReviews: number | null,
  filters: FilterConditions
) {
  if (searchResults === null || searchResults >= filters.maxSearchResults) {
    return false;
  }

  if (maxMonthSales === null || maxReviews === null) {
    return false;
  }

  return maxMonthSales > filters.minMonthSales && maxReviews < filters.maxReviews;
}

