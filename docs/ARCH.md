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

---
这份文档为 `rcs` 项目的开发提供了清晰的指导和规范。