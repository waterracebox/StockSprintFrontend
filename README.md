# StockSprint Frontend

繁體中文：即時股市模擬遊戲前端應用

## 技術棧

- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **UI Library**: Antd Mobile
- **Charts**: @antv/f2
- **WebSocket**: Socket.io-client
- **HTTP Client**: Axios

---

## 本地開發

### 1. 安裝依賴

```powershell
npm install
```

### 2. 啟動開發伺服器

```powershell
npm run dev
```

前端將於 `http://localhost:5173` 啟動。

### 3. 確認後端執行

確保後端在 `http://127.0.0.1:8000` 執行中，Vite 代理會自動轉發 `/api/*` 請求。

---

## 部署至 Vercel

### 方法一：GitHub 自動部署（推薦）

1. 推送代碼至 GitHub
2. 登入 [Vercel](https://vercel.com)
3. 點選 "Import Project"
4. 選擇你的 GitHub 儲存庫
5. Vercel 會自動檢測 Vite 配置並部署

### 方法二：Vercel CLI

```powershell
npm install -g vercel
vercel
```

---

## 環境變數

生產環境無需額外設定，前端會自動使用：

```
https://stock-sprint-backend.onrender.com
```

---

## 目錄結構

```
frontend/
├── src/
│   ├── components/
│   │   └── HelloWorld.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── vite.config.ts
├── vercel.json
└── package.json
```

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
