import { AUTH_USERNAME, AUTH_PASSWORD, AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from './config';
export { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from './config';

// 简单的认证逻辑
export const AUTH_CREDENTIALS = {
  username: AUTH_USERNAME,
  password: AUTH_PASSWORD,
};

export function validateCredentials(username: string, password: string): boolean {
  return username === AUTH_CREDENTIALS.username && password === AUTH_CREDENTIALS.password;
}
