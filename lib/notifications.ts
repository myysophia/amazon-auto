import crypto from 'node:crypto';
import { config } from './config';

export interface NotificationResult {
  ossUrl?: string | null;
}

const uploadToOss = async (filename: string, content: string): Promise<string | null> => {
  const ossConfig = config.notifications.oss;
  if (
    !ossConfig.region ||
    !ossConfig.bucket ||
    !ossConfig.accessKeyId ||
    !ossConfig.accessKeySecret
  ) {
    return null;
  }

  const endpoint =
    ossConfig.endpoint ?? `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com`;
  const objectKey = `${ossConfig.prefix}/${filename}`;
  const resourcePath = `/${ossConfig.bucket}/${objectKey}`;
  const contentType = 'text/csv;charset=utf-8';
  const date = new Date().toUTCString();
  const body = Buffer.from(content, 'utf-8');

  const stringToSign = `PUT\n\n${contentType}\n${date}\n${resourcePath}`;
  const signature = crypto
    .createHmac('sha1', ossConfig.accessKeySecret)
    .update(stringToSign)
    .digest('base64');
  const authorization = `OSS ${ossConfig.accessKeyId}:${signature}`;
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

const sendWechatNotification = async (content: string) => {
  const webhook = config.notifications.wechatWebhook;
  if (!webhook) {
    return;
  }

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: { content },
    }),
  });
};

export const notifyResults = async (
  summary: string,
  csvContent: string,
  filename: string
): Promise<NotificationResult> => {
  const ossUrl = await uploadToOss(filename, csvContent).catch((error) => {
    console.error('上传 OSS 失败:', error);
    return null;
  });

  const linkText = ossUrl ? `[下载结果](${ossUrl})` : filename;
  const message = `${summary}\n> 结果：${linkText}`;

  await sendWechatNotification(message).catch((error) => {
    console.error('企微通知发送失败:', error);
  });

  return { ossUrl };
};

