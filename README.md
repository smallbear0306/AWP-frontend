# AWP-frontend

记账网页（Accounting-WebPage）前端单页应用。

## 技术栈

- Vue 3 + Vite
- Vue Router / Pinia
- Axios
- Element Plus
- ECharts

## 运行

```bash
npm install
npm run dev
```

开发服务器默认 `http://localhost:5173`，通过 Vite proxy 将 `/api` 代理到后端 `http://localhost:8080`。

## 目录结构

```
src/
├── main.js         # 入口
├── App.vue
├── router/         # 路由
├── store/          # Pinia 状态
├── api/            # Axios 请求封装
├── views/          # 页面
├── components/     # 通用组件
└── assets/         # 静态资源
```

详见仓库外的《AWP-设计文档.md》。
