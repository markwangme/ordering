# WxPusher 自动订餐/支付提醒

这个 Worker 不把 WxPusher 密钥放进 Google AI Studio 的前端代码，而是由 Cloudflare Cron 定时执行：

- 09:30（马来西亚/新加坡时间）：发送订餐提醒。
- 15:00：发送第 1 次未支付提醒；如果全部已支付则不发送。
- 17:00：发送第 2 次未支付提醒；如果全部已支付则不发送。

当前版本使用 WxPusher 应用 UID（`uids`）逐人发送，不使用主题号发送个人付款信息。员工在订餐页面输入与订单完全一致的姓名，扫描绑定二维码关注 WxPusher 应用；Worker 收到回调后保存“姓名 -> UID”映射，并只向该 UID 发送提醒。

## 部署

1. 在 WxPusher 应用信息中配置回调地址：`https://ordering-wxpusher-reminder.wfkkl.workers.dev/wxpusher/callback`。
2. 记录 `appToken`，只保存到 Cloudflare Secret；不要放进前端。
2. `APP_BASE_URL` 和 `API_BASE_URL` 都使用员工访问地址及后端地址 `https://ordering.ai.studio/`。
3. 在此目录执行：

```bash
npx wrangler login
npx wrangler secret put WXPUSHER_APP_TOKEN
npx wrangler secret put NOTIFICATION_SECRET
npx wrangler deploy
```

4. 可手动测试（可选）：

```bash
curl -X POST https://<worker-domain>/run -H "Authorization: Bearer <NOTIFICATION_SECRET>"
```

Cloudflare Cron 使用 UTC；当前配置为 `01:30`、`07:00`、`09:00` UTC，分别对应马来西亚/新加坡时间 09:30、15:00、17:00。Cron 配置变更通常需要几分钟传播。

## 注意

- `appToken`、`topicId` 和手动测试密钥只能放在 Cloudflare Secret，不要写到 React/Vite 的 `VITE_*` 变量或提交到 Git。
- `/binding/start` 生成一次性二维码，`/binding/status` 查询绑定结果；绑定关系保存于 Cloudflare KV。
- 员工必须使用与订餐订单相同的姓名。当前订单模型以姓名作为关联键，重名会造成提醒归属不确定，应避免重名。
- 没有完成 UID 绑定的订单不会发送个人提醒，不会回退为群发，避免泄露其他员工的付款记录。
- Worker 优先调用后端的 `/api/orders/reminder?date=YYYY-MM-DD`，只读取提醒字段，不下载支付截图；后端接口正在部署期间会兼容回退到 `/api/orders`。
- 如需加固提醒接口，在 Google 后端设置 `REMINDER_API_SECRET`，并在 Worker 中执行 `npx wrangler secret put ORDER_API_SECRET`，两边填入同一个值。不要把值提交到 Git。
- 现有 `firestore.rules` 是全库允许读写，正式使用前应收紧，否则任何知道项目配置的人都可能改订单。
