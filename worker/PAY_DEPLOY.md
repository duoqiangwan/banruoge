# 微信支付 V3 Native 扫码支付 — 部署说明

已为 `ai-proxy.js` 新增三个接口：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/pay/create`  | 创建支付订单，返回 `{ orderId, codeUrl }` |
| POST | `/api/pay/notify`  | 微信支付回调（验签 + AES 解密 + 更新订单） |
| GET  | `/api/pay/status?orderId=xxx` | 查询订单状态，返回 `{ paid, status, ... }` |

## 支付流程
1. 前端 `POST /api/pay/create` `{ amount(分), subject, pageKey }` → 返回 `{ orderId, codeUrl }`
2. 前端用 `codeUrl` 生成二维码展示
3. 用户扫码付款 → 微信回调 `POST /api/pay/notify` → 验签 + AES-GCM 解密 → 订单标记 `paid`
4. 前端轮询 `GET /api/pay/status?orderId=xxx` → 返回 `paid: true/false`
5. 已付 → 解锁内容；KV 持久记录付费状态

## 必须配置的环境变量 / Secrets

在 Cloudflare Workers 后台或用 wrangler 设置：

```bash
# 1) 商户私钥：粘贴 apiclient_key.pem 的【完整内容】(含 -----BEGIN/END----- 也可，纯base64也可)
#    代码会自动去掉 PEM 头尾与空白
npx wrangler secret put PRIVATE_KEY
# 粘贴私钥内容后回车

# 2) 关联的 AppID（公众号/小程序/移动应用），Native 支付必填
npx wrangler secret put WX_APPID
# 输入你的 appid
```

> 代码中已内置（无需再设）：`WX_MCHID=1114634131`、`WX_APIV3_KEY`、`WX_SERIAL_NO`。
> 如需改为环境变量，可把常量替换为 `env.WX_MCHID` 等。

## KV
- `BANRUOGE_DB` 已绑定（用户数据 + 订单数据共用）。
- 订单 key：`order:<orderId>` → `{ orderId, mchid, amount, subject, pageKey, user, status, codeUrl, transactionId, createdAt, paidAt, lastSyncAt }`
- 付费记录 key：`paid:<pageKey>:<orderId>` → `{ paid, paidAt, user }`
- 解锁记录 key：`unlock:<pageKey>:<user>` → `{ orderId, paidAt }`（登录用户付款后写入）

## 金额单位
分。常用：1.9元=190，5.9元=590，9.9元=990，19.9元=1990。

## 技术要点实现
- 签名：Web Crypto `RSASSA-PKCS1-v1_5` + `SHA-256`，私钥按 `pkcs8` 导入（缓存）。
- 签名串：`METHOD\nPATH?QUERY\nTIMESTAMP\nNONCE\nBODY\n`
- Authorization：`WECHATPAY2-SHA256-RSA2048 mchid="..",nonce_str="..",timestamp="..",serial_no="..",signature=".."`
- 回调验签：通过 `GET /v3/certificates` 下载微信平台证书（AES-GCM 解密后，用内置 ASN.1 解析提取 SPKI 公钥，缓存 10 分钟），用 `Wechatpay-Serial` 对应的公钥验签。
- 回调解密：APIv3 密钥做 `AES-256-GCM` 解密 `resource.ciphertext`。
- 防丢单：`/api/pay/status` 在订单创建 30s 后仍未支付时，主动向微信查询（`/v3/pay/transactions/out-trade-no/{id}`）并同步状态，节流 15s。

## 测试
```bash
# 创建（amount 单位：分）
curl -X POST https://banroge-ai.duoqiang-wan.workers.dev/api/pay/create \
  -H "Content-Type: application/json" \
  -d '{"amount":190,"subject":"般若阁祈福·解签","pageKey":"lottery"}'

# 用返回的 orderId 轮询
curl "https://banroge-ai.duoqiang-wan.workers.dev/api/pay/status?orderId=BRxxxx"
```

## 注意事项
- `notify_url` 由代码根据请求自动生成（`origin + /api/pay/notify`），即 `https://banroge-ai.duoqiang-wan.workers.dev/api/pay/notify`。
- 微信商户后台需将回调地址放行；如使用自定义域名，回调地址会自动跟随。
- `WX_APPID` 未设置时 `/api/pay/create` 会返回 500 并提示。
- 平台证书每 10 分钟自动刷新；首次回调会触发下载（有几百毫秒延迟）。
