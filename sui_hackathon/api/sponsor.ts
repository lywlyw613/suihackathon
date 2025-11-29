/**
 * Vercel Serverless Function for Sponsored Transactions
 * 
 * This endpoint receives a transaction from the frontend,
 * signs it with the sponsor's key, and executes it.
 * 
 * Environment variables required:
 * - SPONSOR_PRIVATE_KEY: Sponsor's private key (hex string)
 * - SUI_NETWORK: Network to use (devnet, testnet, mainnet)
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromHEX } from '@mysten/sui/utils';

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transaction: txBytes, signature: userSignature, sender } = req.body;

    if (!txBytes || !userSignature || !sender) {
      return res.status(400).json({ error: 'Missing transaction, signature, or sender' });
    }

    // Get sponsor private key from environment
    const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY;
    if (!sponsorPrivateKey) {
      return res.status(500).json({ error: 'Sponsor private key not configured' });
    }

    // Get network (default to devnet)
    const network = (process.env.SUI_NETWORK || 'devnet') as 'mainnet' | 'testnet' | 'devnet' | 'localnet';
    const rpcUrl = getFullnodeUrl(network);
    const client = new SuiClient({ url: rpcUrl });

    // Create sponsor keypair from private key
    // Support both Bech32 format (suiprivkey...) and hex format
    let sponsorKeypair: Ed25519Keypair;
    try {
      if (sponsorPrivateKey.startsWith('suiprivkey')) {
        // Bech32 format - Ed25519Keypair.fromSecretKey can directly accept Bech32 string
        sponsorKeypair = Ed25519Keypair.fromSecretKey(sponsorPrivateKey);
      } else {
        // Hex format
        sponsorKeypair = Ed25519Keypair.fromSecretKey(fromHEX(sponsorPrivateKey));
      }
    } catch (error: any) {
      return res.status(500).json({ 
        error: 'Invalid sponsor private key format',
        message: error.message 
      });
    }

    // Deserialize the transaction (txBytes is base64 encoded)
    // This transaction already has gas payment set (from frontend)
    const txBytesBuffer = Buffer.from(txBytes, 'base64');
    const tx = Transaction.from(txBytesBuffer);

    // The transaction already has gas payment set by the frontend,
    // so we just need to sign it with sponsor's key and execute
    const txBytesToExecute = await tx.build({ client });

    // Sign the transaction with sponsor's key (for gas payment)
    const sponsorSignedTx = await tx.sign({
      client,
      signer: sponsorKeypair,
    });

    // User signature is for the transaction WITH gas payment (set by frontend)
    // Sponsor signature is for the same transaction
    // Both signatures are needed for sponsored transactions
    const result = await client.executeTransactionBlock({
      transactionBlock: txBytesToExecute, // Transaction with gas payment (already set)
      signature: [
        userSignature, // User signature (sender) - SerializedSignature string
        sponsorSignedTx.signature, // Sponsor signature (gas payer) - SerializedSignature string
      ],
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return res.status(200).json({
      success: true,
      digest: result.digest,
      effects: result.effects,
      events: result.events,
    });
  } catch (error: any) {
    console.error('Error sponsoring transaction:', error);
    return res.status(500).json({
      error: 'Failed to sponsor transaction',
      message: error.message,
    });
  }
}

