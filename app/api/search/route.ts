import { NextRequest, NextResponse } from 'next/server';
import { searchAmazonKeyword } from '@/lib/amazon-scraper';
import { meetsFilterConditions } from '@/lib/keyword-utils';
import { recordSearchResult } from '@/lib/keyword-storage';
import type { RecordSearchResultInput, SearchRequest, SearchResponse } from '@/lib/types';

// Next.js 要求 segment 配置在同文件内且为字面量，故直接写死超时时间，保持与 env 默认值一致
export const maxDuration = 300; // API 路由最长执行 5 分钟

/**
 * POST /api/search
 * 搜索单个Amazon关键词
 */
export async function POST(request: NextRequest) {
  let parsedBody: SearchRequest | null = null;

  try {
    const body: SearchRequest = await request.json();
    parsedBody = body;
    const { keyword, zipCode, headless, filters } = body;
    const keywordId = typeof body.keywordId === 'number' ? body.keywordId : undefined;
    const translation =
      typeof body.translation === 'string' || body.translation === null
        ? body.translation
        : undefined;

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

    const baseRecord: RecordSearchResultInput = {
      keyword,
      keywordId,
      translation: translation ?? null,
      searchResults: result.searchResults ?? null,
      maxMonthSales: result.maxMonthSales ?? null,
      maxReviews: result.maxReviews ?? null,
      meetsConditions: false,
      duration: result.duration,
      zipCode,
      filters,
      error: result.error,
    };

    if (result.error) {
      try {
        recordSearchResult(baseRecord);
      } catch (dbError) {
        console.error('记录搜索失败结果异常:', dbError);
      }

      return NextResponse.json({
        success: false,
        error: result.error,
      } as SearchResponse);
    }

    const meetsConditions = meetsFilterConditions(
      result.searchResults,
      result.maxMonthSales,
      result.maxReviews,
      filters
    );

    try {
      recordSearchResult({
        ...baseRecord,
        meetsConditions,
        error: undefined,
      });
    } catch (dbError) {
      console.error('记录搜索结果异常:', dbError);
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

    if (parsedBody?.keyword) {
      try {
        recordSearchResult({
          keyword: parsedBody.keyword,
          keywordId: typeof parsedBody.keywordId === 'number' ? parsedBody.keywordId : undefined,
          translation:
            typeof parsedBody.translation === 'string' || parsedBody.translation === null
              ? parsedBody.translation
              : null,
          searchResults: null,
          maxMonthSales: null,
          maxReviews: null,
          meetsConditions: false,
          duration: undefined,
          zipCode: parsedBody.zipCode,
          filters: parsedBody.filters,
          error: error?.message || '服务器内部错误',
        });
      } catch (dbError) {
        console.error('在异常情况下记录搜索结果失败:', dbError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || '服务器内部错误',
      } as SearchResponse,
      { status: 500 }
    );
  }
}
