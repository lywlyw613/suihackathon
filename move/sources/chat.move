module sui_chat::chat;

use sui::object::{Self, ID, UID};
use sui::tx_context::{Self, TxContext};
use std::option;

/// Chat Object - owned by sender, contains encrypted message
public struct Chat has key, store {
    id: UID,
    chatroom_id: ID,
    sender: address,
    timestamp: u64,
    previous_chat_id: option::Option<ID>,
    encrypted_content: vector<u8>,
}

/// Create a new chat object
public fun create(
    chatroom_id: ID,
    sender: address,
    previous_chat_id: option::Option<ID>,
    encrypted_content: vector<u8>,
    ctx: &mut TxContext,
): Chat {
    Chat {
        id: object::new(ctx),
        chatroom_id,
        sender,
        timestamp: tx_context::epoch_timestamp_ms(ctx),
        previous_chat_id,
        encrypted_content,
    }
}

/// Get the chat ID
public fun id(chat: &Chat): ID {
    object::id(chat)
}

/// Get the chatroom ID
public fun chatroom_id(chat: &Chat): ID {
    chat.chatroom_id
}

/// Get the sender address
public fun sender(chat: &Chat): address {
    chat.sender
}

/// Get the timestamp
public fun timestamp(chat: &Chat): u64 {
    chat.timestamp
}

/// Get the previous chat ID
public fun previous_chat_id(chat: &Chat): option::Option<ID> {
    chat.previous_chat_id
}

/// Get the encrypted content
public fun encrypted_content(chat: &Chat): vector<u8> {
    chat.encrypted_content
}

