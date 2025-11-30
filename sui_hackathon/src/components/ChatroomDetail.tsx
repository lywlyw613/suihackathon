import { useParams, useNavigate } from "react-router-dom";
import { useCurrentAccount, useSuiClientQuery, useSignAndExecuteTransaction, useSuiClient, useSignTransaction } from "@mysten/dapp-kit";
import { useState, useEffect, useRef } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, MODULE_NAMES, FUNCTION_NAMES } from "../lib/constants";
import { encryptMessage, decryptMessage } from "../lib/crypto";
import { ChatData, KeyObject } from "../types";
import { formatAddress } from "../lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pusherClient } from "../lib/pusher-client";
import { isSponsoredTransactionsEnabled, getSponsorApiUrl } from "../lib/sponsored-transactions";
import { Box, Flex, Text, Button, TextField, Card, Switch } from "@radix-ui/themes";
import { getAvatarUrl } from "../lib/avatar";
import { getUserProfile } from "../lib/user-profile";
import { ChatroomInfoModal } from "./ChatroomInfoModal";

export function ChatroomDetail() {
  const { chatroomId } = useParams<{ chatroomId: string }>();
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [key, setKey] = useState<KeyObject | null>(null);
  const [chats, setChats] = useState<ChatData[]>([]);
  const [previousChatId, setPreviousChatId] = useState<string | null>(null);
  const [useSponsoredTx, setUseSponsoredTx] = useState(false);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { mutate: signTransaction } = useSignTransaction();
  const client = useSuiClient();
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCheckedChatIdRef = useRef<string | null>(null);
  const pusherChannelRef = useRef<any>(null); // Store Pusher channel reference
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [senderAvatars, setSenderAvatars] = useState<Record<string, string>>({});
  const [senderProfiles, setSenderProfiles] = useState<Record<string, { name?: string }>>({});

  // Fetch user's Key for this chatroom
  const { data: ownedObjects } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address as string,
      filter: {
        StructType: `${PACKAGE_ID}::${MODULE_NAMES.KEY}::Key`,
      },
      options: {
        showContent: true,
      },
    },
    {
      enabled: !!account && !!chatroomId,
    }
  );

  // Load avatars and profiles for all senders
  useEffect(() => {
    const loadSenderData = async () => {
      const avatarMap: Record<string, string> = {};
      const profileMap: Record<string, { name?: string }> = {};
      const uniqueSenders = new Set(chats.map(chat => chat.sender));
      
      for (const sender of uniqueSenders) {
        try {
          const profile = await getUserProfile(sender);
          avatarMap[sender] = getAvatarUrl(sender, profile);
          profileMap[sender] = {
            name: profile?.name,
          };
        } catch (error) {
          avatarMap[sender] = getAvatarUrl(sender);
          profileMap[sender] = {};
        }
      }
      
      setSenderAvatars(avatarMap);
      setSenderProfiles(profileMap);
    };

    if (chats.length > 0) {
      loadSenderData();
    }
  }, [chats]);

  // Find the key for this chatroom
  useEffect(() => {
    if (ownedObjects?.data && chatroomId) {
      console.log("Looking for key for chatroom:", chatroomId);
      console.log("Owned objects:", ownedObjects.data);
      
      for (const obj of ownedObjects.data) {
        if (obj.data?.content && "fields" in obj.data.content) {
          const fields = obj.data.content.fields as {
            chatroom_id: string | { fields?: { id: string } };
            key: string | number[];
          };
          
          // Handle ID format - could be string or object
          let keyChatroomId: string;
          if (typeof fields.chatroom_id === "string") {
            keyChatroomId = fields.chatroom_id;
          } else if (fields.chatroom_id && typeof fields.chatroom_id === "object" && "fields" in fields.chatroom_id) {
            keyChatroomId = fields.chatroom_id.fields?.id || "";
          } else {
            continue;
          }
          
          console.log("Comparing:", keyChatroomId, "===", chatroomId);
          
          if (keyChatroomId === chatroomId) {
            try {
              // Handle key format - could be hex string or array
              let keyBytes: Uint8Array;
              if (typeof fields.key === "string") {
                // Hex string - check if it's actually a hex string
                if (fields.key.length > 0 && /^[0-9a-fA-F]+$/.test(fields.key)) {
                  keyBytes = new Uint8Array(
                    fields.key.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
                  );
                } else {
                  // If it's not a valid hex string, try to parse as array string
                  throw new Error("Invalid hex string format");
                }
              } else if (Array.isArray(fields.key)) {
                // Array of numbers
                keyBytes = new Uint8Array(fields.key);
              } else {
                console.error("Key field type:", typeof fields.key, fields.key);
                throw new Error(`Invalid key format: ${typeof fields.key}`);
              }
              
              console.log("Found matching key!");
              setKey({
                objectId: obj.data.objectId,
                chatroomId: keyChatroomId,
                key: keyBytes,
              });
            } catch (e) {
              console.error("Error parsing key:", e);
            }
            break;
          }
        }
      }
    }
  }, [ownedObjects, chatroomId]);

  // Fetch Chatroom to get last_chat_id
  const { data: chatroomData } = useSuiClientQuery(
    "getObject",
    {
      id: chatroomId!,
      options: {
        showContent: true,
      },
    },
    {
      enabled: !!chatroomId,
    }
  );

  // Update previousChatId when chatroom updates
  useEffect(() => {
    if (chatroomData?.data?.content && "fields" in chatroomData.data.content) {
      const fields = chatroomData.data.content.fields as {
        last_chat_id: { fields?: { id: string } } | string | null;
      };
      
      // Handle different formats of last_chat_id (same as in handleSend)
      let parsedLastChatId: string | null = null;
      if (fields.last_chat_id === null) {
        parsedLastChatId = null;
      } else if (typeof fields.last_chat_id === "string") {
        parsedLastChatId = fields.last_chat_id;
      } else if (fields.last_chat_id && typeof fields.last_chat_id === "object" && "fields" in fields.last_chat_id) {
        parsedLastChatId = fields.last_chat_id.fields?.id || null;
      }
      
      console.log("Parsed last_chat_id from chatroom:", parsedLastChatId);
      setPreviousChatId(parsedLastChatId);
    }
  }, [chatroomData]);

  // Fetch and decrypt chats - chain traversal from last_chat_id
  useEffect(() => {
    if (!previousChatId || !key || !client) return;

    const fetchChats = async () => {
      const chatList: ChatData[] = [];
      let currentChatId: string | null = previousChatId;

      // Traverse the chain backwards
      while (currentChatId) {
        try {
          // Fetch chat object using SuiClient
          const chatObj = await client.getObject({
            id: currentChatId,
            options: {
              showContent: true,
              showType: true,
            },
          });

          if (chatObj.data?.content && "fields" in chatObj.data.content) {
            const fields = chatObj.data.content.fields as {
              chatroom_id: string | { fields?: { id: string } };
              sender: string;
              timestamp: string | number;
              previous_chat_id: { fields?: { id: string } } | string | null;
              encrypted_content: string | number[];
            };

            console.log("Fetched chat object:", chatObj.data.objectId);
            console.log("Chat fields:", fields);

            // Handle previous_chat_id format first (needed to determine if it's a system message)
            let parsedPreviousChatId: string | null = null;
            if (fields.previous_chat_id === null) {
              parsedPreviousChatId = null;
            } else if (typeof fields.previous_chat_id === "string") {
              parsedPreviousChatId = fields.previous_chat_id;
            } else if (fields.previous_chat_id && typeof fields.previous_chat_id === "object" && "fields" in fields.previous_chat_id) {
              parsedPreviousChatId = fields.previous_chat_id.fields?.id || null;
            }

            // Check if this is the system message (first chat with previous_chat_id = null)
            const isSystemMessage = parsedPreviousChatId === null;

            // Handle encrypted_content - could be array or hex string
            let encryptedBytes: Uint8Array;
            if (Array.isArray(fields.encrypted_content)) {
              // If it's an array of numbers
              encryptedBytes = new Uint8Array(fields.encrypted_content);
            } else if (typeof fields.encrypted_content === "string") {
              // If it's a hex string
              const hexContent = fields.encrypted_content;
              encryptedBytes = new Uint8Array(
                hexContent.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || []
              );
            } else {
              encryptedBytes = new Uint8Array();
            }

            // Decrypt content
            let decryptedContent = "";
            try {
              // System message (first chat with previous_chat_id = null) is not encrypted
              if (isSystemMessage) {
                // System message is stored as plain text bytes
                const textDecoder = new TextDecoder();
                decryptedContent = textDecoder.decode(encryptedBytes);
                // If decoding fails or is empty, use default system message
                if (!decryptedContent || decryptedContent.trim().length === 0) {
                  decryptedContent = "System Message: This chat is encrypted and recorded on Sui Chain";
                }
              } else if (encryptedBytes.length === 0) {
                decryptedContent = "[Empty Message]";
              } else if (encryptedBytes.length < 12) {
                // Encrypted content should have at least 12 bytes (IV) + encrypted data
                console.warn("Encrypted content too short, might be corrupted");
                decryptedContent = "[Decryption Failed: Invalid format]";
              } else {
                // Regular encrypted message - decrypt it
                decryptedContent = await decryptMessage(encryptedBytes, key.key);
              }
            } catch (e) {
              console.error("Error decrypting:", e);
              console.error("Encrypted bytes length:", encryptedBytes.length);
              console.error("Key length:", key.key.length);
              console.error("Is system message:", isSystemMessage);
              // Fallback: show error message
              if (isSystemMessage) {
                // For system message, try to decode as text
                try {
                  const textDecoder = new TextDecoder();
                  decryptedContent = textDecoder.decode(encryptedBytes) || "System Message: This chat is encrypted and recorded on Sui Chain";
                } catch {
                  decryptedContent = "System Message: This chat is encrypted and recorded on Sui Chain";
                }
              } else {
                decryptedContent = "[Decryption Failed]";
              }
            }

            // Handle chatroom_id format
            let parsedChatroomId: string;
            if (typeof fields.chatroom_id === "string") {
              parsedChatroomId = fields.chatroom_id;
            } else if (fields.chatroom_id && typeof fields.chatroom_id === "object" && "fields" in fields.chatroom_id) {
              parsedChatroomId = fields.chatroom_id.fields?.id || "";
            } else {
              parsedChatroomId = "";
            }

            console.log("Parsed chatroom_id:", parsedChatroomId);
            console.log("Parsed previous_chat_id:", parsedPreviousChatId);

            // Parse timestamp - handle both string and number formats
            // Move contract uses epoch_timestamp_ms, so it should be milliseconds
            let parsedTimestamp: number;
            if (typeof fields.timestamp === "string") {
              parsedTimestamp = Number(fields.timestamp);
            } else {
              parsedTimestamp = fields.timestamp;
            }
            
            // If timestamp seems too small (likely in seconds instead of milliseconds), convert it
            // Timestamps after 2001-01-01 in milliseconds are > 978307200000
            if (parsedTimestamp < 978307200000) {
              // Likely in seconds, convert to milliseconds
              parsedTimestamp = parsedTimestamp * 1000;
            }
            
            console.log("Raw timestamp:", fields.timestamp, "Parsed:", parsedTimestamp, "Date:", new Date(parsedTimestamp));

            chatList.push({
              objectId: currentChatId,
              chatroomId: parsedChatroomId,
              sender: fields.sender,
              timestamp: parsedTimestamp,
              previousChatId: parsedPreviousChatId,
              encryptedContent: encryptedBytes,
              decryptedContent,
            });

            // Move to previous chat
            currentChatId = parsedPreviousChatId;
          } else {
            break;
          }
        } catch (error) {
          console.error("Error fetching chat:", error);
          break;
        }
      }

      // Reverse to show oldest first
      setChats(chatList.reverse());
      
      // Update last checked chat ID for polling
      if (chatList.length > 0) {
        const latestChat = chatList[chatList.length - 1];
        lastCheckedChatIdRef.current = latestChat.objectId;
      }
    };

    fetchChats();
  }, [previousChatId, key, client]);

  // Set up Pusher real-time updates and polling
  useEffect(() => {
    if (!chatroomId || !key || !client) return;

    // Subscribe to Pusher channel for this chatroom (if available)
    let pusherCleanup: (() => void) | null = null;
    
    if (pusherClient) {
      const channelName = `chatroom-${chatroomId}`;
      console.log(`[Pusher] Subscribing to channel: ${channelName}`);
      
      // Wait for connection to be ready
      const subscribeToChannel = () => {
        if (!pusherClient) return () => {};
        
        try {
          // Subscribe to channel (Pusher will queue if not connected yet)
          const channel = pusherClient.subscribe(channelName);
          
          // Store channel reference for triggering events
          pusherChannelRef.current = channel;
          
          // Wait for subscription to be successful
          channel.bind('pusher:subscription_succeeded', () => {
            console.log(`[Pusher] ✅ Subscribed to ${channelName}`);
            console.log(`[Pusher] Channel subscribed: ${channel.subscribed}`);
          });

          // Listen for new message events (client events must start with 'client-')
          const messageHandler = (data: any) => {
            console.log(`[Pusher] 📨 New message event received for ${channelName}:`, data);
            
            // Immediately trigger refetch - polling will also catch it, but this makes it faster
            if (chatroomId) {
              console.log(`[Pusher] 🔄 Triggering immediate chat refresh for chatroom: ${chatroomId}`);
              
              // Wait a short time for transaction to be confirmed, then check
              setTimeout(async () => {
                try {
                  const chatroom = await client.getObject({
                    id: chatroomId,
                    options: { showContent: true },
                  });
                  
                  if (chatroom.data?.content && "fields" in chatroom.data.content) {
                    const fields = chatroom.data.content.fields as {
                      last_chat_id: { fields?: { id: string } } | string | null;
                    };
                    let parsedLastChatId: string | null = null;
                    if (fields.last_chat_id === null) {
                      parsedLastChatId = null;
                    } else if (typeof fields.last_chat_id === "string") {
                      parsedLastChatId = fields.last_chat_id;
                    } else if (fields.last_chat_id && typeof fields.last_chat_id === "object" && "fields" in fields.last_chat_id) {
                      parsedLastChatId = fields.last_chat_id.fields?.id || null;
                    }
                    
                    // Check if last_chat_id has actually changed
                    if (parsedLastChatId && parsedLastChatId !== lastCheckedChatIdRef.current) {
                      console.log(`[Pusher] 🔄 Updating previousChatId to: ${parsedLastChatId}`);
                      setPreviousChatId(parsedLastChatId);
                      lastCheckedChatIdRef.current = parsedLastChatId;
                    } else {
                      console.log(`[Pusher] ⏳ No change yet, polling will catch it soon`);
                    }
                  }
                } catch (err) {
                  console.error('[Pusher] ❌ Error refetching chatroom after event:', err);
                  // Polling will catch it anyway
                }
              }, 1500); // Wait 1.5 seconds for transaction to be confirmed
            }
          };
          
          // Bind the event handler
          channel.bind('client-new-message', messageHandler);
          console.log(`[Pusher] 👂 Listening for 'client-new-message' events on ${channelName}`);
          
          // Also test if we can receive events by logging all channel events
          channel.bind_global((eventName: string, data: any) => {
            if (eventName === 'client-new-message') {
              console.log(`[Pusher] 🌐 Global event handler received: ${eventName}`, data);
            }
          });

          // Handle subscription errors
          channel.bind('pusher:subscription_error', (error: any) => {
            console.error('[Pusher] ❌ Subscription error:', error?.error?.data?.message || error?.message);
            console.error('[Pusher] Full error:', error);
          });

          // Cleanup function
          return () => {
            try {
              console.log(`[Pusher] 🧹 Cleaning up channel: ${channelName}`);
              channel.unbind_all();
              channel.unsubscribe();
            } catch (e) {
              // Ignore cleanup errors
            }
            pusherChannelRef.current = null;
          };
        } catch (error) {
          console.error('[Pusher] ❌ Failed to subscribe:', error);
          return () => {}; // Return empty cleanup if subscription fails
        }
      };

      // Subscribe immediately (Pusher will handle connection state)
      pusherCleanup = subscribeToChannel();
      
      // Also listen for connection events to resubscribe if needed
      const connectionHandler = () => {
        console.log('[Pusher] 🔌 Connection established, resubscribing...');
        if (pusherCleanup) pusherCleanup();
        pusherCleanup = subscribeToChannel();
      };
      
      // If already connected, subscribe now
      if (pusherClient.connection.state === 'connected') {
        console.log('[Pusher] Already connected, subscribing immediately');
      } else {
        console.log(`[Pusher] Waiting for connection (current state: ${pusherClient.connection.state})`);
        pusherClient.connection.bind('connected', connectionHandler);
      }
      
      // Return cleanup that also unbinds connection handler
      return () => {
        pusherClient?.connection.unbind('connected', connectionHandler);
        if (pusherCleanup) pusherCleanup();
      };
    } else {
      console.warn('[Pusher] ⚠️ Pusher client not available, using polling only');
    }

    // Set up polling to check for new messages every 3 seconds
    if (!chatroomId) return; // Ensure chatroomId is defined
    
    pollingIntervalRef.current = setInterval(async () => {
      if (!chatroomId) return; // Double check in callback
      try {
        const chatroom = await client.getObject({
          id: chatroomId,
          options: { showContent: true },
        });

        if (chatroom.data?.content && "fields" in chatroom.data.content) {
          const fields = chatroom.data.content.fields as {
            last_chat_id: { fields?: { id: string } } | string | null;
          };
          
          let currentLastChatId: string | null = null;
          if (fields.last_chat_id === null) {
            currentLastChatId = null;
          } else if (typeof fields.last_chat_id === "string") {
            currentLastChatId = fields.last_chat_id;
          } else if (fields.last_chat_id && typeof fields.last_chat_id === "object" && "fields" in fields.last_chat_id) {
            currentLastChatId = fields.last_chat_id.fields?.id || null;
          }

          // If last_chat_id has changed, trigger refetch
          if (currentLastChatId !== lastCheckedChatIdRef.current && currentLastChatId !== null) {
            console.log('New message detected, updating...');
            setPreviousChatId(currentLastChatId);
            lastCheckedChatIdRef.current = currentLastChatId;
          }
        }
      } catch (error) {
        console.error('Error polling for new messages:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [chatroomId, key, client]);

  if (!key) {
    return (
      <Box p="8" style={{ textAlign: "center" }}>
        <Text size="4" color="gray" mb="4" style={{ display: "block" }}>
          You don't have access to this chatroom
        </Text>
        <Button onClick={() => navigate("/home")} size="3">
          Go Back
        </Button>
      </Box>
    );
  }

  const handleSend = async () => {
    if (!message.trim() || !key || !chatroomId || isSending || !account) return;

    setIsSending(true);
    try {
      // Re-fetch chatroom to get the latest last_chat_id (important for concurrency)
      const latestChatroom = await client.getObject({
        id: chatroomId,
        options: {
          showContent: true,
        },
      });

      let latestPreviousChatId: string | null = null;
      if (latestChatroom.data?.content && "fields" in latestChatroom.data.content) {
        const fields = latestChatroom.data.content.fields as {
          last_chat_id: { fields?: { id: string } } | string | null;
        };
        
        // Handle different formats of last_chat_id
        if (fields.last_chat_id === null) {
          latestPreviousChatId = null;
        } else if (typeof fields.last_chat_id === "string") {
          latestPreviousChatId = fields.last_chat_id;
        } else if (fields.last_chat_id && typeof fields.last_chat_id === "object" && "fields" in fields.last_chat_id) {
          latestPreviousChatId = fields.last_chat_id.fields?.id || null;
        }
        
        console.log("Raw last_chat_id from chatroom:", fields.last_chat_id);
        console.log("Parsed latestPreviousChatId:", latestPreviousChatId);
      } else {
        console.error("Failed to get chatroom content:", latestChatroom);
      }

      console.log("Latest previousChatId from chatroom:", latestPreviousChatId);
      console.log("Current previousChatId state:", previousChatId);

      if (latestPreviousChatId === null && previousChatId !== null) {
        console.warn("Chatroom last_chat_id is null but state has previousChatId, using null");
      }

      // Encrypt message
      const encrypted = await encryptMessage(message, key.key);
      const encryptedBytes = Array.from(encrypted);

      // Create transaction
      const tx = new Transaction();
      
      // Set sender (required for all transactions)
      if (account) {
        tx.setSender(account.address);
      }
      
      // Build previous_chat_id argument - must match chatroom's last_chat_id exactly
      // Note: Move function expects Option<ID>, and ID is an alias for address
      // Use tx.pure.option with "address" type (since ID is an alias for address)
      let previousChatIdArg;
      if (latestPreviousChatId) {
        // If chatroom has a last_chat_id, wrap it in Option<ID>
        // Use "address" as the type since ID is an alias for address
        previousChatIdArg = tx.pure.option("address", latestPreviousChatId);
      } else {
        // If chatroom has no last_chat_id, pass None
        previousChatIdArg = tx.pure.option("address", null);
      }
      
      console.log("previousChatIdArg:", previousChatIdArg);
      console.log("latestPreviousChatId:", latestPreviousChatId);

      tx.moveCall({
        package: PACKAGE_ID,
        module: MODULE_NAMES.SUI_CHAT,
        function: FUNCTION_NAMES.SEND_MESSAGE,
        arguments: [
          tx.object(chatroomId), // chatroom (shared object)
          tx.object(key.objectId), // key
          previousChatIdArg, // previous_chat_id (Option<ID>, use null for None)
          tx.pure.vector("u8", encryptedBytes), // encrypted_content
          tx.object("0x6"), // Clock object at address 0x6
        ],
      });

      // Handle sponsored transactions
      if (useSponsoredTx && isSponsoredTransactionsEnabled()) {
        const sponsorApiUrl = getSponsorApiUrl();
        if (sponsorApiUrl && account) {
          // For sponsored transactions, we need:
          // 1. Get gas payment info from backend
          // 2. Set gas payment in transaction
          // 3. User signs the transaction (with gas payment)
          // 4. Send signed transaction to backend
          // 5. Backend adds sponsor signature and executes
          try {
            // First, get gas payment info from backend
            // Use /api/sponsor-gas-info endpoint
            const gasInfoUrl = sponsorApiUrl.replace('/sponsor', '/sponsor-gas-info');
            const gasInfoResponse = await fetch(gasInfoUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sender: account.address,
              }),
            });
            
            if (!gasInfoResponse.ok) {
              throw new Error("Failed to get gas payment info");
            }
            
            const gasInfo = await gasInfoResponse.json();
            
            // Set gas payment in transaction BEFORE user signs
            tx.setGasPayment([{
              objectId: gasInfo.gasCoin.objectId,
              version: gasInfo.gasCoin.version,
              digest: gasInfo.gasCoin.digest,
            }]);
            tx.setGasOwner(gasInfo.sponsorAddress);
            
            // Now user signs the transaction (which includes gas payment)
            signTransaction(
              {
                transaction: tx,
                account: account,
              },
              {
                onSuccess: async (signedTx) => {
                  try {
                    // signedTx.bytes is a string (base64 encoded), signature is also a string
                    const txBytesBase64 = signedTx.bytes;
                    const signatureBase64 = signedTx.signature;
                    
                    const response = await fetch(sponsorApiUrl, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        transaction: txBytesBase64,
                        signature: signatureBase64,
                        sender: account.address,
                      }),
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      console.log("Sponsored transaction sent:", result);
                      setMessage("");
                      // Trigger Pusher event after transaction is confirmed
                      // Wait a bit for transaction to be processed
                      setTimeout(() => {
                        if (pusherChannelRef.current) {
                          try {
                            const channel = pusherChannelRef.current;
                            const isSubscribed = channel.subscribed;
                            
                            console.log('[Pusher] 📤 Attempting to trigger event (sponsored tx)...');
                            console.log('[Pusher] Channel subscribed:', isSubscribed);
                            
                            // Try to trigger even if subscription status is unclear
                            // Pusher will handle it gracefully
                            const eventData = {
                              chatroomId,
                              timestamp: Date.now(),
                              sender: account.address,
                            };
                            
                            const result = channel.trigger('client-new-message', eventData);
                            
                            if (result === true) {
                              console.log('[Pusher] ✅ Event triggered successfully (sponsored tx):', eventData);
                            } else {
                              console.warn('[Pusher] ⚠️ Event trigger returned:', result, '- may need to enable client events in Pusher Dashboard');
                            }
                          } catch (error: any) {
                            // Client events might not be enabled in Pusher app settings
                            console.error('[Pusher] ❌ Failed to trigger event:', error?.message || error);
                            if (error?.message?.includes('client event') || error?.message?.includes('not enabled')) {
                              console.error('[Pusher] 💡 Make sure "Enable client events" is ON in Pusher Dashboard:');
                              console.error('[Pusher]    1. Go to https://dashboard.pusher.com/');
                              console.error('[Pusher]    2. Select your app');
                              console.error('[Pusher]    3. Settings → App Settings');
                              console.error('[Pusher]    4. Enable "Enable client events"');
                            }
                          }
                        } else {
                          console.warn('[Pusher] ⚠️ Channel ref not available');
                        }
                      }, 1000); // Wait 1 second for transaction to be processed
                      setIsSending(false);
                    } else {
                      const errorText = await response.text();
                      console.error("Failed to sponsor transaction:", errorText);
                      alert("Failed to sponsor transaction. Please try again.");
                      setIsSending(false);
                    }
                  } catch (error) {
                    console.error("Error sending sponsored transaction:", error);
                    alert("Failed to sponsor transaction. Please try again.");
                    setIsSending(false);
                  }
                },
                onError: (error: Error) => {
                  console.error("Error signing transaction:", error);
                  alert("Failed to sign transaction. Please try again.");
                  setIsSending(false);
                },
              }
            );
            return; // Don't execute normal transaction
          } catch (error) {
            console.error("Error preparing sponsored transaction:", error);
            // Fall back to normal transaction
          }
        }
      }

      signAndExecute(
        {
          transaction: tx,
          account: account, // Explicitly pass the account to ensure it matches
        },
        {
          onSuccess: async (result) => {
            console.log("Message sent:", result);
            setMessage("");
            
            // Wait for transaction to be confirmed on-chain before triggering Pusher event
            // This ensures the data is available when other clients receive the event
            const waitForConfirmation = async () => {
              if (!chatroomId) return;
              
              const previousLastChatId = lastCheckedChatIdRef.current;
              console.log('[Pusher] ⏳ Waiting for transaction confirmation...');
              
              // Wait for transaction to be processed (Sui typically takes 2-3 seconds)
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Verify the transaction is on-chain by checking the chatroom
              let retries = 0;
              const maxRetries = 5;
              
              while (retries < maxRetries) {
                try {
                  const chatroom = await client.getObject({
                    id: chatroomId,
                    options: { showContent: true },
                  });
                  
                  // Check if last_chat_id has been updated (indicating new message is on-chain)
                  if (chatroom.data?.content && "fields" in chatroom.data.content) {
                    const fields = chatroom.data.content.fields as {
                      last_chat_id: { fields?: { id: string } } | string | null;
                    };
                    const currentLastChatId = typeof fields.last_chat_id === "string" 
                      ? fields.last_chat_id 
                      : fields.last_chat_id?.fields?.id || null;
                    
                    // If last_chat_id has changed from what we last checked, transaction is confirmed
                    if (currentLastChatId && currentLastChatId !== previousLastChatId) {
                      console.log('[Pusher] ✅ Transaction confirmed on-chain, triggering event');
                      break;
                    }
                  }
                  
                  // Wait a bit more and retry
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  retries++;
                  console.log(`[Pusher] ⏳ Still waiting for confirmation... (${retries}/${maxRetries})`);
                } catch (error) {
                  console.warn('[Pusher] Error checking transaction status, retrying...', error);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  retries++;
                }
              }
              
              // Now trigger Pusher event
              if (pusherChannelRef.current) {
                try {
                  const channel = pusherChannelRef.current;
                  const isSubscribed = channel.subscribed;
                  
                  console.log('[Pusher] 📤 Attempting to trigger event (normal tx)...');
                  console.log('[Pusher] Channel subscribed:', isSubscribed);
                  
                  const eventData = {
                    chatroomId,
                    timestamp: Date.now(),
                    sender: account.address,
                  };
                  
                  const triggerResult = channel.trigger('client-new-message', eventData);
                  
                  if (triggerResult === true) {
                    console.log('[Pusher] ✅ Event triggered successfully (normal tx):', eventData);
                    console.log('[Pusher] Event should be broadcast to all subscribers of channel:', `chatroom-${chatroomId}`);
                  } else {
                    console.warn('[Pusher] ⚠️ Event trigger returned:', triggerResult);
                  }
                } catch (error: any) {
                  console.error('[Pusher] ❌ Failed to trigger event:', error?.message || error);
                }
              } else {
                console.warn('[Pusher] ⚠️ Channel ref not available');
              }
            };
            
            // Start waiting for confirmation
            waitForConfirmation();
            // Refresh chats after sending - polling will pick up the new message
            // No need to reload the page anymore
          },
          onError: (error) => {
            console.error("Error sending message:", error);
            console.error("Current account:", account?.address);
            if (error instanceof Error && error.message.includes("Account mismatch")) {
              alert("Account mismatch. Please reconnect your wallet and try again.");
            } else {
              alert("Failed to send message. Please try again.");
            }
          },
        }
      );
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Flex direction="column" style={{ height: "100vh", background: "var(--x-black)" }}>
      {/* Header */}
      <Box
        style={{
          background: "var(--x-black)",
          borderBottom: "1px solid var(--x-border)",
          padding: "var(--x-spacing-md)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Flex align="center" gap="4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/home")}
            style={{ color: "var(--x-white)" }}
          >
            ← Back
          </Button>
          <Text 
            size="4" 
            weight="medium" 
            style={{ 
              color: "var(--x-white)",
              cursor: "pointer",
              flex: 1,
            }}
            onClick={() => setShowInfoModal(true)}
          >
            Chatroom {formatAddress(chatroomId || "")}
          </Text>
          <Button
            variant="ghost"
            size="1"
            onClick={() => setShowInfoModal(true)}
            style={{ color: "var(--x-text-secondary)" }}
          >
            ℹ️
          </Button>
        </Flex>
      </Box>

      {/* Messages */}
      <Box style={{ flex: 1, overflowY: "auto", padding: "var(--x-spacing-md)" }}>
        {chats.length === 0 ? (
          <Box style={{ textAlign: "center", padding: "var(--x-spacing-xl)" }}>
            <Text size="4" style={{ color: "var(--x-text-secondary)" }}>
              No messages yet. Start the conversation!
            </Text>
          </Box>
        ) : (
          <Flex direction="column" gap="3">
            {chats.map((chat) => {
              const isOwnMessage = chat.sender === account?.address;
              const avatarUrl = senderAvatars[chat.sender] || getAvatarUrl(chat.sender);
              const senderProfile = senderProfiles[chat.sender];
              const senderDisplayName = senderProfile?.name || formatAddress(chat.sender);
              
              return (
                <Flex
                  key={chat.objectId}
                  gap="3"
                  align="start"
                  style={{
                    flexDirection: isOwnMessage ? "row-reverse" : "row",
                    maxWidth: "75%",
                    alignSelf: isOwnMessage ? "flex-end" : "flex-start",
                  }}
                >
                  {/* Avatar */}
                  <Box
                    onClick={() => navigate(`/profile/${chat.sender}`)}
                    style={{
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={avatarUrl}
                      alt={formatAddress(chat.sender)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid var(--x-border)",
                        transition: "opacity 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "0.8";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement("div");
                          fallback.style.cssText = `
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            background: var(--blue-9);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 14px;
                            cursor: pointer;
                            transition: opacity 0.2s;
                          `;
                          fallback.textContent = formatAddress(chat.sender).slice(0, 2).toUpperCase();
                          fallback.onclick = () => navigate(`/profile/${chat.sender}`);
                          fallback.onmouseenter = () => {
                            fallback.style.opacity = "0.8";
                          };
                          fallback.onmouseleave = () => {
                            fallback.style.opacity = "1";
                          };
                          parent.insertBefore(fallback, target);
                        }
                      }}
                    />
                  </Box>
                  
                  {/* Message Content */}
                  <Flex direction="column" gap="1" style={{ flex: 1 }}>
                    <Flex
                      align="center"
                      gap="2"
                      style={{
                        flexDirection: isOwnMessage ? "row-reverse" : "row",
                      }}
                    >
                      {!isOwnMessage && (
                        <Text 
                          size="2" 
                          weight="medium" 
                          style={{ color: "var(--x-white)" }}
                        >
                          {senderDisplayName}
                        </Text>
                      )}
                      <Text 
                        size="1" 
                        style={{ color: "var(--x-text-secondary)" }}
                      >
                        {chat.timestamp ? formatDistanceToNow(new Date(chat.timestamp), {
                          addSuffix: true,
                        }) : "Unknown"}
                      </Text>
                    </Flex>
                    <Card
                      style={{
                        background: isOwnMessage
                          ? "var(--blue-9)"
                          : "var(--x-gray-800)",
                        border: "1px solid var(--x-border)",
                        padding: "var(--x-spacing-md)",
                        borderRadius: "var(--x-radius-lg)",
                      }}
                    >
                      <Text 
                        size="3" 
                        style={{ 
                          color: isOwnMessage ? "white" : "var(--x-white)",
                          wordBreak: "break-word",
                        }}
                      >
                        {chat.decryptedContent || "..."}
                      </Text>
                    </Card>
                  </Flex>
                </Flex>
              );
            })}
          </Flex>
        )}
      </Box>

      {/* Input */}
      <Box
        style={{
          background: "var(--x-black)",
          borderTop: "1px solid var(--x-border)",
          padding: "var(--x-spacing-md)",
          position: "sticky",
          bottom: 0,
        }}
      >
        <Flex direction="column" gap="2">
          {isSponsoredTransactionsEnabled() && (
            <Flex align="center" gap="2">
              <Switch
                checked={useSponsoredTx}
                onCheckedChange={setUseSponsoredTx}
                id="sponsored-tx"
              />
              <Text 
                size="2" 
                as="label" 
                htmlFor="sponsored-tx" 
                style={{ 
                  cursor: "pointer",
                  color: "var(--x-text-secondary)",
                }}
              >
                Use sponsored transactions (no gas fee, but requires backend)
              </Text>
            </Flex>
          )}
          <Flex gap="2">
            <TextField.Root
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              disabled={isSending}
              style={{ 
                flex: 1,
                background: "var(--x-gray-800)",
                border: "1px solid var(--x-border)",
                color: "var(--x-white)",
              }}
            />
            <Button 
              onClick={handleSend} 
              disabled={!message.trim() || isSending} 
              size="3"
              className="x-button-primary"
            >
              {isSending ? "Sending..." : "Send"}
            </Button>
          </Flex>
        </Flex>
      </Box>

      {/* Chatroom Info Modal */}
      {chatroomId && (
        <ChatroomInfoModal
          chatroomId={chatroomId}
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
        />
      )}
    </Flex>
  );
}
