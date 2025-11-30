import { useChatrooms } from "../hooks/useChatrooms";
import { formatAddress } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Box, Flex, Text, Card, Button, Spinner } from "@radix-ui/themes";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import { getAllChatroomNames } from "../lib/chatroom-names";
import { EditChatroomNameModal } from "./EditChatroomNameModal";

export function ChatroomList() {
  const { chatrooms, isLoading } = useChatrooms();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const [chatroomNames, setChatroomNames] = useState<Record<string, string>>({});
  const [editingChatroomId, setEditingChatroomId] = useState<string | null>(null);

  // Load chatroom names when account or chatrooms change
  useEffect(() => {
    if (currentAccount?.address && chatrooms.length > 0) {
      getAllChatroomNames(currentAccount.address)
        .then((names) => {
          setChatroomNames(names);
        })
        .catch((error) => {
          console.error("Error loading chatroom names:", error);
        });
    }
  }, [currentAccount?.address, chatrooms.length]);

  const handleNameSaved = async () => {
    if (currentAccount?.address) {
      const names = await getAllChatroomNames(currentAccount.address);
      setChatroomNames(names);
    }
  };

  if (isLoading) {
    return (
      <Flex align="center" justify="center" py="8">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (chatrooms.length === 0) {
    return (
      <Box style={{ textAlign: "center", padding: "var(--space-8)" }}>
        <Text size="4" color="gray" mb="4" style={{ display: "block" }}>
          No chatrooms yet
        </Text>
        <Button onClick={() => navigate("/create")} size="3">
          Create Chatroom
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Flex direction="column" gap="2">
        {chatrooms.map((chatroom) => {
          const customName = chatroomNames[chatroom.objectId];
          const displayName = customName || `Chatroom ${formatAddress(chatroom.objectId)}`;
          
          return (
            <Card
              key={chatroom.objectId}
              style={{ 
                cursor: "pointer",
                background: "var(--x-gray-700)",
                border: "1px solid var(--x-border)",
              }}
            >
              <Flex align="center" justify="between">
                <Flex 
                  align="center" 
                  gap="3" 
                  style={{ flex: 1 }}
                  onClick={() => navigate(`/chatroom/${chatroom.objectId}`)}
                >
                  <Box
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "var(--blue-9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                    }}
                  >
                    {formatAddress(chatroom.creator).slice(0, 2)}
                  </Box>
                  <Box>
                    <Text size="3" weight="medium" style={{ display: "block", color: "var(--x-white)" }}>
                      {displayName}
                    </Text>
                    <Text size="2" style={{ display: "block", color: "var(--x-text-secondary)" }}>
                      Created by {formatAddress(chatroom.creator)}
                    </Text>
                    <Text size="1" style={{ color: "var(--x-text-secondary)" }}>
                      Created {chatroom.createdAt ? formatDistanceToNow(new Date(chatroom.createdAt), { addSuffix: true }) : "Unknown"}
                    </Text>
                  </Box>
                </Flex>
                <Flex gap="2" align="center">
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingChatroomId(chatroom.objectId);
                    }}
                    style={{ 
                      color: "var(--x-text-secondary)",
                      minWidth: "auto",
                    }}
                  >
                    ✏️
                  </Button>
                  {chatroom.lastChatId && (
                    <Text color="blue">→</Text>
                  )}
                </Flex>
              </Flex>
            </Card>
          );
        })}
      </Flex>

      {editingChatroomId && (
        <EditChatroomNameModal
          chatroomId={editingChatroomId}
          currentName={chatroomNames[editingChatroomId] || null}
          isOpen={true}
          onClose={() => setEditingChatroomId(null)}
          onSave={handleNameSaved}
        />
      )}
    </>
  );
}
