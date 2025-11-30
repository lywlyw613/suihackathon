import { useState, useEffect } from "react";
import { Dialog, Button, Flex, Box, Text } from "@radix-ui/themes";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { saveChatroomName } from "../lib/chatroom-names";

interface EditChatroomNameModalProps {
  chatroomId: string;
  currentName: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function EditChatroomNameModal({
  chatroomId,
  currentName,
  isOpen,
  onClose,
  onSave,
}: EditChatroomNameModalProps) {
  const account = useCurrentAccount();
  const [name, setName] = useState(currentName || "");
  const [isSaving, setIsSaving] = useState(false);

  // Update name when currentName changes
  useEffect(() => {
    setName(currentName || "");
  }, [currentName]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Name cannot be empty");
      return;
    }

    if (!account?.address) {
      alert("Please connect your wallet first");
      return;
    }

    setIsSaving(true);
    try {
      await saveChatroomName(account.address, chatroomId, name.trim());
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving chatroom name:", error);
      alert(error.message || "Failed to save chatroom name");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content
        style={{
          maxWidth: 500,
          background: "var(--x-black)",
          border: "1px solid var(--x-border)",
        }}
      >
        <Dialog.Title style={{ color: "var(--x-white)", fontWeight: 700 }}>
          Edit Chatroom Name
        </Dialog.Title>

        <Box mt="4">
          <Text size="2" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
            Chatroom ID: {chatroomId.slice(0, 8)}...{chatroomId.slice(-6)}
          </Text>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter custom name for this chatroom"
            style={{
              width: "100%",
              padding: "12px 16px",
              minHeight: "44px",
              lineHeight: "1.5",
              fontSize: "15px",
              boxSizing: "border-box",
              background: "var(--x-gray-700)",
              border: "1px solid var(--x-border)",
              borderRadius: "var(--x-radius-md)",
              color: "var(--x-white)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave();
              }
            }}
          />
        </Box>

        <Flex gap="3" justify="end" mt="6">
          <Button
            onClick={onClose}
            className="x-button-secondary"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="x-button-primary"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
