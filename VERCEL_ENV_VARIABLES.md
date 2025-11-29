# Vercel 环境变量设置清单

## 在 Vercel Dashboard 设置以下环境变量

### 前端环境变量（VITE_ 开头）

1. **VITE_PUSHER_KEY**
   - 值：`4b0c4dca18cc8870e4b3`
   - 说明：用于实时聊天更新

2. **VITE_PUSHER_CLUSTER**
   - 值：`ap3`
   - 说明：Pusher 集群

3. **VITE_SPONSOR_API_URL**
   - 值：`https://suihackathon-phi.vercel.app/api/sponsor`
   - 说明：Sponsored Transactions API 端点

4. **VITE_GOOGLE_CLIENT_ID**
   - 值：`3395270498-ojjjo90nf63pe067c266tdu13qj4hq1d.apps.googleusercontent.com`
   - 说明：Google OAuth Client ID（用于 zkLogin）

5. **VITE_PROVING_SERVICE_URL**（可选）
   - 值：`https://prover.sui.io/v1`
   - 说明：zkLogin Proving Service

6. **VITE_SALT_SERVICE_URL**（可选）
   - 值：`https://salt.sui.io/v1`
   - 说明：zkLogin Salt Service

### 后端环境变量（用于 API 端点）

7. **SPONSOR_PRIVATE_KEY**
   - 值：`suiprivkey1qqe2cxg3fwpg4v5n4m40wy45fl8l4mmwe0t5ymcdnz97ytpumrtnu42gfv8`
   - 说明：Sponsor 钱包私钥（Bech32 格式）
   - ⚠️ 仅用于 devnet 测试

8. **SUI_NETWORK**
   - 值：`devnet`
   - 说明：Sui 网络（devnet/testnet/mainnet）

## 设置步骤

1. 打开 Vercel Dashboard：https://vercel.com/dashboard
2. 选择你的项目：`suihackathon`
3. 进入 **Settings** → **Environment Variables**
4. 点击 **Add New**，逐个添加上述环境变量
5. 确保选择正确的 **Environment**（Production, Preview, Development）
6. 保存后，Vercel 会自动重新部署

## 快速复制清单

```
VITE_PUSHER_KEY=4b0c4dca18cc8870e4b3
VITE_PUSHER_CLUSTER=ap3
VITE_SPONSOR_API_URL=https://suihackathon-phi.vercel.app/api/sponsor
VITE_GOOGLE_CLIENT_ID=3395270498-ojjjo90nf63pe067c266tdu13qj4hq1d.apps.googleusercontent.com
VITE_PROVING_SERVICE_URL=https://prover.sui.io/v1
VITE_SALT_SERVICE_URL=https://salt.sui.io/v1
SPONSOR_PRIVATE_KEY=suiprivkey1qqe2cxg3fwpg4v5n4m40wy45fl8l4mmwe0t5ymcdnz97ytpumrtnu42gfv8
SUI_NETWORK=devnet
```

