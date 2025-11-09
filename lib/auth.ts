// 简单的认证逻辑
export const AUTH_CREDENTIALS = {
  username: 'admin',
  password: 'admin',
};

export const AUTH_COOKIE_NAME = 'amazon-auto-auth';
export const AUTH_COOKIE_VALUE = 'authenticated';

export function validateCredentials(username: string, password: string): boolean {
  return username === AUTH_CREDENTIALS.username && password === AUTH_CREDENTIALS.password;
}

