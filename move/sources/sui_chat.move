module sui_chat::sui_chat;

use sui_chat::chatroom::{Self, Chatroom};
use sui_chat::chat::{Self, Chat};
use sui_chat::key::{Self, Key};
use sui::object::{Self, ID};
use sui::tx_context::{Self, TxContext};
use sui::transfer;
use std::option;
use std::vector;

/// Error codes
const EInvalidPreviousChatId: u64 = 1;
const EKeyMismatch: u64 = 2;
const EEmptyMemberList: u64 = 3;
const EInvalidKeyLength: u64 = 4;

/// System message for the first chat
const SYSTEM_MESSAGE: vector<u8> = b"This chat is encrypted and recorded on Sui Chain";

/// Create a new chatroom with initial system message and distribute keys
public fun create_chatroom(
    member_addresses: vector<address>,
    key: vector<u8>, // 32 bytes for AES-256-GCM
    ctx: &mut TxContext,
) {
    // Validate key length (32 bytes for AES-256)
    assert!(vector::length(&key) == 32, EInvalidKeyLength);
    
    // Validate member list is not empty
    assert!(vector::length(&member_addresses) > 0, EEmptyMemberList);
    
    let creator = tx_context::sender(ctx);
    
    // Create chatroom
    let mut chatroom = chatroom::create(creator, ctx);
    let chatroom_id = object::id(&chatroom);
    
    // Create first system chat (unencrypted)
    // Use creator as sender for system message (or could use @0x0 for system)
    let first_chat = chat::create(
        chatroom_id,
        creator, // Use creator as sender for system message
        option::none(), // No previous chat
        SYSTEM_MESSAGE, // Unencrypted system message
        ctx,
    );
    let first_chat_id = chat::id(&first_chat);
    
    // Transfer first chat to creator (or could be shared, but owned is simpler)
    transfer::public_transfer(first_chat, creator);
    
    // Update chatroom with first chat ID
    chatroom::update_last_chat_id(&mut chatroom, first_chat_id);
    
    // Create and distribute keys to all members
    let len = vector::length(&member_addresses);
    let mut i = 0;
    while (i < len) {
        let member = *vector::borrow(&member_addresses, i);
        let key_obj = key::create(chatroom_id, key, ctx);
        transfer::public_transfer(key_obj, member);
        i = i + 1;
    };
    
    // Share the chatroom to make it accessible
    chatroom::share(chatroom);
}

/// Send a message to the chatroom
/// Requires: sender must own a Key object for this chatroom
/// Ensures: previous_chat_id matches chatroom's last_chat_id to prevent concurrent conflicts
public fun send_message(
    chatroom: &mut Chatroom,
    key: &Key,
    previous_chat_id: option::Option<ID>,
    encrypted_content: vector<u8>,
    ctx: &mut TxContext,
) {
    let chatroom_id = object::id(chatroom);
    let sender = tx_context::sender(ctx);
    
    // Verify the key belongs to this chatroom
    assert!(key::verify_chatroom(key, chatroom_id), EKeyMismatch);
    
    // Verify previous_chat_id matches the current last_chat_id
    let current_last_chat_id = chatroom::last_chat_id(chatroom);
    let matches = if (option::is_some(&current_last_chat_id) && option::is_some(&previous_chat_id)) {
        let current_id = *option::borrow(&current_last_chat_id);
        let prev_id = *option::borrow(&previous_chat_id);
        current_id == prev_id
    } else {
        option::is_none(&current_last_chat_id) && option::is_none(&previous_chat_id)
    };
    assert!(matches, EInvalidPreviousChatId);
    
    // Create new chat object
    let new_chat = chat::create(
        chatroom_id,
        sender,
        previous_chat_id,
        encrypted_content,
        ctx,
    );
    let new_chat_id = chat::id(&new_chat);
    
    // Update chatroom's last_chat_id
    chatroom::update_last_chat_id(chatroom, new_chat_id);
    
    // Transfer chat to sender
    transfer::public_transfer(new_chat, sender);
}

