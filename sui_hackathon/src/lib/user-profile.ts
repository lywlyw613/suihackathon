/**
 * User Profile Management with MongoDB
 * 
 * This module provides functions to interact with the MongoDB profile API
 */

export interface UserProfile {
  address: string; // Wallet address (primary key)
  name?: string; // Name from zkLogin (e.g., "Chung-Yang Ric Huang")
  avatarUrl?: string; // Walrus URL for avatar
  bannerUrl?: string; // Walrus URL for banner/background
  bio?: string; // Brief description
  chatroomCount?: number; // Number of chatrooms owned
  friends?: string[]; // Array of friend wallet addresses
  createdAt?: string;
  updatedAt?: string;
}

// For local development, use empty string (relative URLs)
// For production, use Vercel URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Get user profile from MongoDB
 */
export async function getUserProfile(address: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/profile?address=${encodeURIComponent(address)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }
    const profile = await response.json();
    return profile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Save user profile to MongoDB
 */
export async function saveUserProfile(profile: Partial<UserProfile>): Promise<boolean> {
  try {
    if (!profile.address) {
      throw new Error('Address is required');
    }

    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw new Error('Failed to save profile');
    }

    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    return false;
  }
}

/**
 * Get avatar URL for an address
 * Returns Walrus URL if available, otherwise returns null for fallback
 */
export async function getAvatarUrl(address: string): Promise<string | null> {
  const profile = await getUserProfile(address);
  return profile?.avatarUrl || null;
}

/**
 * Get friends list for a user
 */
export async function getFriends(address: string): Promise<Array<{ address: string; name?: string; avatarUrl?: string; bio?: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/friends?address=${encodeURIComponent(address)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch friends');
    }
    const data = await response.json();
    return data.friends || [];
  } catch (error) {
    console.error('Error getting friends:', error);
    return [];
  }
}

/**
 * Add a friend
 */
export async function addFriend(address: string, friendAddress: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/friends`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, friendAddress }),
    });

    if (!response.ok) {
      throw new Error('Failed to add friend');
    }

    return true;
  } catch (error) {
    console.error('Error adding friend:', error);
    return false;
  }
}

