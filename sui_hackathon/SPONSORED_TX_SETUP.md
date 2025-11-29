# Sponsored Transactions 设置指南

## 概述

Sponsored Transactions 允许第三方（sponsor）为用户支付 gas 费用，用户无需支付或签名。

## 设置步骤

### 1. 创建 Sponsor 钱包

首先需要创建一个钱包作为 sponsor，并确保有足够的 SUI 支付 gas：

```bash
# 创建新的 keypair
sui client new-address ed25519

# 保存地址和私钥（重要！）
# 地址：用于接收 SUI
# 私钥：用于签名交易（需要保密）
```

### 2. 给 Sponsor 钱包充值

在 devnet 上，使用 faucet 给 sponsor 地址充值：

```bash
# 访问 Sui Devnet Faucet
# https://discord.com/channels/916379725201563759/971488439931392130

# 或者使用命令行
sui client faucet <SPONSOR_ADDRESS>
```

### 3. 设置环境变量

在 Vercel 项目设置中添加以下环境变量：

- `SPONSOR_PRIVATE_KEY`: Sponsor 钱包的私钥（hex 格式，不带 0x 前缀）
- `SUI_NETWORK`: 网络类型（`devnet`, `testnet`, `mainnet`），默认 `devnet`
- `VITE_SPONSOR_API_URL`: 前端使用的 API URL（例如：`https://your-app.vercel.app/api/sponsor`）

### 4. 获取 Sponsor 私钥

```bash
# 方法 1: 从 sui client 导出
sui keytool export <KEY_NAME> ed25519

# 方法 2: 如果使用 sui client new-address，私钥会显示在输出中
# 格式：hex string，例如：a1b2c3d4e5f6...
```

### 5. 安全注意事项

⚠️ **重要**：
- **永远不要**将私钥提交到 Git
- **永远不要**在前端代码中暴露私钥
- 只使用测试网络的私钥（devnet/testnet）
- 生产环境应该使用更安全的密钥管理服务（如 AWS KMS, HashiCorp Vault）

### 6. 测试

1. 在 Vercel 部署后，设置环境变量
2. 打开应用，进入 chatroom
3. 开启 "Use sponsored transactions" 开关
4. 发送消息，应该不需要钱包确认（但仍需要后端支持）

## API 端点

### POST `/api/sponsor`

**请求体：**
```json
{
  "transaction": "base64_encoded_transaction_bytes",
  "sender": "0x..."
}
```

**响应：**
```json
{
  "success": true,
  "digest": "0x...",
  "effects": {...},
  "events": [...]
}
```

## 故障排除

### 错误：Sponsor has no SUI coins
- 确保 sponsor 地址有足够的 SUI
- 在 devnet 使用 faucet 充值

### 错误：Sponsor private key not configured
- 检查 Vercel 环境变量设置
- 确保 `SPONSOR_PRIVATE_KEY` 已设置

### 错误：Failed to sponsor transaction
- 检查网络设置（devnet/testnet/mainnet）
- 检查交易是否有效
- 查看服务器日志获取详细错误信息

