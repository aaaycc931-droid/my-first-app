# my-first-app

我的第一个应用。

## 项目简介

这是一个使用 Next.js、TypeScript 和 Tailwind CSS 构建的个人作品集网站。首页包含 Hero、项目展示、关于我和联系入口，使用 Next.js App Router 组织页面。

## 依赖说明

`package.json` 已按 Next.js 项目的常规方式整理依赖：

- `dependencies`：生产运行时需要的 `next`、`react`、`react-dom`。
- `devDependencies`：TypeScript、ESLint、Tailwind CSS、PostCSS、Autoprefixer 和类型声明等构建/开发工具。

当前环境访问 npm registry 会返回 `403 Forbidden`，因此无法在本地生成 `package-lock.json`。依赖声明本身是有效的；请在能访问 npm registry 的网络环境中运行 `npm install`，生成并提交 `package-lock.json` 后再部署。

## 本地运行

1. 安装依赖：

   ```bash
   npm install
   ```

2. 启动开发服务器：

   ```bash
   npm run dev
   ```

3. 在浏览器中打开：

   ```text
   http://localhost:3000
   ```

## 常用命令

```bash
npm run dev    # 启动本地开发环境
npm run build  # 构建生产版本
npm run start  # 启动生产服务器
npm run lint   # 运行 Next.js lint 检查
```

## 部署到 Vercel

1. 在可访问 npm registry 的环境中运行 `npm install`，确认生成 `package-lock.json`。
2. 提交 `package-lock.json` 到当前 Git 仓库。
3. 将仓库推送到 GitHub、GitLab 或 Bitbucket。
4. 在 Vercel 中选择 **Add New... → Project** 并导入该仓库。
5. 保持默认 Next.js 配置即可：Install Command 为 `npm install`，Build Command 为 `npm run build`，Output Directory 留空。
6. 点击 **Deploy**。如项目后续需要环境变量，请在 Vercel Project Settings 的 **Environment Variables** 中添加后重新部署。
