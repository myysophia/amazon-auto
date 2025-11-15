#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import Papa from 'papaparse';
import crypto from 'node:crypto';
import { runBatchWithRetries } from '../lib/batch-search-runner';
import type { FilterConditions, KeywordResult } from '../lib/types';

const attachTimestamp = <T extends (...args: any[]) => void>(fn: T) =>
  ((...args: Parameters<T>) => {
    const prefix = `[${new Date().toISOString()}]`;
    fn(prefix, ...args);
  }) as T;

console.log = attachTimestamp(console.log.bind(console));
console.warn = attachTimestamp(console.warn.bind(console));
console.error = attachTimestamp(console.error.bind(console));

interface CliOptions {
  input: string;
  output: string;
  zipCode: string;
  headless: boolean;
  concurrency: number;
  filters: FilterConditions;
  maxRetryRounds: number;
}

interface NotificationPayload {
  total: number;
  success: number;
  meets: number;
  errors: number;
  outputPath: string;
  ossUrl?: string | null;
  durationMs: number;
  errorMessage?: string;
}

const parseCliOptions = (): CliOptions => {
  const toNumber = (value: string | number | undefined, fallback: number) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const {
    values: {
    input,
    output,
      zip = '',
      concurrency = '1',
      headless = true,
      maxSearchResults,
      minMonthSales,
      maxReviews,
      maxRetryRounds = '1',
    },
  } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      output: { type: 'string', short: 'o' },
      zip: { type: 'string', short: 'z' },
      concurrency: { type: 'string', short: 'c' },
      headless: { type: 'boolean', default: true },
      maxSearchResults: { type: 'string' },
      minMonthSales: { type: 'string' },
      maxReviews: { type: 'string' },
      maxRetryRounds: { type: 'string' },
    },
    allowPositionals: true,
  });

  if (!input) {
    throw new Error('必须通过 --input 指定关键词文件路径');
  }

  const resolvedOutput =
    output ||
    path.resolve(
      process.cwd(),
      `amazon-keyword-results-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
    );

  const filters: FilterConditions = {
    maxSearchResults: toNumber(maxSearchResults ?? process.env.MAX_SEARCH_RESULTS, 500),
    minMonthSales: toNumber(minMonthSales ?? process.env.MIN_MONTH_SALES, 500),
    maxReviews: toNumber(maxReviews ?? process.env.MAX_REVIEWS, 100),
  };

  const resolvedInput = path.resolve(process.cwd(), input);

  return {
    input: resolvedInput,
    output: resolvedOutput,
    zipCode: zip,
    headless,
    concurrency: Math.max(1, toNumber(concurrency, 1)),
    maxRetryRounds: Math.max(0, toNumber(maxRetryRounds, 1)),
    filters,
  };
};

const loadKeywords = (filePath: string): string[] => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const keywords = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const unique = Array.from(new Set(keywords));

  if (unique.length === 0) {
    throw new Error(`关键词文件 ${filePath} 为空`);
  }

  return unique;
};

const ensureDir = (filePath: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const resultsToCsv = (results: KeywordResult[]) => {
  const rows = results.map((r) => ({
    关键词: r.keyword,
    搜索结果数: r.searchResults ?? '-',
    最高月销量: r.maxMonthSales ?? '-',
    最多评论数: r.maxReviews ?? '-',
    是否符合: r.meetsConditions ? '是' : '否',
    耗时_秒: r.duration ? (r.duration / 1000).toFixed(2) : '-',
    错误信息: r.error ?? '',
  }));

  return '\ufeff' + Papa.unparse(rows);
};

const uploadToOss = async (localPath: string): Promise<string | null> => {
  const region = process.env.OSS_REGION;
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.OSS_BUCKET;
  if (!region || !accessKeyId || !accessKeySecret || !bucket) {
    console.log('未配置 OSS 相关环境变量，跳过上传。');
    return null;
  }

  const endpoint = process.env.OSS_ENDPOINT ?? `https://${bucket}.${region}.aliyuncs.com`;
  const prefix = process.env.OSS_PREFIX ?? 'amazon-keyword-results';
  const objectKey = path.posix.join(prefix, path.basename(localPath));
  const resourcePath = `/${bucket}/${objectKey}`;
  const contentType = 'text/csv;charset=utf-8';
  const date = new Date().toUTCString();
  const body = fs.readFileSync(localPath);

  const stringToSign = `PUT\n\n${contentType}\n${date}\n${resourcePath}`;
  const signature = crypto.createHmac('sha1', accessKeySecret).update(stringToSign).digest('base64');
  const authorization = `OSS ${accessKeyId}:${signature}`;
  const targetUrl = `${endpoint.replace(/\/$/, '')}/${encodeURI(objectKey)}`;

  const response = await fetch(targetUrl, {
    method: 'PUT',
    headers: {
      Date: date,
      Authorization: authorization,
      'Content-Type': contentType,
      'Content-Length': body.length.toString(),
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`OSS 上传失败: ${response.status} ${response.statusText}`);
  }

  return targetUrl;
};

const notifyWechat = async (payload: NotificationPayload, success: boolean) => {
  const webhook = process.env.WECHAT_WEBHOOK_URL;
  if (!webhook) {
    console.log('未配置 WECHAT_WEBHOOK_URL，跳过企微通知。');
    return;
  }

  const { total, success: successCount, meets, errors, durationMs, outputPath, ossUrl, errorMessage } =
    payload;

  const durationMinutes = (durationMs / 1000 / 60).toFixed(2);
  const statusText = success ? '✅ 批量搜索完成' : '❌ 批量搜索失败';
  const linkText = ossUrl ? `[下载结果](${ossUrl})` : outputPath;
  const extra = success
    ? ''
    : `\n> 错误信息：${errorMessage ?? '未知错误'}`;

  const content = `${statusText}
> 总关键词：${total}
> 成功：${successCount} | 符合条件：${meets}
> 仍有错误：${errors}
> 耗时：${durationMinutes} 分钟
> 结果：${linkText}${extra}`;

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: { content },
    }),
  });
};

const printRoundSummary = (round: number, results: KeywordResult[]) => {
  const errors = results.filter((r) => r.error).length;
  const successCount = results.length - errors;
  console.log(
    `第 ${round} 轮完成: 成功 ${successCount} 个，剩余错误 ${errors} 个`
  );
};

async function main() {
  const startedAt = Date.now();
  const options = parseCliOptions();
  const keywords = loadKeywords(options.input);

  console.log(
    `\n🚀 开始批量搜索，共 ${keywords.length} 个关键词，并发 ${options.concurrency}\n`
  );

  let progressTotal = keywords.length;
  let currentIndex = 0;

  const results = await runBatchWithRetries({
    ...options,
    keywords,
    onProgress: ({ keyword, index, total }) => {
      currentIndex = index;
      progressTotal = total;
      process.stdout.write(`\r正在处理 [${currentIndex}/${progressTotal}]：${keyword.padEnd(40, ' ')} `);
    },
    onRoundStart: ({ round, keywords: retryKeywords }) => {
      console.log(`\n🔄 开始第 ${round} 轮重试，目标 ${retryKeywords.length} 个关键词\n`);
    },
    onRoundComplete: ({ round, results: roundResults }) => {
      printRoundSummary(round, roundResults);
    },
  });

  process.stdout.write('\n');

  const errors = results.filter((r) => r.error);
  const successCount = results.length - errors.length;
  const meetsCount = results.filter((r) => r.meetsConditions).length;
  const durationMs = Date.now() - startedAt;

  ensureDir(options.output);
  const csvContent = resultsToCsv(results);
  fs.writeFileSync(options.output, csvContent, 'utf-8');

  console.log(`\n📄 结果 CSV 已生成: ${options.output}`);

  const ossUrl = await uploadToOss(options.output).catch((error) => {
    console.error('上传 OSS 失败:', error);
    return null;
  });

  if (ossUrl) {
    console.log(`☁️ OSS 地址: ${ossUrl}`);
  }

  const notificationPayload: NotificationPayload = {
    total: results.length,
    success: successCount,
    meets: meetsCount,
    errors: errors.length,
    outputPath: options.output,
    ossUrl,
    durationMs,
    errorMessage: errors.length ? errors.map((e) => `${e.keyword}:${e.error}`).slice(0, 5).join('; ') : undefined,
  };

  if (errors.length > 0) {
    await notifyWechat(notificationPayload, false).catch((error) =>
      console.error('企微通知发送失败:', error)
    );
    throw new Error(`仍有 ${errors.length} 个关键词失败，详见 CSV。`);
  }

  await notifyWechat(notificationPayload, true).catch((error) =>
    console.error('企微通知发送失败:', error)
  );

  console.log('\n✅ 批量搜索完成，无错误关键词。\n');
}

main().catch((error) => {
  console.error('\n批量搜索执行失败:', error);
  process.exit(1);
});
