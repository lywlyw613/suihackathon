/**
 * Chatroom Names Management with MongoDB
 * 
 * This module provides functions to manage custom names for chatrooms
 * Each wallet can set a custom name for each chatroom
 */

// For local development, use empty string (relative URLs)
// For production, use Vercel URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface ChatroomName {
  walletAddress: string;
  chatroomId: string;
  customName: string;
}

/**
 * Get custom name for a specific chatroom
 */
export async function getChatroomName(
  walletAddress: string,
  chatroomId: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/chatroom-names?walletAddress=${encodeURIComponent(walletAddress)}&chatroomId=${encodeURIComponent(chatroomId)}`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.customName || null;
  } catch (error) {
    console.error('Error getting chatroom name:', error);
    return null;
  }
}

/**
 * Get all chatroom names for a wallet
 */
export async function getAllChatroomNames(
  walletAddress: string
): Promise<Record<string, string>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/chatroom-names?walletAddress=${encodeURIComponent(walletAddress)}`
    );
    
    if (!response.ok) {
      return {};
    }
    
    const data = await response.json();
    return data.names || {};
  } catch (error) {
    console.error('Error getting all chatroom names:', error);
    return {};
  }
}

/**
 * Save or update chatroom name
 */
export async function saveChatroomName(
  walletAddress: string,
  chatroomId: string,
  customName: string
): Promise<boolean> {
  try {
    if (!customName || customName.trim().length === 0) {
      throw new Error('Custom name cannot be empty');
    }

    const response = await fetch(`${API_BASE_URL}/api/chatroom-names`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        chatroomId,
        customName: customName.trim(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save chatroom name: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error saving chatroom name:', error);
    throw error;
  }
}

/**
 * Delete chatroom name
 */
export async function deleteChatroomName(
  walletAddress: string,
  chatroomId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/chatroom-names?walletAddress=${encodeURIComponent(walletAddress)}&chatroomId=${encodeURIComponent(chatroomId)}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete chatroom name');
    }

    return true;
  } catch (error) {
    console.error('Error deleting chatroom name:', error);
    return false;
  }
}

