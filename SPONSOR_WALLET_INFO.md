# Sponsor Wallet 信息

⚠️ **重要：此文件包含敏感信息，请妥善保管，不要提交到 Git！**

## Sponsor 钱包信息

**地址：** `0x9d4fb7b8cb7492ff0a9d9244048849e6243146d8a1f14a65616189cf10cf56de`

**别名：** `eloquent-idocrase`

**密钥方案：** ED25519

**Recovery Phrase：**
```
enable marble cook grape emerge diesel sting clip panda suspect keen pill
```

## 设置步骤

### 1. 获取私钥

运行以下命令获取私钥：
```bash
sui keytool export "eloquent-idocrase" ed25519
```

私钥格式应该是 64 个字符的 hex 字符串（不带 0x 前缀）。

### 2. 在 Vercel 设置环境变量

在 Vercel 项目设置 → Environment Variables 添加：

- **SPONSOR_PRIVATE_KEY**: `suiprivkey1qqe2cxg3fwpg4v5n4m40wy45fl8l4mmwe0t5ymcdnz97ytpumrtnu42gfv8`（Bech32 格式，已支持）
- **SUI_NETWORK**: `devnet`
- **VITE_SPONSOR_API_URL**: `https://suihackathon-phi.vercel.app/api/sponsor`（或你的实际 Vercel URL）

### 3. 给 Sponsor 钱包充值

在 devnet 上，使用以下命令充值：
```bash
sui client faucet 0x9d4fb7b8cb7492ff0a9d9244048849e6243146d8a1f14a65616189cf10cf56de
```

或者访问 Sui Discord Faucet：
https://discord.com/channels/916379725201563759/971488439931392130

### 4. 验证余额

```bash
sui client gas 0x9d4fb7b8cb7492ff0a9d9244048849e6243146d8a1f14a65616189cf10cf56de
```

## 安全注意事项

- ⚠️ 此私钥仅用于 devnet 测试
- ⚠️ 不要在生产环境使用此私钥
- ⚠️ 不要将此文件提交到 Git
- ⚠️ 不要在前端代码中暴露私钥

## 使用

1. 部署到 Vercel 后，设置环境变量
2. 确保 sponsor 钱包有足够的 SUI（至少 1 SUI）
3. 在应用中开启 "Use sponsored transactions" 开关
4. 发送消息时，sponsor 会支付 gas 费用

