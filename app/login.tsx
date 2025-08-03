import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Image
} from 'react-native';
import { encode as b64encode } from 'base64-arraybuffer';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import PhantomIcon from '@/assets/images/phantom_wallet_icon.svg';
import { router } from 'expo-router';
import { useSession } from '@/context/authSession';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import api from '@/services/axios';

// Configure WebBrowser for better UX
WebBrowser.maybeCompleteAuthSession();

export default function loginScreen() {
  const [isScreenLoading, setIsScreenLoading] = useState(false);
  const [isLoadingMethod, setIsLoadingMethod] = useState<string | null>(null);
  const { signIn, session: authSession } = useSession();

  // Handle Solana Wallet
  const [hasSigned, setHasSigned] = useState(false);
  const {
    isConnecting: connectingSolana,
    signedMessage: signedSolana,
    signMessage: requestSignSolana,
    session: sessionSolana,
    connect: connectSolana,
  } = useSolanaWallet();

  useEffect(() => {
    const requestSolanaWalletSignature = async () => {
      if (sessionSolana && !hasSigned) {
        setHasSigned(true);
        await requestSignSolana();
      }
    };

    if (connectingSolana) {
      setIsScreenLoading(true);
      setIsLoadingMethod('phantom');
    } else {
      setIsScreenLoading(false);
      setIsLoadingMethod(null);
    }

    requestSolanaWalletSignature();
  }, [sessionSolana, connectingSolana]);

  useEffect(() => {

    const authPhantomUser = async () => {
      try {
        const response = await api.post("/auth/phantom", {
          publicKey: sessionSolana.publicKey,
          message: signedSolana.message,
          signature: signedSolana.signature
        });

        if (response.data.session) {
          signIn({
            ...response.data.session,
            walletSession: {
              publicKey: sessionSolana.publicKey,
              session: sessionSolana.session,
              sharedSecret: b64encode(sessionSolana.sharedSecret),
              dappKeyPair: {
                publicKey: b64encode(sessionSolana.dappKeyPair.publicKey),
                secretKey: b64encode(sessionSolana.dappKeyPair.secretKey),
              },
            },
          });
          router.replace('/(tabs)/profile');
        } else {
          throw new Error('Invalid session');
        }
      } catch (error) {
        Alert.alert('Login Error', 'Failed to connect to Phantom Wallet. Please try again.');
      } finally {
        setIsScreenLoading(false);
        setIsLoadingMethod(null);
      }

    };

    if (sessionSolana && signedSolana) {
      authPhantomUser();
    }
  }, [signedSolana, sessionSolana]);

  const startLoginTimeout = () => {
    return setTimeout(() => {
      setIsScreenLoading(false);
      setIsLoadingMethod(null);
    }, 15000);
  };

  const handlePhantomLogin = async () => {
    try {
      const timeout = startLoginTimeout();
      await connectSolana();
      clearTimeout(timeout);
    } catch (error) {
      setIsScreenLoading(false);
      setIsLoadingMethod(null);
      console.error('Phantom login error:', error);
      Alert.alert('Login Error', 'Failed to connect to Phantom Wallet. Please try again.');
    }
  };

  const handleTwitterLogin = async () => {
    try {
      setIsScreenLoading(true);
      setIsLoadingMethod('twitter');

      const redirectUri = 'nadiaradio://login';
      const authUrl = `https://www.nadiaradio.com/api/auth/twitter?source=mobile`;
      const timeout = startLoginTimeout();

      const request = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      clearTimeout(timeout);

      if (request.type !== 'success' || !request.url) return;

      const url = new URL(request.url);
      const error = url.searchParams.get('error');
      const sessionData = url.searchParams.get('session');

      if (error) {
        throw new Error(error);
      }

      if (sessionData) {
        const session = JSON.parse(decodeURIComponent(sessionData));
        signIn(session);
        router.replace('/(tabs)/profile');
      }
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setIsScreenLoading(false);
      setIsLoadingMethod(null);
    }
  };

  return (
    <View
      style={styles.container}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back() }>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={styles.loginContainer}>
        <Image
          source={require('@/assets/images/nadia.jpg')}
          style={styles.nadia}
          resizeMode="cover"
        />

        <Text style={styles.welcomeHeader}>
          Hey There, <Text style={styles.nadiaTitle}>Welcome</Text> <Text style={styles.nadiaSub}>Back</Text>!
        </Text>

        <View style={styles.innerContainer}>
          <Text style={styles.welcome}>CONNECT WITH</Text>

          <TouchableOpacity
            style={[styles.button, isScreenLoading && styles.buttonDisabled, { backgroundColor: '#000' }]}
            onPress={handleTwitterLogin}
            disabled={isScreenLoading}
          >
            {isLoadingMethod === 'twitter' ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <FontAwesome6 name="x-twitter" size={24} color="#ffffff" />
                <Text style={styles.buttonText}>Continue with X</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isScreenLoading && styles.buttonDisabled, { backgroundColor: '#ab9ff2' }]}
            onPress={handlePhantomLogin}
            disabled={isScreenLoading}
          >
            {isLoadingMethod === 'phantom' ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <View style={styles.phantomIcon}>
                  <PhantomIcon width={36} height={36} />
                </View>
                <Text style={styles.buttonText}>Continue with Phantom</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View> 
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d', 
    justifyContent: 'flex-end',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding:20,
    gap: 20,
  },
  nadia: {
    width: 180,
    height: 180,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    top: 70,
    left: 20,
    zIndex: 10,
  },
  innerContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, .5)',
    borderRadius: 24,
    width: '100%',
    padding: 24,
    gap: 12,
  },
  welcomeHeader: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 0.1,
    marginBottom: 10,
  },
  welcome: {
    color: '#fff',
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 10,
  },
  button: {
    width: '100%',
    maxHeight: 50,
    backgroundColor: '#ab9ff2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  phantomIcon: {
    borderRadius: 9999,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  nadiaTitle: {
    color: '#FF7CE5',
    textShadowColor: 'rgba(255, 124, 229, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  nadiaSub: {
    color: '#7DD3FC',
    textShadowColor: 'rgba(125, 211, 252, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});