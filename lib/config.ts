const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return defaultValue;
};

const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

export const AUTH_USERNAME = process.env.AUTH_USERNAME ?? 'admin';
export const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? 'admin';
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'amazon-auto-auth';
export const AUTH_COOKIE_VALUE = process.env.AUTH_COOKIE_VALUE ?? 'authenticated';

export const SEARCH_API_MAX_DURATION = parseNumber(
  process.env.SEARCH_API_MAX_DURATION,
  300
);

export const ENABLE_DEBUG_SCREENSHOT = parseBoolean(
  process.env.ENABLE_DEBUG_SCREENSHOT,
  true
);

export const PLAYWRIGHT_CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export const config = {
  auth: {
    username: AUTH_USERNAME,
    password: AUTH_PASSWORD,
    cookieName: AUTH_COOKIE_NAME,
    cookieValue: AUTH_COOKIE_VALUE,
  },
  api: {
    maxDuration: SEARCH_API_MAX_DURATION,
  },
  browser: {
    executablePath: PLAYWRIGHT_CHROMIUM_PATH,
    enableDebugScreenshot: ENABLE_DEBUG_SCREENSHOT,
  },
  notifications: {
    oss: {
      region: process.env.OSS_REGION,
      bucket: process.env.OSS_BUCKET,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      prefix: process.env.OSS_PREFIX ?? 'amazon-keyword-results',
      endpoint: process.env.OSS_ENDPOINT,
    },
    channels: (process.env.NOTIFICATION_CHANNELS ?? 'wechat')
      .split(',')
      .map((ch) => ch.trim())
      .filter(Boolean),
    wechatWebhook: process.env.WECHAT_WEBHOOK_URL,
    feishuWebhook: process.env.FEISHU_WEBHOOK_URL,
  },
};

export type AppConfig = typeof config;
