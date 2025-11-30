# Sui Chat - Encrypted Chat on Sui Chain

A decentralized encrypted chat application built on Sui blockchain, where each message is stored as an on-chain object with encrypted content.

## Core Architecture

### Move Smart Contract Design

The application uses a **linked-list structure** to store chat messages on-chain:

```
Chatroom (Shared Object)
  └── last_chat_id → Chat3 → Chat2 → Chat1 (previous_chat_id: none)
```

#### Key Components

1. **Chatroom** (`chatroom.move`) - Shared Object
   - Stores metadata: `creator`, `last_chat_id`, `created_at`
   - Shared object allows multiple users to access and update
   - `last_chat_id` points to the most recent message

2. **Chat** (`chat.move`) - Owned Object
   - Each message is an owned object by the sender
   - Contains: `chatroom_id`, `sender`, `timestamp`, `previous_chat_id`, `encrypted_content`
   - Linked list structure: `previous_chat_id` points to the previous message
   - First message has `previous_chat_id: none()`

3. **Key** (`key.move`) - Owned Object
   - Each chatroom member owns a Key object
   - Contains the encryption key (32 bytes for AES-256-GCM)
   - Used for access control: only Key owners can send messages

4. **Main Module** (`sui_chat.move`) - Entry Points
   - `create_chatroom`: Creates chatroom, first system message, and distributes keys
   - `send_message`: Creates new chat, updates chatroom's `last_chat_id`, prevents concurrent conflicts

### Key Design Decisions

#### 1. Why Chatroom is a Shared Object?

- Multiple users need to access and update the same chatroom
- Shared objects support concurrent access through version control
- Allows atomic updates of `last_chat_id` when new messages are sent

#### 2. Why Chat is an Owned Object?

- Each message belongs to the sender (owned by sender)
- Efficient querying: users can query their own messages via `sui_getOwnedObjects`
- No version control needed (unlike shared objects)
- Follows "who sends, who owns" semantics

#### 3. Why Linked List Structure?

- **Gas Efficiency**: Don't need to store all message IDs in Chatroom
- **Scalability**: Can add unlimited messages without modifying Chatroom
- **Decentralization**: Each message is an independent object

#### 4. Concurrency Control

When two users send messages simultaneously:
1. Both read `chatroom.last_chat_id` as `Chat2`
2. Both set `previous_chat_id = Chat2`
3. First transaction succeeds, updates `last_chat_id` to `Chat3`
4. Second transaction fails: `previous_chat_id (Chat2) != last_chat_id (Chat3)`
5. User retries with updated `last_chat_id`

This ensures **message ordering** and prevents conflicts.

#### 5. Encryption Model

- **On-chain**: Encrypted content stored in `Chat.encrypted_content`
- **Off-chain**: Encryption/decryption using Web Crypto API (AES-256-GCM)
- **Key Storage**: Encryption key stored in `Key` object (32 bytes)
- Only users with `Key` object can decrypt messages

### Contract Deployment

**Devnet Package ID**: `0xe11292251d67bebd0020c13f23b1efd844d58d5db2e5a562e6040ab5a0cf0918`

**Modules**:
- `sui_chat::sui_chat` - Main entry points
- `sui_chat::chatroom` - Chatroom shared object
- `sui_chat::chat` - Chat owned object
- `sui_chat::key` - Key owned object

### Data Flow

#### Creating a Chatroom

```
1. Frontend generates 32-byte encryption key
2. Call create_chatroom(member_addresses, key, clock)
3. Move contract:
   - Creates Chatroom (shared object)
   - Creates first system Chat (owned by creator)
   - Creates Key objects for all members
   - Transfers Keys to members
   - Shares Chatroom
```

#### Sending a Message

```
1. Frontend reads chatroom.last_chat_id
2. Encrypts message with AES-256-GCM
3. Call send_message(chatroom, key, previous_chat_id, encrypted_content, clock)
4. Move contract:
   - Verifies Key belongs to chatroom
   - Verifies previous_chat_id matches last_chat_id (concurrency check)
   - Creates new Chat object
   - Updates chatroom.last_chat_id
   - Transfers Chat to sender
```

#### Reading Chat History

```
1. Query chatroom.last_chat_id
2. Fetch Chat object by ID
3. Decrypt encrypted_content using Key
4. Follow previous_chat_id to previous message
5. Repeat until previous_chat_id is none()
```

### Abilities Explained

#### Chatroom: `has key` (Shared Object)
- No `store` ability: Shared objects cannot be transferred
- Shared via `transfer::share_object()`
- Accessible by everyone, but updates require transactions

#### Chat: `has key, store` (Owned Object)
- `key`: Makes it a Sui object
- `store`: Allows transfer to sender
- Owned by message sender

#### Key: `has key, store` (Owned Object)
- `key`: Makes it a Sui object
- `store`: Allows transfer to members during chatroom creation
- Owned by chatroom members
- Used for access control

### Error Codes

- `EInvalidPreviousChatId (1)`: `previous_chat_id` doesn't match `chatroom.last_chat_id`
- `EKeyMismatch (2)`: Key doesn't belong to the specified chatroom
- `EEmptyMemberList (3)`: Member list is empty
- `EInvalidKeyLength (4)`: Key is not 32 bytes

## Frontend

Built with React + Vite + Radix UI, using `@mysten/dapp-kit` for wallet integration.

### Key Features

- Wallet connection (Sui Wallet, zkLogin with Google)
- Chatroom creation and management
- Real-time message updates (Pusher)
- User profiles (MongoDB)
- Encrypted messaging (AES-256-GCM)

## Project Structure

```
.
├── move/                    # Move smart contracts
│   ├── sources/
│   │   ├── sui_chat.move   # Main entry points
│   │   ├── chatroom.move   # Chatroom shared object
│   │   ├── chat.move       # Chat owned object
│   │   └── key.move        # Key owned object
│   └── Move.toml
└── sui_hackathon/           # Frontend application
    ├── src/
    │   ├── components/     # React components
    │   ├── hooks/          # Custom hooks
    │   ├── lib/            # Utilities (crypto, zklogin, etc.)
    │   └── App.tsx         # Main app component
    └── README.md           # Detailed documentation
```

## License

MIT

