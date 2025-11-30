import { Dialog, Box, Flex, Text, Button } from "@radix-ui/themes";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { formatAddress } from "../lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ChatroomInfoModalProps {
  chatroomId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatroomInfoModal({ chatroomId, isOpen, onClose }: ChatroomInfoModalProps) {
  // Fetch chatroom object data from chain
  const { data: chatroomObject, isLoading } = useSuiClientQuery(
    "getObject",
    {
      id: chatroomId,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
        showPreviousTransaction: true,
      },
    },
    {
      enabled: isOpen && !!chatroomId,
    }
  );

  if (!isOpen) return null;

  const fields = chatroomObject?.data?.content && "fields" in chatroomObject.data.content
    ? (chatroomObject.data.content.fields as any)
    : null;

  const createdAt = fields?.created_at 
    ? (typeof fields.created_at === "string" ? Number(fields.created_at) : fields.created_at)
    : null;

  // Convert timestamp if needed
  let displayTimestamp = createdAt;
  if (displayTimestamp && displayTimestamp < 978307200000) {
    displayTimestamp = displayTimestamp * 1000;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content
        style={{
          maxWidth: 700,
          maxHeight: "80vh",
          overflowY: "auto",
          background: "var(--x-black)",
          border: "1px solid var(--x-border)",
        }}
      >
        <Dialog.Title style={{ color: "var(--x-white)", fontWeight: 700, marginBottom: "var(--x-spacing-md)" }}>
          Chatroom On-Chain Data
        </Dialog.Title>

        {isLoading ? (
          <Box py="6" style={{ textAlign: "center" }}>
            <Text style={{ color: "var(--x-text-secondary)" }}>Loading...</Text>
          </Box>
        ) : chatroomObject?.data ? (
          <Flex direction="column" gap="4">
            {/* Object ID */}
            <Box>
              <Text size="2" weight="bold" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
                Object ID
              </Text>
              <Text size="3" style={{ color: "var(--x-white)", fontFamily: "monospace", wordBreak: "break-all" }}>
                {chatroomObject.data.objectId}
              </Text>
            </Box>

            {/* Creator */}
            {fields?.creator && (
              <Box>
                <Text size="2" weight="bold" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
                  Creator
                </Text>
                <Text size="3" style={{ color: "var(--x-white)", fontFamily: "monospace" }}>
                  {formatAddress(fields.creator)}
                </Text>
              </Box>
            )}

            {/* Created At */}
            {displayTimestamp && (
              <Box>
                <Text size="2" weight="bold" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
                  Created At
                </Text>
                <Text size="3" style={{ color: "var(--x-white)" }}>
                  {new Date(displayTimestamp).toLocaleString()}
                </Text>
                <Text size="1" style={{ color: "var(--x-text-secondary)", marginTop: "var(--x-spacing-xs)" }}>
                  {formatDistanceToNow(new Date(displayTimestamp), { addSuffix: true })}
                </Text>
              </Box>
            )}

            {/* Last Chat ID */}
            {fields?.last_chat_id && (
              <Box>
                <Text size="2" weight="bold" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
                  Last Chat ID
                </Text>
                <Text size="3" style={{ color: "var(--x-white)", fontFamily: "monospace", wordBreak: "break-all" }}>
                  {typeof fields.last_chat_id === "string" 
                    ? fields.last_chat_id 
                    : fields.last_chat_id.fields?.id || "None"}
                </Text>
              </Box>
            )}

            {/* Owner */}
            {chatroomObject.data.owner && (
              <Box>
                <Text size="2" weight="bold" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
                  Owner
                </Text>
                <Text size="3" style={{ color: "var(--x-white)" }}>
                  {typeof chatroomObject.data.owner === "string"
                    ? chatroomObject.data.owner
                    : "Shared Object"}
                </Text>
              </Box>
            )}

            {/* Version */}
            {chatroomObject.data.version && (
              <Box>
                <Text size="2" weight="bold" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
                  Version
                </Text>
                <Text size="3" style={{ color: "var(--x-white)" }}>
                  {chatroomObject.data.version}
                </Text>
              </Box>
            )}

            {/* Previous Transaction */}
            {chatroomObject.data.previousTransaction && (
              <Box>
                <Text size="2" weight="bold" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
                  Previous Transaction
                </Text>
                <Text size="3" style={{ color: "var(--x-white)", fontFamily: "monospace", wordBreak: "break-all" }}>
                  {chatroomObject.data.previousTransaction}
                </Text>
              </Box>
            )}

            {/* Raw Data */}
            <Box>
              <Text size="2" weight="bold" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
                Raw Object Data
              </Text>
              <Box
                style={{
                  background: "var(--x-gray-800)",
                  border: "1px solid var(--x-border)",
                  borderRadius: "var(--x-radius-md)",
                  padding: "var(--x-spacing-md)",
                  maxHeight: 300,
                  overflowY: "auto",
                }}
              >
                <pre style={{ 
                  color: "var(--x-white)", 
                  fontSize: "12px",
                  fontFamily: "monospace",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}>
                  {JSON.stringify(chatroomObject.data, null, 2)}
                </pre>
              </Box>
            </Box>

            {/* View on Sui Explorer */}
            <Box mt="4">
              <Button
                className="x-button-primary"
                onClick={() => {
                  window.open(`https://suiexplorer.com/object/${chatroomId}?network=devnet`, "_blank");
                }}
                style={{ width: "100%" }}
              >
                View on Sui Explorer
              </Button>
            </Box>
          </Flex>
        ) : (
          <Box py="6" style={{ textAlign: "center" }}>
            <Text style={{ color: "var(--x-text-secondary)" }}>Failed to load chatroom data</Text>
          </Box>
        )}

        <Flex justify="end" mt="6">
          <Button onClick={onClose} className="x-button-secondary">
            Close
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

