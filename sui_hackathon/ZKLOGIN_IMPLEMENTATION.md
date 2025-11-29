# zkLogin 实现说明

## 当前实现状态

✅ **已实现的功能**：
1. Google OAuth 登录流程
2. JWT token 解析
3. 生成 ephemeral key pair
4. 生成 salt（如果 salt service 不可用，使用确定性生成）
5. 生成 zkLogin 地址（简化版本）
6. 尝试获取 ZK proof（如果 proving service 可用）

## 实现文件

- `src/lib/zklogin.ts` - 基础 OAuth 工具函数
- `src/lib/zklogin-full.ts` - 完整的 zkLogin 流程
- `src/hooks/useZkLogin.ts` - React hook 集成

## 工作流程

1. **用户点击 "Sign in with Google"**
   - 重定向到 Google OAuth
   - 用户完成 Google 登录

2. **Google 重定向回应用**
   - 应用从 URL hash 中提取 `id_token`
   - 解析 JWT token

3. **完成 zkLogin 流程**
   - 生成 ephemeral key pair
   - 获取/生成 salt
   - 生成 zkLogin 地址
   - 尝试获取 ZK proof（如果服务可用）

4. **存储结果**
   - zkLogin 地址存储在 localStorage
   - 导航到主页面

## 对于 Hackathon 演示

当前实现是**简化版本**，适合 hackathon 演示：

- ✅ **可以展示**：OAuth 登录流程、JWT 解析、地址生成
- ⚠️ **限制**：
  - 需要 proving service 才能生成真正的 ZK proof
  - 需要 salt service 才能生成安全的 salt
  - 地址生成是简化版本，不是真正的 Sui zkLogin 地址

## 完整实现需要

### 1. Proving Service

需要部署一个 proving service 来生成 ZK proof。选项：

- **选项 A**：使用公共 proving service（如果有）
- **选项 B**：部署自己的 proving service
  - 参考：[Sui zkLogin Prover](https://github.com/MystenLabs/sui/tree/main/apps/zklogin-prover)
  - 需要 Docker 和服务器

### 2. Salt Service

需要 salt service 来生成唯一的 salt。选项：

- **选项 A**：使用公共 salt service（如果有）
- **选项 B**：部署自己的 salt service
  - 参考：[Sui zkLogin Salt Provider](https://github.com/MystenLabs/sui/tree/main/apps/zklogin-salt-provider)

### 3. 环境变量（可选）

如果需要使用自己的 proving/salt service，在 Vercel 设置：

```env
VITE_PROVING_SERVICE_URL=https://your-proving-service.com/v1
VITE_SALT_SERVICE_URL=https://your-salt-service.com/v1
```

## 测试

1. 确保 `VITE_GOOGLE_CLIENT_ID` 已设置
2. 访问登录页面
3. 点击 "Sign in with Google"
4. 完成 Google 登录
5. 检查浏览器 console，应该看到：
   - "Google OAuth successful"
   - "zkLogin result"（包含地址等信息）

## 演示说明

在 hackathon 演示时，可以说明：

1. **已实现**：完整的 OAuth 流程和 zkLogin 基础架构
2. **需要服务**：完整的 zkLogin 需要 proving service 和 salt service
3. **展示**：OAuth 登录、地址生成、JWT 解析等功能

## 参考文档

- [Sui zkLogin 文档](https://docs.sui.io/concepts/cryptography/zklogin)
- [Proving Service](https://github.com/MystenLabs/sui/tree/main/apps/zklogin-prover)
- [Salt Service](https://github.com/MystenLabs/sui/tree/main/apps/zklogin-salt-provider)

