import { NextRequest, NextResponse } from 'next/server';
import { prepareKeywordsForSearch } from '@/lib/keyword-storage';
import type { PreparedKeywordPayload } from '@/lib/types';

const DEFAULT_WINDOW_DAYS = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keywords = Array.isArray(body?.keywords) ? body.keywords : [];
    const windowDays = Number.isFinite(body?.windowDays)
      ? Number(body.windowDays)
      : DEFAULT_WINDOW_DAYS;

    const normalized = keywords
      .map((keyword: unknown) => (typeof keyword === 'string' ? keyword.trim() : ''))
      .filter((keyword: string) => keyword.length > 0);

    if (normalized.length === 0) {
      return NextResponse.json(
        { success: false, error: '关键词列表不能为空' },
        { status: 400 }
      );
    }

    const data: PreparedKeywordPayload = prepareKeywordsForSearch(normalized, windowDays);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('准备关键词失败:', error);
    return NextResponse.json(
      { success: false, error: error?.message ?? '服务器内部错误' },
      { status: 500 }
    );
  }
}
