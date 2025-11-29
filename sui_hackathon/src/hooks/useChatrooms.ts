import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { PACKAGE_ID, MODULE_NAMES } from "../lib/constants";
import { KeyObject, ChatroomData } from "../types";
import { hexToUint8Array } from "../lib/crypto";

/**
 * Hook to fetch user's Key objects and corresponding Chatrooms
 */
export function useChatrooms() {
  const account = useCurrentAccount();

  // Fetch all owned objects
  const { data: ownedObjects, isLoading } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address as string,
      filter: {
        StructType: `${PACKAGE_ID}::${MODULE_NAMES.KEY}::Key`,
      },
      options: {
        showContent: true,
        showType: true,
      },
    },
    {
      enabled: !!account,
    }
  );

  // Extract Key objects
  const keys: KeyObject[] = [];
  if (ownedObjects?.data) {
    for (const obj of ownedObjects.data) {
      if (obj.data?.content && "fields" in obj.data.content) {
        const fields = obj.data.content.fields as {
          chatroom_id: string | { fields?: { id: string } };
          key: string | number[];
        };
        try {
          // Handle chatroom_id format - could be string or object
          let chatroomId: string;
          if (typeof fields.chatroom_id === "string") {
            chatroomId = fields.chatroom_id;
          } else if (fields.chatroom_id && typeof fields.chatroom_id === "object" && "fields" in fields.chatroom_id) {
            chatroomId = fields.chatroom_id.fields?.id || "";
          } else {
            continue;
          }
          
          // Handle key format - could be hex string or array
          let keyBytes: Uint8Array;
          if (Array.isArray(fields.key)) {
            // If it's already an array
            keyBytes = new Uint8Array(fields.key);
          } else if (typeof fields.key === "string") {
            // If it's a hex string
            keyBytes = hexToUint8Array(fields.key);
          } else {
            console.error("Key field type:", typeof fields.key, fields.key);
            throw new Error(`Invalid key format: ${typeof fields.key}`);
          }
          keys.push({
            objectId: obj.data.objectId,
            chatroomId: chatroomId,
            key: keyBytes,
          });
        } catch (e) {
          console.error("Error parsing key:", e);
        }
      }
    }
  }

  // Fetch Chatroom data for each key
  const chatroomIds = keys.map((k) => k.chatroomId);
  const { data: chatroomsData } = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: chatroomIds,
      options: {
        showContent: true,
        showType: true,
      },
    },
    {
      enabled: chatroomIds.length > 0,
    }
  );

  const chatrooms: (ChatroomData & { key: KeyObject })[] = [];
  if (chatroomsData && keys.length > 0) {
    for (let i = 0; i < chatroomsData.length; i++) {
      const chatroomObj = chatroomsData[i];
      const key = keys[i];
      if (
        chatroomObj.data?.content &&
        "fields" in chatroomObj.data.content
      ) {
        const fields = chatroomObj.data.content.fields as {
          creator: string;
          last_chat_id: { fields?: { id: string } } | null;
          created_at: string;
        };
        const lastChatId = fields.last_chat_id?.fields?.id || null;
        chatrooms.push({
          objectId: chatroomObj.data.objectId,
          creator: fields.creator,
          lastChatId: lastChatId,
          createdAt: Number(fields.created_at),
          key,
        });
      }
    }
  }

  return {
    chatrooms,
    isLoading,
  };
}

