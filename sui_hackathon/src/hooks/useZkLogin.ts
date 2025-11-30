import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getGoogleOAuthUrl, parseJWT } from "../lib/zklogin";
import { completeZkLogin } from "../lib/zklogin-full";
import { saveZkLoginAccount, clearZkLoginAccount, getZkLoginAccount, ZkLoginAccount } from "../lib/zklogin-account";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/**
 * Hook for zkLogin with Google OAuth
 * 
 * Note: Full zkLogin implementation requires:
 * 1. Proving service (for generating ZK proofs)
 * 2. Salt service (for generating unique salts)
 * 
 * For hackathon, this is a simplified version that handles OAuth flow.
 */
export function useZkLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Note: OAuth callback is now handled by ZkLoginCallback component in App.tsx
  // This hook only handles the initial redirect to Google OAuth

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      alert("Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in .env");
      return;
    }

    setIsLoading(true);
    // Use root path as redirect URI for consistency
    const redirectUri = window.location.origin;
    const authUrl = getGoogleOAuthUrl(GOOGLE_CLIENT_ID, redirectUri);
    
    // Redirect to Google OAuth
    window.location.href = authUrl;
  };

  return {
    handleGoogleLogin,
    isLoading,
  };
}

