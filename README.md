# 🍱 员工每日订餐与微信提醒核销系统 (V2.0)

> 专为企业团队打造的高效、私密、双币种订餐与自动化微信对账提醒系统。

![Version](https://img.shields.io/badge/Version-V2.0-emerald?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18+-61dafb?style=flat-square)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square)
![Firestore](https://img.shields.io/badge/Storage-Firestore%20%2B%20Hot%20Mirror-orange?style=flat-square)

---

## 🌟 核心特性

### 1. 🔔 微信 1 对 1 专属提醒与精准催缴
- **杜绝群发广播**：基于员工真实姓名与微信 UID 建立一对一精准映射，保护订餐与消费隐私。
- **专属动态绑定**：输入订餐姓名一键生成带身份参数的专属二维码，微信扫码一键自动绑定。
- **自动化三段式定时提醒**：
  - `09:30` 每日订餐登记提醒
  - `15:00` 第 1 次未支付账单定向提醒
  - `17:00` 每日最终未支付账单核对提醒

### 2. 🌐 页面级独立子路由与深链接
- 每个模块拥有专属 URL，支持直接分享与收藏：
  - 我要点餐：`/order` 或 `/`
  - 订餐统计与支付核销：`/stats`
  - 使用指南与微信绑定：`/help`
  - 管理后台：`/admin`
- 完美支持浏览器前进/后退联动与动态页面标题同步。

### 3. 🍱 员工订餐与智能支付换算
- **双厂区智能路由**：支持 Plant 1 与 Plant 2 厂区选择、多餐厅（大牌档、特色餐馆）及个性化加菜定制。
- **双币种实时折算引擎**：马币（MYR）⇄ 人民币（RMB）实时精准换算，支持管理员随时调整基础汇率与单份固定补贴。
- **极速核销流程**：内置商家 DuitNow / Touch 'n Go 收款码，支持移动端上传付款账单截图并一键核销变绿标。

### 4. 🗄️ 双轨云端持久化与高可用容灾
- **Google Cloud Firestore**：多端实时同步与持久化存储。
- **本地热镜像自动熔断**：当遭遇云端网络波动或配额上限时，系统自动无缝切换到本地离线镜像，保障历史账单零丢失。

### 5. 📊 管理后台与全维审计
- **多维对账与筛选**：按日期区间、厂区、餐厅、支付状态（已付/未付）多维度实时统计。
- **数据批量导出**：支持一键导出 Excel / CSV 订餐报表，一键批量 ZIP 打包下载员工付款凭证截图。

---

## 🛠️ 技术栈

- **前端**：React 18、TypeScript、Tailwind CSS、Lucide Icons、Motion
- **后端**：Node.js、Express、Google Cloud Firestore SDK
- **消息推送**：WxPusher 开放平台 + Cloudflare Worker 调度
- **构建工具**：Vite + esbuild

---

## 🚀 本地开发与启动

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```
启动后在浏览器访问 `http://localhost:3000`。

### 3. 生产环境构建与启动
```bash
npm run build
npm start
```

---

## 📄 授权协议
本项目遵循 Apache-2.0 开源协议。
