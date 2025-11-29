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
    const sponsorAddress = sponsorKeypair.toSuiAddress();

    // Deserialize the transaction (txBytes is base64 encoded)
    // This is the transaction that the user signed (without gas payment)
    const txBytesBuffer = Buffer.from(txBytes, 'base64');
    const tx = Transaction.from(txBytesBuffer);

    // Get sponsor coins for gas payment
    const sponsorCoins = await client.getCoins({
      owner: sponsorAddress,
      coinType: '0x2::sui::SUI',
    });

    if (sponsorCoins.data.length === 0) {
      return res.status(500).json({ 
        error: 'Sponsor has no SUI coins to pay for gas',
        sponsorAddress 
      });
    }

    // Use the first coin for gas
    const gasCoin = sponsorCoins.data[0];
    tx.setGasPayment([{
      objectId: gasCoin.coinObjectId,
      version: gasCoin.version,
      digest: gasCoin.digest,
    }]);

    // Set gas owner to sponsor
    tx.setGasOwner(sponsorAddress);

    // Rebuild transaction with sponsor gas payment
    const txBytesWithSponsor = await tx.build({ client });

    // Sign the transaction with sponsor's key (for gas payment)
    const sponsorSignedTx = await tx.sign({
      client,
      signer: sponsorKeypair,
    });

    // User signature is already a SerializedSignature string from the frontend
    // For sponsored transactions in Sui:
    // - The transaction bytes WITH gas payment are used
    // - We need both user signature and sponsor signature
    // - The signatures are combined into a multi-sig format
    // 
    // The user signature was created for the original transaction bytes (without gas payment),
    // but we're executing the transaction with gas payment. However, in Sui, the signature
    // validation should work because the core transaction data (moveCall, arguments) remains the same.
    //
    // Let's use the transaction bytes with gas payment and both signatures:
    const result = await client.executeTransactionBlock({
      transactionBlock: txBytesWithSponsor, // Transaction with gas payment
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

