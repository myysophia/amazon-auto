# Amazon关键词筛选工具

自动化批量搜索Amazon关键词，根据搜索结果数、月销量、评论数等指标筛选出符合条件的关键词。

## 功能特性

- ✅ **用户认证** - 登录保护，防止未授权访问
- ✅ 批量关键词搜索（支持500-1000个关键词）
- ✅ 自动提取Amazon搜索数据
  - 搜索结果总数
  - 最高月销量
  - 最多评论数
- ✅ 灵活的筛选条件配置
- ✅ 实时进度显示
- ✅ 结果表格展示（可排序、可筛选）
- ✅ CSV导出功能
- ✅ 支持有头/无头浏览器模式
- ✅ 响应式设计，支持桌面和移动设备

## 技术栈

- **Next.js 15** - React框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式设计
- **Playwright** - 浏览器自动化
- **PapaParse** - CSV处理
- **Lucide React** - 图标库

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 安装Playwright浏览器

```bash
npx playwright install chromium
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 访问应用

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 5. 登录系统

首次访问会跳转到登录页面：
- **用户名**：`admin`
- **密码**：`admin`

登录后将保持7天的登录状态。

## 使用方法

### 0. 登录系统

访问系统时，首先会看到登录页面：
- 输入用户名：`admin`
- 输入密码：`admin`
- 点击"登录"按钮

登录成功后会自动跳转到主页面。

### 1. 输入关键词

在"关键词列表"文本框中输入关键词，每行一个关键词。支持批量粘贴。

### 2. 配置邮编

输入5位数字的美国邮编（例如：12345）。

### 3. 选择浏览器模式

- **无头模式**：后台运行，更快速（推荐）
- **有头模式**：显示浏览器窗口，便于调试

### 4. 设置筛选条件

根据需求设置三个筛选条件：

- **搜索结果数上限**：搜索结果数小于此值（默认：500）
- **月销量下限**：最高月销量大于此值（默认：500）
- **评论数上限**：最多评论数小于此值（默认：100）

### 5. 开始搜索

点击"开始搜索"按钮，工具将自动处理所有关键词。

### 6. 查看结果

- 实时显示处理进度
- 结果表格展示所有数据
- 符合条件的关键词会高亮显示
- 支持按列排序和筛选

### 7. 导出数据

点击"导出CSV"按钮，下载符合条件的关键词数据。

### 8. 登出系统

使用完毕后，点击页面右上角的"登出"按钮退出系统。

## 项目结构

```
amazon-auto/
├── app/
│   ├── page.tsx              # 主页面
│   ├── login/
│   │   └── page.tsx          # 登录页面
│   ├── layout.tsx            # 布局组件
│   ├── globals.css           # 全局样式
│   └── api/
│       ├── auth/
│       │   ├── login/
│       │   │   └── route.ts  # 登录API
│       │   └── logout/
│       │       └── route.ts  # 登出API
│       └── search/
│           └── route.ts      # 搜索API
├── components/
│   ├── KeywordInput.tsx      # 关键词输入组件
│   ├── FilterConfig.tsx      # 筛选条件配置
│   ├── ExecutionConfig.tsx   # 执行配置
│   ├── ProgressBar.tsx       # 进度条
│   └── ResultsTable.tsx      # 结果表格
├── hooks/
│   └── useKeywordProcessor.ts # 关键词处理Hook
├── lib/
│   ├── amazon-scraper.ts     # Playwright自动化脚本
│   ├── data-parser.ts        # 数据解析工具
│   ├── auth.ts               # 认证逻辑
│   └── types.ts              # TypeScript类型定义
├── middleware.ts             # Next.js中间件（路由保护）
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## 注意事项

1. **访问频率**：工具在关键词之间添加了2秒延迟，避免过快访问被Amazon封锁
2. **超时设置**：API路由设置了5分钟超时，适合批量处理
3. **浏览器资源**：每个关键词搜索都会启动一个新的浏览器实例，确保数据独立性
4. **数据准确性**：数据提取基于Amazon页面结构，如果Amazon更新页面可能需要调整选择器

## 无障碍性

本项目遵循[WEB-AGENT.md](./WEB-AGENT.md)规范，实现了：

- ✅ 完整的键盘导航支持
- ✅ 清晰的焦点状态
- ✅ ARIA标签和语义化HTML
- ✅ 响应式设计
- ✅ 触摸友好的交互（移动端≥44px点击目标）
- ✅ 表单验证和错误提示
- ✅ 未保存更改的导航警告

## 开发

### 构建生产版本

```bash
npm run build
npm start
```

### 代码检查

```bash
npm run lint
```

## 许可证

MIT

