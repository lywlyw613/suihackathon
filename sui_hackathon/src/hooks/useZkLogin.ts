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

  useEffect(() => {
    // Check if we're returning from OAuth redirect
    const hash = window.location.hash;
    if (hash.includes("id_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get("id_token");
      
      if (idToken) {
        const handleOAuth = async () => {
          try {
            const claims = parseJWT(idToken);
            console.log("Google OAuth successful:", claims);
            
            // Try to complete zkLogin flow
            try {
              const zkLoginResult = await completeZkLogin(idToken);
              console.log("zkLogin result:", zkLoginResult);
              
              // Save zkLogin account
              if (zkLoginResult.address) {
                const zkAccount: ZkLoginAccount = {
                  address: zkLoginResult.address,
                  email: claims.email || "",
                  jwt: idToken,
                  salt: zkLoginResult.salt || undefined,
                  ephemeralKeypair: zkLoginResult.ephemeralKeypair || undefined,
                  proof: zkLoginResult.proof || undefined,
                };
                saveZkLoginAccount(zkAccount);
                console.log("zkLogin account saved:", zkAccount);
              }
            } catch (zkError) {
              console.warn("zkLogin proof generation failed (using OAuth only):", zkError);
              // Still save basic account info for OAuth-only mode
              const zkAccount: ZkLoginAccount = {
                address: "", // Will be generated later
                email: claims.email || "",
                jwt: idToken,
              };
              saveZkLoginAccount(zkAccount);
            }
            
            // Navigate to home
            navigate("/home");
          } catch (error) {
            console.error("Error parsing JWT:", error);
          }
        };
        
        handleOAuth();
      }
    }
  }, [navigate]);

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

