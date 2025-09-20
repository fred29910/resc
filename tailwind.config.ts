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