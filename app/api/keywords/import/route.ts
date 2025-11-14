import { NextRequest, NextResponse } from 'next/server';
import { importKeywordTranslations } from '@/lib/keyword-storage';
import type { KeywordImportEntry } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entries = Array.isArray(body?.entries) ? (body.entries as KeywordImportEntry[]) : [];

    const normalized = entries
      .map((entry) => ({
        keyword: typeof entry.keyword === 'string' ? entry.keyword.trim() : '',
        translation:
          typeof entry.translation === 'string' || entry.translation === null
            ? entry.translation
            : undefined,
      }))
      .filter((entry) => entry.keyword.length > 0);

    if (normalized.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有可导入的关键词数据' },
        { status: 400 }
      );
    }

    const summary = importKeywordTranslations(normalized);

    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('导入关键词失败:', error);
    return NextResponse.json(
      { success: false, error: error?.message ?? '服务器内部错误' },
      { status: 500 }
    );
  }
}
