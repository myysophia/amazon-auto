import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { notifyResults } from '@/lib/notifications';
import { config } from '@/lib/config';

interface NotifyRequestBody {
  results: Array<{
    keyword: string;
    translation?: string;
    searchResults: number | null;
    maxMonthSales: number | null;
    maxReviews: number | null;
    meetsConditions: boolean;
    duration?: number;
    error?: string;
    completedAt?: string;
  }>;
}

export async function POST(request: NextRequest) {
  if (!config.notifications.oss.region || !config.notifications.wechatWebhook) {
    return NextResponse.json(
      { success: false, error: '通知配置缺失，请在后端配置 OSS 和 企微 Webhook。' },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as NotifyRequestBody;
    const { results } = body;

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { success: false, error: '结果列表不能为空' },
        { status: 400 }
      );
    }

    const successCount = results.filter((r) => !r.error).length;
    const meetsCount = results.filter((r) => r.meetsConditions).length;
    const errors = results.filter((r) => r.error).length;

    const csvContent =
      '\ufeff' +
      Papa.unparse(
        results.map((r) => ({
          关键词: r.keyword,
          翻译: r.translation ?? '',
          搜索结果数: r.searchResults ?? '-',
          最高月销量: r.maxMonthSales ?? '-',
          最多评论数: r.maxReviews ?? '-',
          是否符合: r.meetsConditions ? '是' : '否',
          耗时_秒: r.duration ? (r.duration / 1000).toFixed(2) : '-',
          完成时间: r.completedAt ? new Date(r.completedAt).toLocaleString() : '-',
          错误信息: r.error ?? '',
        }))
      );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `results-${timestamp}.csv`;

    const summary = `✅ 前端一键发送\n> 总关键词：${results.length}\n> 成功：${successCount} | 符合条件：${meetsCount}\n> 错误：${errors}`;

    const notifyResult = await notifyResults(summary, csvContent, filename);

    return NextResponse.json({
      success: true,
      data: {
        ossUrl: notifyResult.ossUrl,
        successCount,
        meetsCount,
        errors,
      },
    });
  } catch (error: any) {
    console.error('发送通知失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '服务器内部错误',
      },
      { status: 500 }
    );
  }
}
