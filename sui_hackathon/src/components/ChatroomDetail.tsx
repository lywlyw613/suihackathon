import { useParams, useNavigate } from "react-router-dom";
import { useCurrentAccount, useSuiClientQuery, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, MODULE_NAMES, FUNCTION_NAMES } from "../lib/constants";
import { encryptMessage, decryptMessage } from "../lib/crypto";
import { ChatData, KeyObject } from "../types";
import { formatAddress } from "../lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Box, Flex, Text, Button, TextField, Card } from "@radix-ui/themes";

export function ChatroomDetail() {
  const { chatroomId } = useParams<{ chatroomId: string }>();
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [key, setKey] = useState<KeyObject | null>(null);
  const [chats, setChats] = useState<ChatData[]>([]);
  const [previousChatId, setPreviousChatId] = useState<string | null>(null);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const client = useSuiClient();

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
        last_chat_id: { fields?: { id: string } } | null;
      };
      setPreviousChatId(fields.last_chat_id?.fields?.id || null);
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
              chatroom_id: string;
              sender: string;
              timestamp: string;
              previous_chat_id: { fields?: { id: string } } | null;
              encrypted_content: string;
            };

            // Decrypt content
            let decryptedContent = "";
            try {
              // encrypted_content is stored as hex string
              const hexContent = fields.encrypted_content;
              const encryptedBytes = new Uint8Array(
                hexContent.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || []
              );
              decryptedContent = await decryptMessage(encryptedBytes, key.key);
            } catch (e) {
              console.error("Error decrypting:", e);
              // For system message (first chat), content might not be encrypted
              if (fields.encrypted_content) {
                decryptedContent = fields.encrypted_content;
              }
            }

            chatList.push({
              objectId: currentChatId,
              chatroomId: fields.chatroom_id,
              sender: fields.sender,
              timestamp: Number(fields.timestamp),
              previousChatId: fields.previous_chat_id?.fields?.id || null,
              encryptedContent: new Uint8Array(),
              decryptedContent,
            });

            // Move to previous chat
            currentChatId = fields.previous_chat_id?.fields?.id || null;
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
    };

    fetchChats();
  }, [previousChatId, key, client]);

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
    // Note: previousChatId can be null for the first message

    setIsSending(true);
    try {
      // Encrypt message
      const encrypted = await encryptMessage(message, key.key);
      const encryptedBytes = Array.from(encrypted);

      // Create transaction
      const tx = new Transaction();
      tx.moveCall({
        package: PACKAGE_ID,
        module: MODULE_NAMES.SUI_CHAT,
        function: FUNCTION_NAMES.SEND_MESSAGE,
        arguments: [
          tx.object(chatroomId), // chatroom (shared object)
          tx.object(key.objectId), // key
          previousChatId ? tx.pure.id(previousChatId) : tx.pure.option("ID", null), // previous_chat_id
          tx.pure.vector("u8", encryptedBytes), // encrypted_content
        ],
      });

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log("Message sent:", result);
            setMessage("");
            // Refresh chats after sending
            // The useEffect will automatically refetch when previousChatId updates
            setTimeout(() => {
              window.location.reload(); // Simple refresh for now
            }, 1000);
          },
          onError: (error) => {
            console.error("Error sending message:", error);
            alert("Failed to send message. Please try again.");
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
                justify={chat.sender === account?.address ? "end" : "start"}
              >
                <Card
                  style={{
                    maxWidth: "70%",
                    background:
                      chat.sender === account?.address
                        ? "var(--blue-9)"
                        : "var(--gray-4)",
                  }}
                >
                  <Text size="3">{chat.decryptedContent || "..."}</Text>
                  <Text size="1" color="gray" style={{ display: "block", marginTop: "var(--space-1)" }}>
                    {formatDistanceToNow(new Date(chat.timestamp), {
                      addSuffix: true,
                    })}
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
      </Box>
    </Flex>
  );
}
