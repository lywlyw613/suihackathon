/**
 * zkLogin Account Management
 * 
 * This module provides utilities to manage zkLogin accounts in the application
 */

export interface ZkLoginAccount {
  address: string;
  email?: string;
  jwt?: string;
  salt?: string;
  ephemeralKeypair?: any;
  proof?: any;
}

const ZKLOGIN_STORAGE_KEY = "zklogin_account";

/**
 * Save zkLogin account to localStorage
 */
export function saveZkLoginAccount(account: ZkLoginAccount): void {
  try {
    localStorage.setItem(ZKLOGIN_STORAGE_KEY, JSON.stringify(account));
  } catch (error) {
    console.error("Error saving zkLogin account:", error);
  }
}

/**
 * Get zkLogin account from localStorage
 */
export function getZkLoginAccount(): ZkLoginAccount | null {
  try {
    const stored = localStorage.getItem(ZKLOGIN_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error getting zkLogin account:", error);
    return null;
  }
}

/**
 * Clear zkLogin account from localStorage
 */
export function clearZkLoginAccount(): void {
  try {
    localStorage.removeItem(ZKLOGIN_STORAGE_KEY);
    // Also clear old storage keys for backward compatibility
    localStorage.removeItem("zklogin_token");
    localStorage.removeItem("zklogin_email");
    localStorage.removeItem("zklogin_address");
  } catch (error) {
    console.error("Error clearing zkLogin account:", error);
  }
}

/**
 * Check if current account is a zkLogin account
 */
export function isZkLoginAccount(address: string | undefined): boolean {
  if (!address) return false;
  const zkAccount = getZkLoginAccount();
  return zkAccount?.address === address;
}

