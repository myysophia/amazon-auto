import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    if (validateCredentials(username, password)) {
      const response = NextResponse.json({ success: true });
      
      // 设置httpOnly cookie，有效期7天
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: AUTH_COOKIE_VALUE,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7天
        path: '/',
      });

      return response;
    } else {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

