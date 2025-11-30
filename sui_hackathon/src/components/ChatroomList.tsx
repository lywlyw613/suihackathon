import { useChatrooms } from "../hooks/useChatrooms";
import { formatAddress } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Box, Flex, Text, Card, Button, Spinner } from "@radix-ui/themes";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import { getAllChatroomNames } from "../lib/chatroom-names";
import { EditChatroomNameModal } from "./EditChatroomNameModal";
import { getAvatarUrl } from "../lib/avatar";
import { getUserProfile } from "../lib/user-profile";

interface ChatroomMember {
  address: string;
  avatarUrl: string;
}

export function ChatroomList() {
  const { chatrooms, isLoading } = useChatrooms();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const [chatroomNames, setChatroomNames] = useState<Record<string, string>>({});
  const [editingChatroomId, setEditingChatroomId] = useState<string | null>(null);
  const [chatroomMembers, setChatroomMembers] = useState<Record<string, ChatroomMember[]>>({});

  // Load chatroom names when account or chatrooms change
  useEffect(() => {
    // Only load chatroom names if user has chatrooms and is logged in
    if (currentAccount?.address && chatrooms.length > 0) {
      getAllChatroomNames(currentAccount.address)
        .then((names) => {
          setChatroomNames(names);
        })
        .catch(() => {
          // Silently fail - don't log errors for expected database connection issues
          // The API will return empty object on error, which is fine
        });
    } else {
      // Clear chatroom names if no chatrooms
      setChatroomNames({});
    }
  }, [currentAccount?.address, chatrooms.length]);

  // Load members for each chatroom (from creator and any Key owners we can find)
  useEffect(() => {
    const loadMembers = async () => {
      const membersMap: Record<string, ChatroomMember[]> = {};
      
      for (const chatroom of chatrooms) {
        const members: ChatroomMember[] = [];
        // Add creator
        try {
          const creatorProfile = await getUserProfile(chatroom.creator);
          members.push({
            address: chatroom.creator,
            avatarUrl: getAvatarUrl(chatroom.creator, creatorProfile),
          });
        } catch (error) {
          members.push({
            address: chatroom.creator,
            avatarUrl: getAvatarUrl(chatroom.creator),
          });
        }
        
        membersMap[chatroom.objectId] = members;
      }
      
      setChatroomMembers(membersMap);
    };

    if (chatrooms.length > 0) {
      loadMembers();
    }
  }, [chatrooms]);

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
          const members = chatroomMembers[chatroom.objectId] || [];
          const creatorMember = members.find(m => m.address === chatroom.creator) || {
            address: chatroom.creator,
            avatarUrl: getAvatarUrl(chatroom.creator),
          };
          
          return (
            <Card
              key={chatroom.objectId}
              style={{ 
                cursor: "pointer",
                background: "var(--x-gray-700)",
                border: "1px solid var(--x-border)",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--x-gray-600)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--x-gray-700)";
              }}
            >
              <Flex align="center" justify="between">
                <Flex 
                  align="center" 
                  gap="3" 
                  style={{ flex: 1 }}
                  onClick={() => navigate(`/chatroom/${chatroom.objectId}`)}
                >
                  {/* Avatar */}
                  <img
                    src={creatorMember.avatarUrl}
                    alt={formatAddress(chatroom.creator)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid var(--x-border)",
                    }}
                    onError={(e) => {
                      // Fallback to initials if image fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement("div");
                        fallback.style.cssText = `
                          width: 48px;
                          height: 48px;
                          border-radius: 50%;
                          background: var(--blue-9);
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          color: white;
                          font-weight: bold;
                          font-size: 16px;
                        `;
                        fallback.textContent = formatAddress(chatroom.creator).slice(0, 2).toUpperCase();
                        parent.insertBefore(fallback, target);
                      }
                    }}
                  />
                  <Box style={{ flex: 1 }}>
                    <Text 
                      size="3" 
                      weight="medium" 
                      style={{ 
                        display: "block", 
                        color: "var(--x-white)",
                        marginBottom: "var(--x-spacing-xs)",
                      }}
                    >
                      {displayName}
                    </Text>
                    <Flex align="center" gap="2" mb="1">
                      {/* Member avatars */}
                      {members.length > 0 && (
                        <Flex gap="1" align="center">
                          {members.slice(0, 3).map((member, idx) => (
                            <img
                              key={member.address}
                              src={member.avatarUrl}
                              alt={formatAddress(member.address)}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                border: "1px solid var(--x-border)",
                                marginLeft: idx > 0 ? -8 : 0,
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />
                          ))}
                          {members.length > 3 && (
                            <Text size="1" style={{ color: "var(--x-text-secondary)", marginLeft: -4 }}>
                              +{members.length - 3}
                            </Text>
                          )}
                        </Flex>
                      )}
                      <Text size="2" style={{ color: "var(--x-text-secondary)" }}>
                        {members.length} {members.length === 1 ? "member" : "members"}
                      </Text>
                    </Flex>
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
                    <Text color="blue" style={{ fontSize: "12px" }}>→</Text>
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
