/**
 * ZkLogin OAuth Callback Handler
 * 
 * This component handles the OAuth callback from Google
 * It should be rendered at the App level to catch callbacks on any route
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { parseJWT } from "../lib/zklogin";
import { completeZkLogin } from "../lib/zklogin-full";
import { saveZkLoginAccount, ZkLoginAccount } from "../lib/zklogin-account";

export function ZkLoginCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're returning from OAuth redirect
    const hash = window.location.hash;
    console.log("Checking OAuth callback, hash:", hash);
    
    if (hash.includes("id_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get("id_token");
      const error = params.get("error");
      
      if (error) {
        console.error("OAuth error:", error);
        alert(`OAuth error: ${error}`);
        // Clear hash and navigate to login
        window.location.hash = "";
        navigate("/login");
        return;
      }
      
      if (idToken) {
        console.log("Found id_token, processing...");
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
              // Generate a simple address from email for demo
              const encoder = new TextEncoder();
              const data = encoder.encode(claims.email || claims.sub || "");
              crypto.subtle.digest("SHA-256", data).then((hashBuffer) => {
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const address = "0x" + hashArray
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("")
                  .slice(0, 64);
                
                const zkAccount: ZkLoginAccount = {
                  address: address,
                  email: claims.email || "",
                  jwt: idToken,
                };
                saveZkLoginAccount(zkAccount);
                console.log("zkLogin account saved (OAuth-only mode):", zkAccount);
              });
            }
            
            // Clear hash to clean up URL
            window.location.hash = "";
            
            // Navigate to home
            navigate("/home", { replace: true });
          } catch (error) {
            console.error("Error processing OAuth callback:", error);
            alert("Failed to process Google login. Please try again.");
            window.location.hash = "";
            navigate("/login", { replace: true });
          }
        };
        
        handleOAuth();
      }
    }
  }, [navigate]);

  // This component doesn't render anything
  return null;
}

