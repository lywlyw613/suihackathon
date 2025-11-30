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
      // Don't log errors for 503 (service unavailable) or 500 (server errors) - these are expected
      if (response.status === 503 || response.status === 500) {
        // Return default profile on database connection errors
        return {
          address,
          chatroomCount: 0,
          friends: [],
        };
      }
      const errorText = await response.text();
      console.error('Failed to fetch profile:', response.status, errorText);
      // Return default profile if not found (404)
      if (response.status === 404) {
        return {
          address,
          chatroomCount: 0,
          friends: [],
        };
      }
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }
    const profile = await response.json();
    return profile;
  } catch (error) {
    // Silently return default profile on network errors
    return {
      address,
      chatroomCount: 0,
      friends: [],
    };
  }
}

/**
 * Save user profile to MongoDB
 * 
 * @param profile - Profile data to save
 * @param currentAddress - Current logged-in wallet address (for security check)
 */
export async function saveUserProfile(
  profile: Partial<UserProfile>,
  currentAddress?: string
): Promise<boolean> {
  try {
    if (!profile.address) {
      throw new Error('Address is required');
    }

    // Security check: ensure user can only save their own profile
    if (currentAddress && profile.address !== currentAddress) {
      throw new Error('You can only save your own profile');
    }

    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save profile: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error; // Re-throw to let caller handle
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
      // Don't log errors for 503 or 500 - these are expected database connection issues
      if (response.status !== 503 && response.status !== 500) {
        const errorText = await response.text();
        console.error('Failed to fetch friends:', response.status, errorText);
      }
      // Return empty array on error
      return [];
    }
    const data = await response.json();
    return data.friends || [];
  } catch (error) {
    // Silently return empty array on network errors
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

