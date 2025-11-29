import { Dialog, Box, Flex, Text, Button } from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";
import { formatAddress } from "../lib/utils";

interface Friend {
  address: string;
  name?: string;
  avatarUrl?: string;
  bio?: string;
}

interface FriendsListModalProps {
  friends: Friend[];
  isOpen: boolean;
  onClose: () => void;
}

export function FriendsListModal({ friends, isOpen, onClose }: FriendsListModalProps) {
  const navigate = useNavigate();

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
          Friends ({friends.length})
        </Dialog.Title>

        <Box mt="4" style={{ maxHeight: 400, overflowY: "auto" }}>
          {friends.length === 0 ? (
            <Text style={{ color: "var(--x-text-secondary)" }}>No friends yet</Text>
          ) : (
            <Flex direction="column" gap="2">
              {friends.map((friend) => (
                <Box
                  key={friend.address}
                  style={{
                    padding: "var(--x-spacing-md)",
                    background: "var(--x-gray-700)",
                    border: "1px solid var(--x-border)",
                    borderRadius: "var(--x-radius-md)",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--x-bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--x-gray-700)";
                  }}
                  onClick={() => {
                    navigate(`/profile/${friend.address}`);
                    onClose();
                  }}
                >
                  <Flex align="center" gap="3">
                    {friend.avatarUrl ? (
                      <img
                        src={friend.avatarUrl}
                        alt="Avatar"
                        className="x-avatar"
                        style={{ width: 40, height: 40 }}
                      />
                    ) : (
                      <Box
                        className="x-avatar"
                        style={{
                          width: 40,
                          height: 40,
                          background: "var(--x-gray-500)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--x-white)",
                          fontSize: "14px",
                          fontWeight: "bold",
                        }}
                      >
                        {formatAddress(friend.address).slice(0, 2).toUpperCase()}
                      </Box>
                    )}
                    <Box style={{ flex: 1 }}>
                      <Text size="3" weight="medium" style={{ display: "block", color: "var(--x-white)" }}>
                        {friend.name || formatAddress(friend.address)}
                      </Text>
                      <Text size="2" style={{ color: "var(--x-text-secondary)" }}>
                        {formatAddress(friend.address)}
                      </Text>
                      {friend.bio && (
                        <Text size="2" style={{ color: "var(--x-text-secondary)", marginTop: "var(--space-1)" }}>
                          {friend.bio}
                        </Text>
                      )}
                    </Box>
                  </Flex>
                </Box>
              ))}
            </Flex>
          )}
        </Box>

        <Flex justify="end" mt="4">
          <Button onClick={onClose} className="x-button-primary">
            Close
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

