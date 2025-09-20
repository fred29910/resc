# Tailwind CSS v4 集成方案与可行性报告

本文档旨在评估在当前基于 Vite + React Server Components (RSC) 的项目中集成 Tailwind CSS v4 的可行性，并提供详细的集成方案。

## 1. 评估结论

**结论：集成 Tailwind CSS v4 是完全可行的，并且与项目现有架构高度兼容。**

*   **架构契合**: 项目架构文档 (`ARCH.md`) 明确推荐使用 Tailwind CSS 作为组件级样式解决方案。
*   **技术栈兼容**: 项目使用 Vite 作为构建工具，Tailwind CSS v4 与 Vite 能够通过 PostCSS 无缝集成。
*   **RSC 兼容**: Tailwind CSS 是一个构建时工具，它生成的原子化 CSS 类可以无缝应用于服务端组件 (RSC) 和客户端组件 (CC)，不引入任何客户端运行时，符合 RSC 的核心理念。

## 2. 集成优势

*   **开发效率**: 提供大量预设的原子化 class，极大提升 UI 开发速度。
*   **样式一致性**: 通过 `tailwind.config.ts` 统一管理设计规范（颜色、间距、字体等），确保项目整体视觉风格一致。
*   **性能优化**: 自动进行 Tree-shaking，最终构建的 CSS 文件中只包含实际用到的样式，文件体积极小。
*   **可维护性**: 将样式与组件结构内聚，便于维护和重构，避免了全局 CSS 污染的问题。

## 3. 集成步骤

以下是具体的集成步骤，旨在提供一份清晰、可执行的操作指南。

### 步骤 1: 安装依赖

首先，需要安装 `tailwindcss` v4, `postcss`, 和 `autoprefixer` 作为开发依赖。

```bash
bun add -D tailwindcss@next postcss autoprefixer
```

*   `tailwindcss@next`: 安装 Tailwind CSS v4 的最新版本。
*   `postcss`: Tailwind CSS 依赖的 CSS 处理工具。
*   `autoprefixer`: 自动为 CSS 规则添加浏览器厂商前缀。

### 步骤 2: 创建配置文件

接下来，创建 Tailwind CSS 和 PostCSS 的配置文件。

#### a. `tailwind.config.ts`

在项目根目录创建 `tailwind.config.ts` 文件，用于配置 Tailwind CSS。

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}', // 扫描 src 目录下所有组件和页面文件
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
```

*   `content` 字段是关键，它告诉 Tailwind CSS 去哪些文件中扫描并提取使用到的 class。

#### b. `postcss.config.js`

在项目根目录创建 `postcss.config.js` 文件，用于集成 Tailwind CSS 插件。

```javascript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 步骤 3: 配置 Vite

修改 `vite.config.ts` 文件，将 PostCSS 集成到 Vite 的 CSS 构建流程中。Vite 会自动加载 `postcss.config.js`，因此通常无需显式配置，但为了确保清晰，可以检查 `css` 字段。

*注意：Vite 默认支持 PostCSS，只要 `postcss.config.js` 文件存在，通常无需额外配置。*

### 步骤 4: 引入 Tailwind CSS 指令

清空现有的 `src/styles/globals.css` 文件，并替换为 Tailwind CSS 的核心指令。

```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

这些指令会在构建时被 PostCSS 替换为 Tailwind CSS 生成的实际样式。

### 步骤 5: 在根布局中引入全局样式

确保 `src/app/layout.tsx` 文件中已经引入了全局样式表。

```tsx
// src/app/layout.tsx
import '../styles/globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

完成以上步骤后，即可在项目的所有组件（RSC 和 CC）中使用 Tailwind CSS 的原子化 class 进行样式开发。