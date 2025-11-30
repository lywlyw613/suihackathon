import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, MODULE_NAMES, FUNCTION_NAMES } from "../lib/constants";
import { generateKey } from "../lib/crypto";
import { getFriends } from "../lib/user-profile";
import { formatAddress } from "../lib/utils";
import { Box, Container, Card, Flex, Heading, Text, TextField, Button } from "@radix-ui/themes";

export function CreateChatroomPage() {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [memberAddresses, setMemberAddresses] = useState<string[]>([account?.address || ""]);
  const [newAddress, setNewAddress] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);

  // Load friends list
  useEffect(() => {
    if (account?.address) {
      getFriends(account.address)
        .then((friendsList) => {
          setFriends(friendsList);
        })
        .catch((error) => {
          console.error("Error loading friends:", error);
        });
    }
  }, [account?.address]);

  const addMember = () => {
    if (newAddress.trim() && !memberAddresses.includes(newAddress.trim())) {
      setMemberAddresses([...memberAddresses, newAddress.trim()]);
      setNewAddress("");
    }
  };

  const removeMember = (address: string) => {
    setMemberAddresses(memberAddresses.filter((a) => a !== address));
  };

  const handleCreate = () => {
    if (memberAddresses.length === 0 || isCreating) return;

    setIsCreating(true);
    const key = generateKey();

    // Create transaction
    const tx = new Transaction();
    tx.moveCall({
      package: PACKAGE_ID,
      module: MODULE_NAMES.SUI_CHAT,
      function: FUNCTION_NAMES.CREATE_CHATROOM,
      arguments: [
        tx.pure.vector("address", memberAddresses), // vector<address>
        tx.pure.vector("u8", Array.from(key)), // vector<u8> (32 bytes)
      ],
    });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: (result) => {
          console.log("Chatroom created:", result);
          setIsCreating(false);
          navigate("/home");
        },
        onError: (error) => {
          console.error("Error creating chatroom:", error);
          setIsCreating(false);
        },
      }
    );
  };

  const addFriendToMembers = (friendAddress: string) => {
    if (!memberAddresses.includes(friendAddress)) {
      setMemberAddresses([...memberAddresses, friendAddress]);
    }
  };

  return (
    <Box style={{ minHeight: "100vh", background: "var(--x-black)" }}>
      <Container size="4" py="8" px="4">
        <Flex gap="6" align="start">
          {/* Main Content */}
          <Card style={{ flex: 1, background: "var(--x-gray-700)", border: "1px solid var(--x-border)" }}>
            <Button 
              variant="ghost" 
              onClick={() => navigate("/home")} 
              mb="6"
              style={{ color: "var(--x-white)" }}
            >
              ← Back
            </Button>

            <Heading size="7" mb="6" style={{ color: "var(--x-white)" }}>
              Create Chatroom
            </Heading>

            {/* Members List */}
            <Box mb="6">
              <Text size="4" weight="medium" mb="2" style={{ display: "block", color: "var(--x-white)" }}>
                Members ({memberAddresses.length})
              </Text>
              <Flex direction="column" gap="2" mb="4">
                {memberAddresses.map((address) => (
                  <Card 
                    key={address}
                    style={{ background: "var(--x-gray-800)", border: "1px solid var(--x-border)" }}
                  >
                    <Flex align="center" justify="between">
                      <Text size="2" style={{ fontFamily: "monospace", color: "var(--x-white)" }}>
                        {formatAddress(address)}
                      </Text>
                      {memberAddresses.length > 1 && (
                        <Button
                          variant="soft"
                          color="red"
                          size="1"
                          onClick={() => removeMember(address)}
                        >
                          Remove
                        </Button>
                      )}
                    </Flex>
                  </Card>
                ))}
              </Flex>

              {/* Add Member */}
              <Flex gap="2">
                <TextField.Root
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMember()}
                  placeholder="Enter wallet address..."
                  style={{ 
                    flex: 1,
                    background: "var(--x-gray-800)",
                    border: "1px solid var(--x-border)",
                    color: "var(--x-white)",
                  }}
                />
                <Button onClick={addMember} size="3" className="x-button-primary">
                  Add
                </Button>
              </Flex>
            </Box>

            {/* Create Button */}
            <Button
              onClick={handleCreate}
              disabled={memberAddresses.length === 0 || isCreating}
              size="3"
              style={{ width: "100%" }}
              className="x-button-primary"
            >
              {isCreating ? "Creating..." : "Create Chatroom"}
            </Button>
          </Card>

          {/* Friends List Sidebar */}
          <Card style={{ width: 300, background: "var(--x-gray-700)", border: "1px solid var(--x-border)" }}>
            <Heading size="5" mb="4" style={{ color: "var(--x-white)" }}>
              Friends ({friends.length})
            </Heading>
            {friends.length === 0 ? (
              <Text size="2" style={{ color: "var(--x-text-secondary)" }}>
                No friends yet. Add friends from their profile pages.
              </Text>
            ) : (
              <Flex direction="column" gap="2">
                {friends.map((friend) => {
                  const isAlreadyAdded = memberAddresses.includes(friend.address);
                  return (
                    <Card
                      key={friend.address}
                      style={{ 
                        background: isAlreadyAdded ? "var(--x-gray-800)" : "var(--x-gray-800)",
                        border: "1px solid var(--x-border)",
                        opacity: isAlreadyAdded ? 0.6 : 1,
                      }}
                    >
                      <Flex align="center" justify="between" gap="2">
                        <Box style={{ flex: 1 }}>
                          <Text size="2" weight="medium" style={{ color: "var(--x-white)", display: "block" }}>
                            {friend.name || formatAddress(friend.address)}
                          </Text>
                          <Text size="1" style={{ color: "var(--x-text-secondary)", fontFamily: "monospace" }}>
                            {formatAddress(friend.address)}
                          </Text>
                        </Box>
                        <Button
                          size="1"
                          onClick={() => addFriendToMembers(friend.address)}
                          disabled={isAlreadyAdded}
                          className={isAlreadyAdded ? "x-button-secondary" : "x-button-primary"}
                        >
                          {isAlreadyAdded ? "✓" : "+"}
                        </Button>
                      </Flex>
                    </Card>
                  );
                })}
              </Flex>
            )}
          </Card>
        </Flex>
      </Container>
    </Box>
  );
}
