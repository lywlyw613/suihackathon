import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, MODULE_NAMES, FUNCTION_NAMES } from "../lib/constants";
import { generateKey } from "../lib/crypto";
import { Box, Container, Card, Flex, Heading, Text, TextField, Button } from "@radix-ui/themes";

export function CreateChatroomPage() {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [memberAddresses, setMemberAddresses] = useState<string[]>([account?.address || ""]);
  const [newAddress, setNewAddress] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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
        tx.object("0x6"), // Clock object at address 0x6
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

  return (
    <Box style={{ minHeight: "100vh", background: "var(--gray-2)" }}>
      <Container size="3" py="8" px="4">
        <Card>
          <Button variant="ghost" onClick={() => navigate("/home")} mb="6">
            ← Back
          </Button>

          <Heading size="7" mb="6">
            Create Chatroom
          </Heading>

          {/* Members List */}
          <Box mb="6">
            <Text size="4" weight="medium" mb="2" style={{ display: "block" }}>
              Members ({memberAddresses.length})
            </Text>
            <Flex direction="column" gap="2" mb="4">
              {memberAddresses.map((address) => (
                <Card key={address}>
                  <Flex align="center" justify="between">
                    <Text size="2" style={{ fontFamily: "monospace" }}>
                      {address}
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
                style={{ flex: 1 }}
              />
              <Button onClick={addMember} size="3">
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
          >
            {isCreating ? "Creating..." : "Create Chatroom"}
          </Button>
        </Card>
      </Container>
    </Box>
  );
}
