# Move 代码解释文档

本文档记录 Sui Chat dApp 的 Move 智能合约代码的详细解释，包括设计决策和实现细节。

## 目录结构

- `sui_chat.move` - 主入口模块，包含 `create_chatroom` 和 `send_message` 函数
- `chatroom.move` - Chatroom 共享对象定义
- `chat.move` - Chat 对象定义
- `key.move` - Key 对象定义（用于访问控制）

---

## 1. sui_chat.move - 主入口模块

### 模块声明和导入

```move
module sui_chat::sui_chat;

use sui_chat::chatroom::{Self, Chatroom};
use sui_chat::chat::{Self, Chat};
use sui_chat::key::{Self, Key};
use sui::object::{Self, ID};
use sui::tx_context::{Self, TxContext};
use sui::transfer;
use sui::clock::{Self, Clock};
use std::option;
use std::vector;
```

**解释：**
- `module sui_chat::sui_chat` - 定义模块名称，`sui_chat` 是包名，`sui_chat` 是模块名
- 导入其他模块：`chatroom`、`chat`、`key`
- 导入 Sui 标准库：`object`（对象操作）、`tx_context`（交易上下文）、`transfer`（对象转移）、`clock`（时间戳）
- 导入 Move 标准库：`option`（可选类型）、`vector`（向量）

### 错误代码常量

```move
const EInvalidPreviousChatId: u64 = 1;
const EKeyMismatch: u64 = 2;
const EEmptyMemberList: u64 = 3;
const EInvalidKeyLength: u64 = 4;
```

**解释：**
- 定义错误代码，用于 `assert!` 失败时返回
- `EInvalidPreviousChatId` - 前一个聊天 ID 不匹配（并发冲突）
- `EKeyMismatch` - Key 对象不属于该 chatroom
- `EEmptyMemberList` - 成员列表为空
- `EInvalidKeyLength` - 密钥长度不是 32 字节（AES-256 要求）

### 系统消息常量

```move
const SYSTEM_MESSAGE: vector<u8> = b"This chat is encrypted and recorded on Sui Chain";
```

**解释：**
- 第一个聊天消息（系统消息），用于初始化 chatroom
- 不加密，作为聊天历史的起点

---

### create_chatroom 函数

```move
public fun create_chatroom(
    member_addresses: vector<address>,
    key: vector<u8>, // 32 bytes for AES-256-GCM
    clock: &Clock,
    ctx: &mut TxContext,
) {
```

**函数签名解释：**
- `public fun` - 公开函数，可以从外部调用
- `member_addresses: vector<address>` - 成员地址列表
- `key: vector<u8>` - 加密密钥（32 字节，AES-256）
- `clock: &Clock` - Clock 对象引用（用于获取时间戳）
- `ctx: &mut TxContext` - 交易上下文（可变引用）

**为什么需要 Clock？**
- `clock::timestamp_ms(clock)` 提供链上时间戳
- 比 `tx_context::epoch_timestamp_ms(ctx)` 更准确，因为 Clock 是共享对象，由验证者维护

**函数流程：**

1. **验证密钥长度**
```move
assert!(vector::length(&key) == 32, EInvalidKeyLength);
```
- 确保密钥是 32 字节（AES-256-GCM 要求）

2. **验证成员列表**
```move
assert!(vector::length(&member_addresses) > 0, EEmptyMemberList);
```
- 确保至少有一个成员

3. **获取创建者地址**
```move
let creator = tx_context::sender(ctx);
```
- 从交易上下文获取发送者地址

4. **创建 Chatroom 对象**
```move
let mut chatroom = chatroom::create(creator, ctx);
let chatroom_id = object::id(&chatroom);
```
- 创建 Chatroom 共享对象
- `mut` 表示可变，因为后续需要更新 `last_chat_id`
- 获取 chatroom 的 ID

5. **创建第一个系统消息**
```move
let first_chat = chat::create(
    chatroom_id,
    creator,
    option::none(), // No previous chat
    SYSTEM_MESSAGE,
    clock,
    ctx,
);
let first_chat_id = chat::id(&first_chat);
```
- 创建第一个 Chat 对象（系统消息）
- `previous_chat_id` 为 `none`（没有前一个消息）
- 使用 `clock` 获取时间戳

6. **转移第一个消息给创建者**
```move
transfer::public_transfer(first_chat, creator);
```
- 将 Chat 对象转移给创建者（owned object）

7. **更新 Chatroom 的 last_chat_id**
```move
chatroom::update_last_chat_id(&mut chatroom, first_chat_id);
```
- 设置 chatroom 的最后一个消息 ID

8. **创建并分发 Key 对象**
```move
let len = vector::length(&member_addresses);
let mut i = 0;
while (i < len) {
    let member = *vector::borrow(&member_addresses, i);
    let key_obj = key::create(chatroom_id, key, ctx);
    transfer::public_transfer(key_obj, member);
    i = i + 1;
};
```
- 遍历所有成员地址
- 为每个成员创建一个 Key 对象（包含相同的加密密钥）
- 将 Key 对象转移给成员（owned object）

**为什么每个成员都有相同的 key？**
- 所有成员使用相同的密钥来加密/解密消息
- Key 对象用于访问控制（验证是否有权限发送消息）

9. **共享 Chatroom 对象**
```move
chatroom::share(chatroom);
```
- 将 Chatroom 转为共享对象（shared object）
- 共享对象可以被任何人读取，但修改需要交易

**为什么 Chatroom 是共享对象？**
- 需要多个用户同时访问和更新（发送消息）
- 共享对象支持并发访问（通过版本控制）

---

### send_message 函数

```move
public fun send_message(
    chatroom: &mut Chatroom,
    key: &Key,
    previous_chat_id: option::Option<ID>,
    encrypted_content: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
```

**函数签名解释：**
- `chatroom: &mut Chatroom` - Chatroom 共享对象（可变引用，需要更新 `last_chat_id`）
- `key: &Key` - Key 对象引用（用于验证权限）
- `previous_chat_id: option::Option<ID>` - 前一个消息的 ID（用于防止并发冲突）
- `encrypted_content: vector<u8>` - 加密后的消息内容
- `clock: &Clock` - Clock 对象引用
- `ctx: &mut TxContext` - 交易上下文

**函数流程：**

1. **获取 chatroom_id 和 sender**
```move
let chatroom_id = object::id(chatroom);
let sender = tx_context::sender(ctx);
```

2. **验证 Key 是否属于该 chatroom**
```move
assert!(key::verify_chatroom(key, chatroom_id), EKeyMismatch);
```
- 确保用户拥有该 chatroom 的 Key 对象
- 这是访问控制的核心机制

3. **验证 previous_chat_id 是否匹配**
```move
let current_last_chat_id = chatroom::last_chat_id(chatroom);
let matches = if (option::is_some(&current_last_chat_id) && option::is_some(&previous_chat_id)) {
    let current_id = *option::borrow(&current_last_chat_id);
    let prev_id = *option::borrow(&previous_chat_id);
    current_id == prev_id
} else {
    option::is_none(&current_last_chat_id) && option::is_none(&previous_chat_id)
};
assert!(matches, EInvalidPreviousChatId);
```

**为什么需要这个验证？**
- **防止并发冲突**：如果两个用户同时发送消息，只有一个会成功
- 前端在发送前会读取 `chatroom.last_chat_id`，然后作为 `previous_chat_id` 传入
- 如果 `previous_chat_id` 与 `chatroom.last_chat_id` 不匹配，说明在准备交易期间，chatroom 已经被更新了
- 失败的交易会被拒绝，用户需要重新读取最新的 `last_chat_id` 并重试

**逻辑解释：**
- 如果两者都是 `some`，比较它们的值是否相等
- 如果两者都是 `none`，也认为匹配（初始状态）
- 否则不匹配，抛出错误

4. **创建新的 Chat 对象**
```move
let new_chat = chat::create(
    chatroom_id,
    sender,
    previous_chat_id,
    encrypted_content,
    clock,
    ctx,
);
let new_chat_id = chat::id(&new_chat);
```

5. **更新 Chatroom 的 last_chat_id**
```move
chatroom::update_last_chat_id(chatroom, new_chat_id);
```
- 原子操作：更新共享对象的 `last_chat_id`
- 这确保了消息的顺序性

6. **转移 Chat 对象给发送者**
```move
transfer::public_transfer(new_chat, sender);
```
- Chat 对象是 owned object，属于发送者

---

## 2. chatroom.move - Chatroom 共享对象

### 结构体定义

```move
public struct Chatroom has key {
    id: UID,
    creator: address,
    last_chat_id: option::Option<ID>,
    created_at: u64,
}
```

**解释：**
- `has key` - 表示这是一个对象（必须有 `id: UID`）
- `id: UID` - 对象的唯一标识符
- `creator: address` - 创建者地址
- `last_chat_id: option::Option<ID>` - 最后一个消息的 ID（可选）
- `created_at: u64` - 创建时间戳（毫秒）

**为什么没有 `has store`？**
- Chatroom 是共享对象，不需要 `store` ability
- 共享对象不能被转移，只能被共享

### create 函数

```move
public fun create(
    creator: address,
    ctx: &mut TxContext,
): Chatroom {
    Chatroom {
        id: object::new(ctx),
        creator,
        last_chat_id: option::none(),
        created_at: tx_context::epoch_timestamp_ms(ctx),
    }
}
```

**解释：**
- `object::new(ctx)` - 创建新的 UID
- `last_chat_id` 初始为 `none`（还没有消息）
- `created_at` 使用 `tx_context::epoch_timestamp_ms(ctx)`（创建时的时间戳）

**为什么 created_at 用 tx_context 而不用 Clock？**
- Chatroom 创建时不需要 Clock 对象
- `tx_context::epoch_timestamp_ms` 足够准确（创建时间）

### update_last_chat_id 函数

```move
public(package) fun update_last_chat_id(
    chatroom: &mut Chatroom,
    new_chat_id: ID,
) {
    chatroom.last_chat_id = option::some(new_chat_id);
}
```

**解释：**
- `public(package)` - 只有同一包内的模块可以调用
- 用于更新 `last_chat_id`（原子操作）

**为什么是 `public(package)` 而不是 `public`？**
- 防止外部直接修改 `last_chat_id`
- 只能通过 `send_message` 函数来更新（确保逻辑正确）

### share 函数

```move
public fun share(chatroom: Chatroom) {
    transfer::share_object(chatroom);
}
```

**解释：**
- 将 Chatroom 转为共享对象
- 共享对象可以被任何人读取，但修改需要交易

---

## 3. chat.move - Chat 对象

### 结构体定义

```move
public struct Chat has key, store {
    id: UID,
    chatroom_id: ID,
    sender: address,
    timestamp: u64,
    previous_chat_id: option::Option<ID>,
    encrypted_content: vector<u8>,
}
```

**解释：**
- `has key, store` - 对象可以被拥有和转移
- `id: UID` - 对象 ID
- `chatroom_id: ID` - 所属 chatroom 的 ID
- `sender: address` - 发送者地址
- `timestamp: u64` - 时间戳（毫秒）
- `previous_chat_id: option::Option<ID>` - 前一个消息的 ID（用于构建链表）
- `encrypted_content: vector<u8>` - 加密后的消息内容

**为什么 previous_chat_id 是 Option？**
- 第一个消息没有前一个消息（`none`）
- 其他消息有前一个消息（`some(id)`）

### create 函数

```move
public fun create(
    chatroom_id: ID,
    sender: address,
    previous_chat_id: option::Option<ID>,
    encrypted_content: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
): Chat {
    Chat {
        id: object::new(ctx),
        chatroom_id,
        sender,
        timestamp: clock::timestamp_ms(clock),
        previous_chat_id,
        encrypted_content,
    }
}
```

**解释：**
- `clock::timestamp_ms(clock)` - 从 Clock 对象获取时间戳（毫秒）
- 其他字段直接赋值

**为什么使用 Clock 而不是 tx_context？**
- Clock 是共享对象，由验证者维护，时间戳更准确
- `tx_context::epoch_timestamp_ms` 是交易的时间戳，可能不够精确

---

## 4. key.move - Key 对象

### 结构体定义

```move
public struct Key has key, store {
    id: UID,
    chatroom_id: ID,
    key: vector<u8>, // 32 bytes for AES-256-GCM
}
```

**解释：**
- `has key, store` - 对象可以被拥有和转移
- `id: UID` - 对象 ID
- `chatroom_id: ID` - 所属 chatroom 的 ID
- `key: vector<u8>` - 加密密钥（32 字节）

**为什么 Key 是 owned object？**
- 每个成员拥有自己的 Key 对象
- 用于访问控制：只有拥有 Key 的用户才能发送消息

### verify_chatroom 函数

```move
public fun verify_chatroom(key: &Key, chatroom_id: ID): bool {
    key.chatroom_id == chatroom_id
}
```

**解释：**
- 验证 Key 对象是否属于指定的 chatroom
- 用于 `send_message` 中的权限检查

---

## 设计决策总结

### 1. 为什么 Chatroom 是共享对象？
- 需要多个用户同时访问和更新
- 共享对象支持并发访问（通过版本控制）

### 2. 为什么 Chat 和 Key 是 owned objects？
- 每个用户拥有自己的 Chat 和 Key 对象
- 便于查询：用户可以通过查询自己拥有的对象来找到相关的 chatroom

### 3. 为什么使用 previous_chat_id 构建链表？
- 可以从最后一个消息向前遍历整个聊天历史
- 不需要在 Chatroom 中存储所有消息 ID（节省 gas）

### 4. 为什么需要 previous_chat_id 验证？
- 防止并发冲突：如果两个用户同时发送消息，只有一个会成功
- 确保消息的顺序性

### 5. 为什么使用 Clock 对象？
- Clock 是共享对象，由验证者维护，时间戳更准确
- 比 `tx_context::epoch_timestamp_ms` 更可靠

### 6. 为什么加密在链下进行？
- 链上加密/解密会消耗大量 gas
- 密钥存储在 Key 对象中，只有拥有 Key 的用户才能解密消息

---

## 常见问题

### Q: 如果两个用户同时发送消息会怎样？
A: 只有第一个成功提交的交易会成功，第二个会因为 `previous_chat_id` 不匹配而失败。用户需要重新读取最新的 `last_chat_id` 并重试。

### Q: 如何查询聊天历史？
A: 从 `chatroom.last_chat_id` 开始，通过 `chat.previous_chat_id` 向前遍历，直到 `previous_chat_id` 为 `none`。

### Q: 密钥安全吗？
A: 密钥存储在链上（Key 对象中），但只有拥有 Key 对象的用户才能访问。如果 Key 对象被转移，新拥有者也可以访问该 chatroom。

### Q: 可以删除消息吗？
A: 不可以。一旦消息被创建并上链，就无法删除（这是区块链的特性）。

### Q: 可以修改消息吗？
A: 不可以。Chat 对象是不可变的，一旦创建就无法修改。

---

## 更新日志

- 2024-XX-XX: 初始版本，使用 `clock::timestamp_ms` 获取时间戳

