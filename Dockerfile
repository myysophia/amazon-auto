# 多阶段构建 - 构建阶段
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies，构建需要）
RUN npm ci && npm cache clean --force

# 复制源代码
COPY . .

# 若项目未提供静态资源目录，提前创建避免复制阶段报错
RUN mkdir -p public

# 构建 Next.js 应用
RUN npm run build

# 多阶段构建 - 运行阶段
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

ENV DEBIAN_FRONTEND=noninteractive

# 安装 Chromium 和依赖（必须在创建用户之前）
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        chromium \
        ca-certificates \
        fonts-liberation \
        fonts-freefont-ttf \
        fonts-noto-color-emoji \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libatspi2.0-0 \
        libcups2 \
        libdrm2 \
        libgbm1 \
        libgtk-3-0 \
        libnss3 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxkbcommon0 \
        libxrandr2 \
        xdg-utils \
        xfonts-base && \
    rm -rf /var/lib/apt/lists/*

# 创建非 root 用户并设置 home 目录
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nextjs nextjs && \
    mkdir -p /home/nextjs/.cache && \
    chown -R nextjs:nodejs /home/nextjs

# 设置 Playwright 使用系统安装的 Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
    PLAYWRIGHT_BROWSERS_PATH=0

# 从构建阶段复制必要文件
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# 只安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
