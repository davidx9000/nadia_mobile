import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { Buffer } from "buffer";
import { useCallback, useEffect, useState, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import * as ExpoLinking from 'expo-linking';
import { decode as b64decode } from 'base64-arraybuffer';
import { useSession } from '@/context/authSession';

// Ensure Buffer is available globally
global.Buffer = global.Buffer || Buffer;

interface SolanaWalletSession {
  publicKey: string;
  session: string;
  sharedSecret: Uint8Array;
  dappKeyPair: nacl.BoxKeyPair;
}

interface UseSolanaWalletReturn {
  isConnected: boolean;
  isConnecting: boolean;
  signedMessage: string | null;
  signedTransaction: string | null;
  awaitingMessage: boolean;
  publicKey: PublicKey | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  signTransaction: (tx: VersionedTransaction) => Promise<Uint8Array | null>;
  session: SolanaWalletSession | null;
}

const NETWORK = clusterApiUrl("mainnet-beta");
const DEFAULT_FEE_PER_SIGNATURE = 5000;

/**
 * Set to true for production, false for development
 * Universal links are recommended for production apps
 */
const useUniversalLinks = true;
const alertTitle = 'Phantom Wallet';

const buildUrl = (path: string, params: URLSearchParams) =>
  `${useUniversalLinks ? "https://phantom.app/ul/" : "phantom://"}v1/${path}?${params.toString()}`;

const decryptPayload = (data: string, nonce: string, sharedSecret: Uint8Array) => {
  const decryptedData = nacl.box.open.after(bs58.decode(data), bs58.decode(nonce), sharedSecret);
  if (!decryptedData) {
    throw new Error("Unable to decrypt data");
  }
  return JSON.parse(Buffer.from(decryptedData).toString("utf8"));
};

const encryptPayload = (payload: any, sharedSecret: Uint8Array) => {
  const nonce = nacl.randomBytes(24);
  const encryptedPayload = nacl.box.after(
    Buffer.from(JSON.stringify(payload)),
    nonce,
    sharedSecret
  );
  return [nonce, encryptedPayload];
};

export const calculateSolanaFee = ({ signatures = 1, feePerSignature = DEFAULT_FEE_PER_SIGNATURE, multiplier = 1 } = {}) => {
  const totalLamports = signatures * feePerSignature * multiplier;
  const totalSOL = totalLamports / LAMPORTS_PER_SOL;
  return {
    lamports: totalLamports,
    sol: parseFloat(totalSOL.toFixed(9)),
  };
};

export const calculatePlatformFee = (tipAmount) => {
  const flatFee = 0.003;
  const percentageFee = tipAmount * 0.01;
  const totalFee = flatFee + percentageFee;
  return parseFloat(totalFee.toFixed(9));
};

export const useSolanaWallet = (): UseSolanaWalletReturn => {
  const connection = new Connection(NETWORK);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
  const [signedTransaction, setSignedTransaction] = useState<string | null>(null);
  const [awaitingMessage, setAwaitingMessage] = useState(false);
  const lastSignedMessage = useRef<string | null>(null);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [session, setSession] = useState<SolanaWalletSession | null>(null);
  const [dappKeyPair, setDappKeyPair] = useState<nacl.BoxKeyPair | null>(null);

  // Redirect URLs
  const onConnectRedirectLink = ExpoLinking.createURL("login?request=phantom-connect");
  const onSignMessageRedirectLink = ExpoLinking.createURL("login?request=phantom-sign");
  const onDisconnectRedirectLink = ExpoLinking.createURL("login?request=phantom-logout");
  const { session: authSession } = useSession();

  // Handle dappKeyPair
  useEffect(() => {
    if (!dappKeyPair) {
      const newKeyPair = nacl.box.keyPair();
      setDappKeyPair(newKeyPair);
    }
  }, [dappKeyPair]);

  // Refresh wallet session from app auth
  useEffect(() => {
    if (!session && authSession?.walletSession) {
      try {
        const wallet = authSession.walletSession;
        const restored: SolanaWalletSession = {
          publicKey: wallet.publicKey,
          session: wallet.session,
          sharedSecret: new Uint8Array(b64decode(wallet.sharedSecret)),
          dappKeyPair: {
            publicKey: new Uint8Array(b64decode(wallet.dappKeyPair.publicKey)),
            secretKey: new Uint8Array(b64decode(wallet.dappKeyPair.secretKey)),
          },
        };

        setDappKeyPair(restored.dappKeyPair);
        setSession(restored);
        setPublicKey(new PublicKey(restored.publicKey));
        setIsConnected(true);
      } catch (e) {
        console.warn("Failed to rehydrate Solana Wallet session:", e);
      }
    }
  }, [authSession]);

  /**
   * DeepLink Listeners
   **/
  const handleDeepLink = useCallback(async (url: string) => {
    if (!url) return;

    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      const requestParam = params.get("request");

      // Handle errors
      if (params.get("errorCode")) {
        const errorMessage = params.get("errorMessage") || "Unknown error occurred";
        Alert.alert(alertTitle, errorMessage);
        setIsConnecting(false);
        return;
      }

      // Handle connection response
      if (url.includes("login") && requestParam === "phantom-connect") {
        try {
          const phantomEncryptionPublicKey = params.get("phantom_encryption_public_key");
          const data = params.get("data");
          const nonce = params.get("nonce");

          if (!phantomEncryptionPublicKey || !data || !nonce) {
            throw new Error("Missing required parameters");
          }

          const sharedSecret = nacl.box.before(
            bs58.decode(phantomEncryptionPublicKey),
            dappKeyPair.secretKey
          );

          const connectData = decryptPayload(data, nonce, sharedSecret);

          const newSession: SolanaWalletSession = {
            publicKey: connectData.public_key,
            session: connectData.session,
            sharedSecret,
            dappKeyPair
          };

          setSession(newSession);
          setPublicKey(new PublicKey(connectData.public_key));
          setIsConnected(true);
        } catch (error) {
          console.error("Connection error:", error);
          Alert.alert(alertTitle, "Failed to connect to Phantom Wallet");
          setIsConnecting(false);
        }
      }

      // Handle disconnection response
      if (url.includes("login") && requestParam === "phantom-logout") {
        setSession(null);
        setPublicKey(null);
        setIsConnected(false);
        Alert.alert(alertTitle, "Phantom Wallet disconnected successfully");
      }

      // Handle sign message response
      if (url.includes("login") && requestParam === "phantom-sign") {
        try {
          const data = params.get("data");
          const nonce = params.get("nonce");

          if (!data || !nonce || !session) {
            throw new Error("Missing required parameters for message signing");
          }

          const signMessageData = decryptPayload(data, nonce, session.sharedSecret);
          setSignedMessage({
            message: lastSignedMessage.current,   
            signature: signMessageData.signature,
          });
          setIsConnecting(false);
        } catch (error) {
          setIsConnecting(false);
          console.error("Sign message error:", error);
          Alert.alert(alertTitle, "Failed to sign message");
        }
      }

      if (requestParam === "sign-transaction") {
        try {
          const data = params.get("data");
          const nonce = params.get("nonce");

          if (!data || !nonce || !session) {
            throw new Error("Missing data for transaction signing");
          }

          setSignedTransaction(null);
          const txData = decryptPayload(data, nonce, session.sharedSecret);
          const signedTx = bs58.decode(txData.transaction); 
          const signature = await connection.sendRawTransaction(signedTx);
          await connection.confirmTransaction(signature, 'confirmed');
          setSignedTransaction(signature);
        } catch (error) {
          console.error("Transaction sign error:", error);
          Alert.alert(alertTitle, "Failed to sign or send transaction");
        }
      }

    } catch (error) {
      console.error("Deep link handling error:", error);
      Alert.alert(alertTitle, "Failed to handle Phantom Wallet response");
      setIsConnecting(false);
    }
  }, [dappKeyPair, session]);

  useEffect(() => {
    // Handle initial URL (when app is opened from deep link)
    const handleInitialUrl = async () => {
      try {
        const initialUrl = await ExpoLinking.getInitialURL();
        if (initialUrl) {
          handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error("Error handling initial URL:", error);
      }
    };

    handleInitialUrl();

    // Listen for deep link events
    const subscription = ExpoLinking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  /**
   * Connect To Wallet
   **/
  const connect = useCallback(async () => {

    if (isConnecting) return;
    setIsConnecting(true);

    try {
      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
        cluster: "mainnet-beta",
        app_url: "https://nadiaradio.com",
        redirect_link: onConnectRedirectLink,
      });

      const url = buildUrl("connect", params);
      await Linking.openURL(url);

    } catch (error) {
      console.error("Connection error:", error);
      Alert.alert(alertTitle, "Failed to open Phantom Wallet");
      setIsConnecting(false);
    }
  }, [isConnecting, dappKeyPair, onConnectRedirectLink]);

  /**
   * Disconnect To Wallet
   **/
  const disconnect = useCallback(async () => {
    if (!session) return;

    try {
      const payload = {
        session: session.session,
      };

      const [nonce, encryptedPayload] = encryptPayload(payload, session.sharedSecret);

      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
        nonce: bs58.encode(nonce),
        redirect_link: onDisconnectRedirectLink,
        payload: bs58.encode(encryptedPayload),
      });

      const url = buildUrl("disconnect", params);
      await Linking.openURL(url);
    } catch (error) {
      console.error("Disconnect error:", error);
      Alert.alert(alertTitle, "Failed to disconnect from Phantom Wallet");
    }
  }, [session, dappKeyPair, onDisconnectRedirectLink]);

  /**
   * Sign Message
   **/
  const signMessage = useCallback(async (): Promise<string | null> => {
    if (!session) {
      Alert.alert(alertTitle, "Please connect to Phantom Wallet first");
      return null;
    }

    try {

      const message = generateLoginMessage();
      lastSignedMessage.current = message;

      const payload = {
        session: session.session,
        message: bs58.encode(Buffer.from(message)),
      };


      const [nonce, encryptedPayload] = encryptPayload(payload, session.sharedSecret);

      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
        nonce: bs58.encode(nonce),
        redirect_link: onSignMessageRedirectLink,
        payload: bs58.encode(encryptedPayload),
      });

      const url = buildUrl("signMessage", params);
      await Linking.openURL(url);

      return "Message signing initiated";
    } catch (error) {
      console.error("Sign message error:", error);
      Alert.alert(alertTitle, "Failed to sign message");
      return null;
    }
  }, [session, dappKeyPair, onSignMessageRedirectLink]);

  const createTransferTransaction = async (amount: number, toAddress: string) => {
    try {
      if (!publicKey) throw new Error("Missing public key from user");

      const toPubkey = new PublicKey(toAddress);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey,
          lamports: Math.floor(amount * LAMPORTS_PER_SOL), // SOL to lamports
        })
      );

      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      return transaction;
    } catch (err) {
      Alert.alert(alertTitle, err?.message || "Failed to initiate transaction");
      return null;
    }
  };

  /**
   * Sign Transaction
   **/
  const signTransaction = useCallback(
    async (amount: number, toAddress: string, redirectLink: string) => {
      if (!session || !publicKey) {
        Alert.alert(alertTitle, 'Please connect your wallet first');
        return null;
      }

      if(!redirectLink) {
        Alert.alert(alertTitle, 'Internal Server Error');
        return null;
      }

      try {
        const transaction = await createTransferTransaction(amount, toAddress);
        if (!transaction) return null;

        const serializedTransaction = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });

        const payload = {
          session: session.session,
          transaction: bs58.encode(serializedTransaction),
        };

        const [nonce, encryptedPayload] = encryptPayload(payload, session.sharedSecret);
        console.log(redirectLink);
        const params = new URLSearchParams({
          dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
          nonce: bs58.encode(nonce),
          redirect_link: redirectLink,
          payload: bs58.encode(encryptedPayload),
        });

        const url = buildUrl("signTransaction", params);
        await Linking.openURL(url);

        return true;
      } catch (err) {
        Alert.alert(alertTitle, err.message || "Failed to sign transaction");
        return null;
      }
    },
    [session, publicKey, dappKeyPair]
  );

  const generateLoginMessage = () => {
    const date = Date.now();
    return `Sign in to Nadia Radio: ${date}`;
  }

  return {
    isConnected,
    isConnecting,
    publicKey,
    connect,
    disconnect,
    signMessage,
    signedMessage,
    signedTransaction,
    signTransaction,
    session,
  };
};