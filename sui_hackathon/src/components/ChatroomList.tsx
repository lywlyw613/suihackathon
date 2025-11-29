import { useChatrooms } from "../hooks/useChatrooms";
import { formatAddress } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Box, Flex, Text, Card, Button, Spinner } from "@radix-ui/themes";

export function ChatroomList() {
  const { chatrooms, isLoading } = useChatrooms();
  const navigate = useNavigate();

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
    <Flex direction="column" gap="2">
      {chatrooms.map((chatroom) => (
        <Card
          key={chatroom.objectId}
          onClick={() => navigate(`/chatroom/${chatroom.objectId}`)}
          style={{ cursor: "pointer" }}
        >
          <Flex align="center" justify="between">
            <Flex align="center" gap="3" style={{ flex: 1 }}>
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
                <Text size="3" weight="medium" style={{ display: "block" }}>
                  Chatroom {formatAddress(chatroom.objectId)}
                </Text>
                <Text size="2" color="gray" style={{ display: "block" }}>
                  Created by {formatAddress(chatroom.creator)}
                </Text>
                <Text size="1" color="gray">
                  Created {chatroom.createdAt ? formatDistanceToNow(new Date(chatroom.createdAt), { addSuffix: true }) : "Unknown"}
                </Text>
              </Box>
            </Flex>
            {chatroom.lastChatId && (
              <Text color="blue">→</Text>
            )}
          </Flex>
        </Card>
      ))}
    </Flex>
  );
}
