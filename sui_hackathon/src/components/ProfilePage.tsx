import { useParams, useNavigate } from "react-router-dom";
import { useSuiClientQuery, useCurrentAccount } from "@mysten/dapp-kit";
import { PACKAGE_ID, MODULE_NAMES } from "../lib/constants";
import { formatAddress } from "../lib/utils";
import { KeyObject } from "../types";
import { getUserProfile, getFriends, saveUserProfile, UserProfile } from "../lib/user-profile";
import { Box, Container, Flex, Heading, Text, Card, Button, Spinner } from "@radix-ui/themes";
import { useState, useEffect } from "react";
import { EditProfileModal } from "./EditProfileModal";
import { FriendsListModal } from "./FriendsListModal";

export function ProfilePage() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const isOwnProfile = currentAccount?.address === address;

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);

  // Fetch user profile from MongoDB
  useEffect(() => {
    if (!address) return;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const userProfile = await getUserProfile(address);
        setProfile(userProfile);
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [address]);

  // Fetch friends
  useEffect(() => {
    if (!address) return;

    const loadFriends = async () => {
      try {
        const friendsList = await getFriends(address);
        setFriends(friendsList);
        setFriendsCount(friendsList.length);
      } catch (error) {
        console.error("Error loading friends:", error);
      }
    };

    loadFriends();
  }, [address]);

  // Fetch profile user's Key objects (chatrooms)
  const { data: ownedObjects, isLoading: isLoadingChatrooms } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        StructType: `${PACKAGE_ID}::${MODULE_NAMES.KEY}::Key`,
      },
      options: {
        showContent: true,
      },
    },
    {
      enabled: !!address,
    }
  );

  // Fetch current user's Key objects to find common chatrooms
  const { data: myOwnedObjects } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAccount?.address as string,
      filter: {
        StructType: `${PACKAGE_ID}::${MODULE_NAMES.KEY}::Key`,
      },
      options: {
        showContent: true,
      },
    },
    {
      enabled: !!currentAccount && !!address,
    }
  );

  const profileKeys: KeyObject[] = [];
  const myKeys: KeyObject[] = [];

  if (ownedObjects?.data) {
    for (const obj of ownedObjects.data) {
      if (obj.data?.content && "fields" in obj.data.content) {
        const fields = obj.data.content.fields as {
          chatroom_id: string;
          key: string;
        };
        profileKeys.push({
          objectId: obj.data.objectId,
          chatroomId: fields.chatroom_id,
          key: new Uint8Array(),
        });
      }
    }
  }

  if (myOwnedObjects?.data) {
    for (const obj of myOwnedObjects.data) {
      if (obj.data?.content && "fields" in obj.data.content) {
        const fields = obj.data.content.fields as {
          chatroom_id: string;
          key: string;
        };
        myKeys.push({
          objectId: obj.data.objectId,
          chatroomId: fields.chatroom_id,
          key: new Uint8Array(),
        });
      }
    }
  }

  const myChatroomIds = new Set(myKeys.map((k) => k.chatroomId));
  const chatroomCount = profileKeys.length;

  // Update profile with chatroom count
  useEffect(() => {
    if (profile && chatroomCount !== profile.chatroomCount) {
      setProfile({ ...profile, chatroomCount });
    }
  }, [chatroomCount]);

  const handleSaveProfile = async (updatedProfile: Partial<UserProfile>) => {
    await saveUserProfile(updatedProfile);
    const newProfile = await getUserProfile(address!);
    setProfile(newProfile);
  };

  const [avatarError, setAvatarError] = useState(false);

  if (isLoadingProfile || isLoadingChatrooms) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", background: "var(--x-black)" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  const displayName = profile?.name || formatAddress(address || "");
  const displayBio = profile?.bio || "";

  return (
    <Box style={{ minHeight: "100vh", background: "var(--x-black)" }}>
      {/* Header with back arrow */}
      <Box
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--x-black)",
          borderBottom: "1px solid var(--x-border)",
        }}
      >
        <Container size="4" py="3" px="4">
          <Flex align="center" gap="4">
            <Button
              variant="ghost"
              onClick={() => navigate("/home")}
              style={{ color: "var(--x-white)", padding: "var(--x-spacing-sm)" }}
            >
              ←
            </Button>
            <Box>
              <Text size="4" weight="bold" style={{ color: "var(--x-white)" }}>
                {displayName}
              </Text>
            </Box>
          </Flex>
        </Container>
      </Box>

      <Container size="4" px="0">
        {/* Banner Image */}
        <Box
          style={{
            width: "100%",
            height: 200,
            background: profile?.bannerUrl
              ? `url(${profile.bannerUrl}) center/cover`
              : "var(--x-gray-700)",
            position: "relative",
          }}
        >
          {profile?.bannerUrl && (
            <img
              src={profile.bannerUrl}
              alt="Banner"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={() => {}}
            />
          )}

          {/* Edit Profile Button (only for own profile) */}
          {isOwnProfile && (
            <Box
              style={{
                position: "absolute",
                bottom: "var(--x-spacing-md)",
                right: "var(--x-spacing-md)",
                zIndex: 20,
              }}
            >
              <Button
                onClick={() => {
                  console.log("Edit Profile clicked");
                  setIsEditModalOpen(true);
                }}
                className="x-button-secondary"
                style={{ 
                  fontWeight: 700,
                  cursor: "pointer",
                  pointerEvents: "auto",
                }}
              >
                Edit Profile
              </Button>
            </Box>
          )}
        </Box>

        {/* Profile Info Section */}
        <Box
          style={{
            position: "relative",
            padding: "0 var(--x-spacing-lg) var(--x-spacing-lg)",
            marginTop: -80, // Overlap with banner
          }}
        >
          {/* Avatar - positioned at bottom of banner */}
          <Box
            style={{
              position: "relative",
              marginBottom: "var(--x-spacing-md)",
            }}
          >
            {profile?.avatarUrl && !avatarError ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="x-avatar-large"
                onError={() => setAvatarError(true)}
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  border: "4px solid var(--x-black)",
                  objectFit: "cover",
                }}
              />
            ) : (
              <Box
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  background: "var(--x-gray-700)",
                  border: "4px solid var(--x-black)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--x-white)",
                  fontSize: "48px",
                  fontWeight: "bold",
                }}
              >
                {formatAddress(address || "").slice(0, 2).toUpperCase()}
              </Box>
            )}
          </Box>

          {/* User Info */}
          <Box mb="4">
            <Heading size="7" style={{ color: "var(--x-white)", fontWeight: 700, marginBottom: "var(--x-spacing-xs)" }}>
              {displayName}
            </Heading>
            <Text size="2" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-md)" }}>
              {formatAddress(address || "")}
            </Text>

            {displayBio && (
              <Text size="3" style={{ color: "var(--x-white)", display: "block", marginBottom: "var(--x-spacing-md)" }}>
                {displayBio}
              </Text>
            )}

            {/* Stats */}
            <Flex gap="4" mt="4">
              <Box
                style={{ cursor: "pointer" }}
                onClick={() => setIsFriendsModalOpen(true)}
              >
                <Text size="3" weight="bold" style={{ color: "var(--x-white)", marginRight: "var(--x-spacing-xs)" }}>
                  {friendsCount}
                </Text>
                <Text size="3" style={{ color: "var(--x-text-secondary)" }}>
                  Friends
                </Text>
              </Box>
              <Box>
                <Text size="3" weight="bold" style={{ color: "var(--x-white)", marginRight: "var(--x-spacing-xs)" }}>
                  {chatroomCount}
                </Text>
                <Text size="3" style={{ color: "var(--x-text-secondary)" }}>
                  Chatrooms
                </Text>
              </Box>
            </Flex>
          </Box>

          {/* Chatrooms Section */}
          <Card
            style={{
              background: "var(--x-black)",
              border: "1px solid var(--x-border)",
              marginTop: "var(--x-spacing-lg)",
            }}
          >
            <Heading size="5" mb="4" style={{ color: "var(--x-white)", fontWeight: 700 }}>
              Chatrooms ({chatroomCount})
            </Heading>

            {profileKeys.length === 0 ? (
              <Text style={{ color: "var(--x-text-secondary)" }}>No chatrooms</Text>
            ) : (
              <Flex direction="column" gap="2">
                {profileKeys.map((key) => {
                  const isCommon = myChatroomIds.has(key.chatroomId);
                  return (
                    <Card
                      key={key.objectId}
                      style={{
                        background: isCommon ? "var(--x-gray-800)" : "var(--x-gray-700)",
                        border: "1px solid var(--x-border)",
                        cursor: isCommon ? "pointer" : "default",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (isCommon) {
                          e.currentTarget.style.backgroundColor = "var(--x-bg-hover)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isCommon) {
                          e.currentTarget.style.backgroundColor = "var(--x-gray-800)";
                        }
                      }}
                      onClick={() => {
                        if (isCommon) {
                          navigate(`/chatroom/${key.chatroomId}`);
                        }
                      }}
                    >
                      <Flex align="center" justify="between">
                        <Box>
                          <Text size="3" weight="medium" style={{ display: "block", color: "var(--x-white)" }}>
                            {formatAddress(key.chatroomId)}
                          </Text>
                          {isCommon && (
                            <Text size="2" style={{ display: "block", marginTop: "var(--space-1)", color: "var(--x-blue)" }}>
                              You both have access - Click to view
                            </Text>
                          )}
                        </Box>
                        {isCommon && <Text style={{ color: "var(--x-blue)" }}>→</Text>}
                      </Flex>
                    </Card>
                  );
                })}
              </Flex>
            )}
          </Card>
        </Box>
      </Container>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal
          profile={profile || { address: address || "", chatroomCount: 0, friends: [] }}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}

      {/* Friends List Modal */}
      <FriendsListModal
        friends={friends}
        isOpen={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
      />
    </Box>
  );
}
