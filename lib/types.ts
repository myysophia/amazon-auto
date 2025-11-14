// 关键词搜索结果类型
export interface KeywordResult {
  keyword: string;
  searchResults: number | null; // 搜索结果总数
  maxMonthSales: number | null; // 最高月销量
  maxReviews: number | null; // 最多评论数
  meetsConditions: boolean; // 是否符合筛选条件
  error?: string; // 错误信息
  duration?: number; // 搜索耗时（毫秒）
  completedAt?: string; // 完成时间
}

// 筛选条件类型
export interface FilterConditions {
  maxSearchResults: number; // 搜索结果数上限
  minMonthSales: number; // 月销量下限
  maxReviews: number; // 评论数上限
}

// 搜索配置类型
export interface SearchConfig {
  keywords: string[]; // 关键词列表
  zipCode: string; // 邮编
  filters: FilterConditions; // 筛选条件
  headless: boolean; // 是否无头模式
  concurrency?: number; // 并发数，默认1（串行）
}

// API搜索请求类型
export interface SearchRequest {
  keyword: string;
  zipCode: string;
  headless: boolean;
  filters: FilterConditions;
}

// API搜索响应类型
export interface SearchResponse {
  success: boolean;
  data?: {
    searchResults: number | null;
    maxMonthSales: number | null;
    maxReviews: number | null;
    duration?: number;
  };
  error?: string;
}
