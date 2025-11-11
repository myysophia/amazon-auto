import { NextRequest, NextResponse } from 'next/server';
import { searchAmazonKeyword } from '@/lib/amazon-scraper';
import type { SearchRequest, SearchResponse } from '@/lib/types';
import { SEARCH_API_MAX_DURATION } from '@/lib/config';

export const maxDuration = SEARCH_API_MAX_DURATION; // 5 minutes timeout for API route

/**
 * POST /api/search
 * 搜索单个Amazon关键词
 */
export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const { keyword, zipCode, headless, filters } = body;

    // 验证输入
    if (!keyword) {
      return NextResponse.json(
        { success: false, error: '关键词不能为空' },
        { status: 400 }
      );
    }

    if (!filters) {
      return NextResponse.json(
        { success: false, error: '筛选条件不能为空' },
        { status: 400 }
      );
    }

    // 执行搜索
    const result = await searchAmazonKeyword(keyword, zipCode, filters, headless);

    // 检查是否有错误
    if (result.error) {
      return NextResponse.json({
        success: false,
        error: result.error,
      } as SearchResponse);
    }

    // 返回成功结果（保持 null 值，不转换为 0）
    return NextResponse.json({
      success: true,
      data: {
        searchResults: result.searchResults,
        maxMonthSales: result.maxMonthSales,
        maxReviews: result.maxReviews,
        duration: result.duration,
      },
    } as SearchResponse);

  } catch (error: any) {
    console.error('API搜索错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '服务器内部错误',
      } as SearchResponse,
      { status: 500 }
    );
  }
}
