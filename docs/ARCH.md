# RCS 项目架构设计文档

本文档详细描述了 `rcs` 项目（一个基于 Vite + React Server Components 的内容驱动网站）的架构设计。

## 1. 核心理念

项目旨在构建一个高性能、易于维护且具备良好开发体验的内容驱动型网站（如博客、文档）。架构的核心是充分利用 React Server Components (RSC) 的优势：

*   **服务端优先**: 大部分组件默认为在服务端渲染的 Server Components，以实现最佳的加载性能和 SEO。
*   **零客户端 JS**: 对于纯静态内容展示，客户端无需加载任何 JavaScript。
*   **无缝混合**: 在需要交互的地方，可以无缝地引入客户端组件 (Client Components)，由 Vite 进行自动的代码分割。
*   **简化的数据获取**: 在服务端组件中直接异步获取数据，无需复杂的客户端状态管理和 `useEffect`。

## 2. 目录结构

项目采用模块化、关注点分离的目录结构，以支持未来的扩展和维护。

```
src/
|-- app/                # 路由和页面 (基于文件系统)
|   |-- blog/
|   |   |-- [slug]/
|   |   |   `-- page.tsx`
|   |   `-- page.tsx`
|   |-- docs/
|   |   |-- [..slug]/
|   |   |   `-- page.tsx`
|   |   `-- page.tsx`
|   |-- layout.tsx`      # 根布局
|   `-- page.tsx`        # 网站首页
|
|-- components/         # 可重用组件
|   |-- common/           # 通用原子组件 (Button, Input)
|   |-- content/          # 内容展示相关组件 (Markdown, PostCard)
|   `-- layout/           # 布局组件 (Header, Footer, Sidebar)
|
|-- lib/                # 数据获取、工具函数等
|   |-- api.ts`          # 服务端数据获取逻辑
|   |-- utils.ts`        # 通用工具函数
|   `-- types.ts`        # TypeScript 类型定义
|
|-- styles/             # 全局样式和主题
|   `-- globals.css`
|
|-- server-actions/     # Server Actions
|   `-- posts.ts`
|
`-- framework/`          # 框架底层代码 (保持不变)
    |-- entry.browser.tsx
    |-- entry.rsc.tsx
    `-- entry.ssr.tsx

content/                # Markdown 内容源
|-- blog/
|   `-- *.mdx`
`-- docs/
    `-- *.md`
```

## 3. 核心模块与组件划分

组件根据其是否需要交互性来划分为服务端组件 (RSC) 和客户端组件 (CC)。

| 模块 | 组件 | 类型 | 职责 |
| :--- | :--- | :--- | :--- |
| **布局** | `app/layout.tsx` | RSC | 根布局，包含 `<html>` 和 `<body>` |
| | `components/layout/Header.tsx` | RSC | 网站页头，包含导航 |
| | `components/layout/Footer.tsx` | RSC | 网站页脚 |
| | `components/layout/ThemeToggle.tsx` | CC | 主题切换按钮 (需要交互) |
| **博客** | `app/blog/page.tsx` | RSC | 文章列表页，获取并展示文章摘要 |
| | `app/blog/[slug]/page.tsx` | RSC | 文章详情页，获取并展示单篇文章 |
| | `components/content/PostCard.tsx` | RSC | 文章卡片，纯展示 |
| | `components/content/Markdown.tsx` | CC | Markdown 渲染器 (代码高亮等交互) |
| **交互** | `components/content/LikeButton.tsx` | CC | 点赞按钮 (处理点击事件) |
| | `components/content/CommentSection.tsx`| CC | 评论区 (加载、提交评论) |
| | `server-actions/posts.ts` | N/A | 处理点赞、评论的 Server Actions |

## 4. 数据获取与管理

### 4.1. 数据源

*   **内容**: 所有博客文章和文档均以 Markdown (`.md` / `.mdx`) 文件的形式存储在项目根目录下的 `content/` 文件夹中。
*   **元数据**: 每篇内容的元数据（如标题, 日期, 作者）通过文件头部的 Frontmatter 进行管理。

### 4.2. 数据获取层

*   在 `lib/api.ts` 中实现统一的数据获取函数。
*   这些函数负责从文件系统读取 `.md`/`.mdx` 文件，解析 Frontmatter，并返回结构化的数据对象。
*   所有数据获取操作均在服务端完成，由服务端组件直接调用。

### 4.3. 数据流

```mermaid
graph TD
    A[用户请求 URL] --> B{路由匹配 `app/**/page.tsx`};
    B --> C[Page (RSC) 调用 `lib/api.ts` 中的数据获取函数];
    C --> D[从 `content/` 目录读取 Markdown 文件];
    D --> E[解析文件内容和 Frontmatter];
    E --> F[Page (RSC) 接收数据并渲染];
    F --> G[将 HTML 流式传输到客户端];
```

### 4.4. 状态管理

*   **服务端**: 无状态。每次请求都获取最新数据。
*   **客户端**: 仅处理 UI 交互相关的瞬时状态。优先使用 React Hooks (`useState`, `useContext`)。

## 5. 路由

*   采用基于文件系统的路由机制，由 `app/` 目录的结构决定。
*   动态路由通过文件夹名称（如 `[slug]`）来实现。

## 6. 样式

*   全局样式定义在 `styles/globals.css` 中。
*   推荐使用 CSS Modules 或 Tailwind CSS 实现组件级别的样式隔离。

## 7. 渲染策略

本节详细阐述服务端组件 (RSC) 和客户端组件 (CC) 的协同工作模式。

### 7.1. 组件类型选择

*   **默认为服务端组件 (RSC)**: 除非组件需要处理用户交互（如 `onClick`, `onChange`）或使用浏览器端 API（如 `localStorage`），否则都应创建为 RSC。这能最大化性能优势。
*   **客户端组件 (CC)**: 仅在需要交互性时使用。通过在文件顶部添加 `"use client";` 指令来标记一个组件为 CC。Vite 会自动将这些组件及其依赖打包到客户端的 JavaScript bundle 中。

### 7.2. RSC 与 CC 通信

*   **RSC -> CC**: 服务端组件可以像导入普通组件一样导入并渲染客户端组件。重要的是，传递给客户端组件的 props 必须是可序列化的（不能是函数、Date 对象等）。
*   **CC -> RSC (通过 `children`)**: 客户端组件不能直接 `import` 服务端组件。但是，它们可以接受由服务端组件渲染的 `children` 作为 prop。这是一种强大的模式，允许我们将静态的服务端渲染内容“包裹”在交互式的客户端组件中。

```tsx
// components/layout/InteractiveWrapper.tsx (Client Component)
"use client";

import { useState } from "react";

export function InteractiveWrapper({ children }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Click me</button>
      <p>Count: {count}</p>
      {children} {/* Server-rendered content goes here */}
    </div>
  );
}
```

```tsx
// app/page.tsx (Server Component)
import { InteractiveWrapper } from "@/components/layout/InteractiveWrapper";
import { ServerContent } from "@/components/content/ServerContent";

export default function Page() {
  return (
    <InteractiveWrapper>
      {/* This is a Server Component, rendered on the server */}
      <ServerContent />
    </InteractiveWrapper>
  );
}
```

## 8. 构建与部署

### 8.1. 构建

执行以下命令来构建生产版本的应用：

```bash
bun run build
```

该命令会执行以下操作：
1.  使用 Vite 构建客户端资源 (JavaScript, CSS)，并将其输出到 `dist/client/` 目录。
2.  构建服务端渲染 (SSR) 和 RSC 的入口点，并将其输出到 `dist/server/` 目录。
3.  生成资源清单 (manifest) 文件，用于在服务端渲染时正确地关联客户端资源。

### 8.2. 部署

构建完成后，`dist/` 目录包含了部署所需的所有文件。你可以使用一个 Node.js 服务器来运行应用。

```bash
bun run start
```

此命令会启动一个生产服务器，监听指定的端口。

#### 8.2.1. 推荐平台

*   **Vercel**: 对 Next.js 和 RSC 有良好支持，提供开箱即用的 CI/CD 和全球 CDN。
*   **Netlify**: 同样提供强大的 CI/CD 和部署服务。
*   **Docker**: 你也可以将应用容器化，并部署到任何支持 Docker 的云平台（如 AWS, Google Cloud）。

## 9. 性能优化

得益于 RSC 优先的架构，项目已经具备了良好的性能基础。以下是一些额外的优化策略：

*   **自动代码分割**: Vite 会自动基于客户端组件 (`"use client"`) 的使用进行代码分割。确保只有在必要时才使用客户端组件，以保持客户端 JavaScript bundle 的最小化。
*   **懒加载组件**: 对于非首屏或低优先级的客户端组件，可以使用 `React.lazy` 和 `Suspense` 来实现懒加载，进一步减少初始加载时间。
*   **图片优化**: 使用现代图片格式（如 WebP），并根据需要对图片进行压缩和尺寸调整。可以集成第三方服务或库来自动化此过程。
*   **服务端缓存**: 对于不经常变化的数据获取操作（如获取所有文章列表），可以在 `lib/api.ts` 中添加缓存层（如使用 `node-cache` 或 `lru-cache`），以减少对文件系统的重复读取。

## 10. 测试策略

为确保代码质量和应用稳定性，推荐采用以下测试策略：

*   **单元测试**: 使用 Vitest 或 Jest 对独立的工具函数 (`lib/utils.ts`)、数据获取逻辑 (`lib/api.ts`) 和复杂的客户端组件进行测试。
*   **组件测试**: 使用 React Testing Library 测试客户端组件的交互行为和渲染输出。
*   **端到端 (E2E) 测试**: 使用 Playwright 或 Cypress 对关键用户流程（如文章浏览、评论提交）进行自动化测试，以模拟真实用户场景。
*   **静态代码分析**: 集成 ESLint 和 Prettier，在代码提交前进行自动化的格式化和质量检查。

## 11. 环境变量

Vite 支持通过 `.env` 文件来管理环境变量。

*   创建一个 `.env.local` 文件用于本地开发，存储敏感信息（如 API 密钥）。此文件不应提交到版本控制。
*   在代码中，只能通过 `import.meta.env.VITE_*` 来访问暴露给客户端的环境变量。
*   服务端代码可以直接通过 `process.env` 访问所有环境变量。

---
这份文档为 `rcs` 项目的开发提供了清晰的指导和规范。