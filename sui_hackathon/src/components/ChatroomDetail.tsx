import { useParams, useNavigate } from "react-router-dom";
import { useCurrentAccount, useSuiClientQuery, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
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
  const client = useSuiClient();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedChatIdRef = useRef<string | null>(null);

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

    // Subscribe to Pusher channel for this chatroom
    if (pusherClient) {
      const channel = pusherClient.subscribe(`chatroom-${chatroomId}`);
      
      channel.bind('new-message', () => {
        // When new message event is received, refetch chats
        console.log('New message event received, refetching chats...');
        // Trigger refetch by updating previousChatId
        client.getObject({
          id: chatroomId,
          options: { showContent: true },
        }).then((chatroom) => {
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
            setPreviousChatId(parsedLastChatId);
          }
        });
      });

      // Cleanup on unmount
      return () => {
        channel.unbind_all();
        channel.unsubscribe();
      };
    }

    // Set up polling to check for new messages every 3 seconds
    pollingIntervalRef.current = setInterval(async () => {
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
      
      // Build previous_chat_id argument - must match chatroom's last_chat_id exactly
      // Note: Move function expects Option<ID>, and ID is address type
      let previousChatIdArg;
      if (latestPreviousChatId) {
        // If chatroom has a last_chat_id, wrap it in Option
        // Use option with the ID value
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
          previousChatIdArg, // previous_chat_id (must match chatroom's last_chat_id)
          tx.pure.vector("u8", encryptedBytes), // encrypted_content
          tx.object("0x6"), // Clock object at address 0x6
        ],
      });

      // Handle sponsored transactions
      if (useSponsoredTx && isSponsoredTransactionsEnabled()) {
        const sponsorApiUrl = getSponsorApiUrl();
        if (sponsorApiUrl) {
          // Call backend API to sponsor the transaction
          try {
            // Build transaction and serialize to bytes
            const txBytes = await tx.build({ client });
            // Convert Uint8Array to base64 for JSON transmission
            const txBytesBase64 = btoa(String.fromCharCode(...txBytes));
            
            const response = await fetch(sponsorApiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transaction: txBytesBase64,
                sender: account.address,
              }),
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log("Sponsored transaction sent:", result);
              setMessage("");
              // Polling will pick up the new message
              return;
            } else {
              console.error("Failed to sponsor transaction:", await response.text());
              // Fall back to normal transaction
            }
          } catch (error) {
            console.error("Error sponsoring transaction:", error);
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
          onSuccess: (result) => {
            console.log("Message sent:", result);
            setMessage("");
            // Trigger Pusher event to notify other clients (if Pusher is available)
            if (pusherClient && chatroomId) {
              const channel = pusherClient.getChannel(`chatroom-${chatroomId}`);
              if (channel) {
                channel.trigger('client-new-message', {
                  chatroomId,
                  timestamp: Date.now(),
                });
              }
            }
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
    <Flex direction="column" style={{ height: "100vh", background: "var(--gray-2)" }}>
      {/* Header */}
      <Box
        style={{
          background: "var(--gray-3)",
          borderBottom: "1px solid var(--gray-6)",
          padding: "var(--space-4)",
        }}
      >
        <Flex align="center" gap="4">
          <Button variant="ghost" onClick={() => navigate("/home")}>
            ← Back
          </Button>
          <Text size="4" weight="medium">
            Chatroom {formatAddress(chatroomId || "")}
          </Text>
        </Flex>
      </Box>

      {/* Messages */}
      <Box style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)" }}>
        {chats.length === 0 ? (
          <Box style={{ textAlign: "center", padding: "var(--space-8)" }}>
            <Text size="4" color="gray">
              No messages yet. Start the conversation!
            </Text>
          </Box>
        ) : (
          <Flex direction="column" gap="4">
            {chats.map((chat) => (
              <Flex
                key={chat.objectId}
                direction="column"
                gap="1"
                align={chat.sender === account?.address ? "end" : "start"}
                style={{ maxWidth: "70%" }}
              >
                <Flex
                  align="center"
                  gap="2"
                  style={{
                    alignSelf: chat.sender === account?.address ? "flex-end" : "flex-start",
                  }}
                >
                  {chat.sender !== account?.address && (
                    <Text size="1" color="gray" weight="medium">
                      {formatAddress(chat.sender)}
                    </Text>
                  )}
                  <Text size="1" color="gray">
                    {chat.timestamp ? formatDistanceToNow(new Date(chat.timestamp), {
                      addSuffix: true,
                    }) : "Unknown"}
                  </Text>
                </Flex>
                <Card
                  style={{
                    background:
                      chat.sender === account?.address
                        ? "var(--blue-9)"
                        : "var(--gray-4)",
                  }}
                >
                  <Text size="3" style={{ color: chat.sender === account?.address ? "white" : "inherit" }}>
                    {chat.decryptedContent || "..."}
                  </Text>
                </Card>
              </Flex>
            ))}
          </Flex>
        )}
      </Box>

      {/* Input */}
      <Box
        style={{
          background: "var(--gray-3)",
          borderTop: "1px solid var(--gray-6)",
          padding: "var(--space-4)",
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
              <Text size="2" as="label" htmlFor="sponsored-tx" style={{ cursor: "pointer" }}>
                Use sponsored transactions (no gas fee, but requires backend)
              </Text>
            </Flex>
          )}
          <Flex gap="2">
            <TextField.Root
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              disabled={isSending}
              style={{ flex: 1 }}
            />
            <Button onClick={handleSend} disabled={!message.trim() || isSending} size="3">
              {isSending ? "Sending..." : "Send"}
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Flex>
  );
}
