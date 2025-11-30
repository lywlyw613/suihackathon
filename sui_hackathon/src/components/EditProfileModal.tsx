import { useState, useRef } from "react";
import { Box, Flex, Text, Button, Dialog, Spinner } from "@radix-ui/themes";
import { UserProfile } from "../lib/user-profile";
import { uploadImageToWalrus, validateImageFile, createImagePreview } from "../lib/walrus";
import { useCurrentAccount } from "@mysten/dapp-kit";

interface EditProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (updatedProfile: Partial<UserProfile>) => Promise<void>;
}

export function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
  const account = useCurrentAccount();
  const [name, setName] = useState(profile.name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Create preview
      const preview = await createImagePreview(file);
      setAvatarPreview(preview);

      // Upload to Walrus
      if (account?.address) {
        const url = await uploadImageToWalrus(file, account.address);
        setAvatarUrl(url);
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setIsUploadingBanner(true);
    try {
      // Create preview
      const preview = await createImagePreview(file);
      setBannerPreview(preview);

      // Upload to Walrus
      if (account?.address) {
        const url = await uploadImageToWalrus(file, account.address);
        setBannerUrl(url);
      }
    } catch (error) {
      console.error("Error uploading banner:", error);
      alert("Failed to upload banner. Please try again.");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    if (!account?.address) {
      alert("Please connect your wallet first");
      return;
    }

    // Security check: ensure we're saving for the current account
    if (profile.address !== account.address) {
      alert("You can only edit your own profile");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        address: account.address, // Always use current account address
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
        bannerUrl: bannerUrl || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Content
        style={{
          maxWidth: 600,
          background: "var(--x-black)",
          border: "1px solid var(--x-border)",
        }}
      >
        <Dialog.Title style={{ color: "var(--x-white)", fontWeight: 700 }}>
          Edit Profile
        </Dialog.Title>

        <Flex direction="column" gap="4" mt="4">
          {/* Banner Upload */}
          <Box>
            <Text size="2" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
              Banner Image
            </Text>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBannerUpload(file);
              }}
            />
            <Button
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploadingBanner}
              className="x-button-secondary"
              style={{ width: "100%" }}
            >
              {isUploadingBanner ? "Uploading..." : "Upload Banner"}
            </Button>
            {bannerPreview && (
              <Box mt="2">
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  style={{
                    width: "100%",
                    maxHeight: 200,
                    objectFit: "cover",
                    borderRadius: "var(--x-radius-md)",
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Avatar Upload */}
          <Box>
            <Text size="2" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
              Avatar Image
            </Text>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />
            <Button
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="x-button-secondary"
              style={{ width: "100%" }}
            >
              {isUploadingAvatar ? "Uploading..." : "Upload Avatar"}
            </Button>
            {avatarPreview && (
              <Box mt="2">
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="x-avatar-large"
                  style={{ width: 80, height: 80 }}
                />
              </Box>
            )}
          </Box>

          {/* Name */}
          <Box>
            <Text size="2" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
              Name
            </Text>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="x-input"
              style={{
                padding: "12px 16px",
                minHeight: "44px",
                lineHeight: "1.5",
                fontSize: "15px",
                boxSizing: "border-box",
              }}
            />
          </Box>

          {/* Bio */}
          <Box>
            <Text size="2" style={{ color: "var(--x-text-secondary)", display: "block", marginBottom: "var(--x-spacing-sm)" }}>
              Bio
            </Text>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              className="x-input"
              style={{ minHeight: 100, width: "100%", resize: "vertical" }}
            />
          </Box>

          {/* Actions */}
          <Flex gap="3" justify="end" mt="4">
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
              {isSaving ? <Spinner size="2" /> : "Save"}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

