import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Octicons from '@expo/vector-icons/Octicons';
import ActionSheet, { useSheetPayload, useSheetRef } from 'react-native-actions-sheet';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { globalStyles } from '@/styles/global';
import useDynamicRedirect from '@/hooks/useDynamicRedirect';
import { useSolanaWallet, calculateSolanaFee, calculatePlatformFee } from '@/hooks/useSolanaWallet';
import api from '@/services/axios';

function TipSheet() {
  const ref = useSheetRef('tipSheet');
  const { track, token } = useSheetPayload("payload") || {};

  if (!track && !token) {
    ref.current.hide(true);
    return;
  }

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fullTipDetails, setFullTipDetails] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);

  const {
    session: solanaSession,
    signTransaction,
    signedTransaction
  } = useSolanaWallet();
  const redirectLink = useDynamicRedirect({ request: "sign-transaction" });

  const [tipAmount, setTipAmount] = useState("0.01");

  const quickValues = ["0.005", "0.01", "0.03"];
  const minTip = 0.005;

  const total = parseFloat(tipAmount || "0") || 0;

  const calculateFee = calculateSolanaFee({ signatures: 5 });
  const networkFee = calculateFee.sol;

  const stationFee = calculatePlatformFee(total);
  const artistGets = Math.max(total - stationFee - networkFee, 0);

  const showFeeInfo = () => {
    Alert.alert(
      "About Fees",
      "Small network and platform fees apply. Most of your tip goes directly to the artist!",
      [{ text: "Got it", style: "default" }]
    );
  };

  useEffect(() => {
    if (signedTransaction && token && sessionId) {
      confirmTransaction();
    }
  }, [signedTransaction, token, sessionId]);

  const sendTip = async (amount) => {
    try {
      setIsWaiting(true);
      if (!solanaSession) {
        Alert.alert('Please connect your wallet first');
        return;
      }
      const tipAmount = parseFloat(amount);
      if (!tipAmount || tipAmount < minTip) {
        Alert.alert('Invalid tip amount');
        return;
      }

      const response = await api.post("/tip/initiate", { id: track.artist.id }, 
        { headers: { Authorization: `${token}` } }
      );

      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
        await signTransaction(tipAmount, '2PN8XaGeHs6iyrjyuk66EjSXgWcsZ9PtSoaV1r1vhZYr', redirectLink);
      }
    } catch (err) {
      Alert.alert('Confirm Tip', err?.response?.data?.message || 'Unable to tip at the moment.');
    } finally {
      setIsWaiting(false);
    }
  };

  const confirmTransaction = async () => {
    try {
      setIsProcessing(true);
      setIsWaiting(true);
      setErrorMessage(null);
      setRetryable(false);
      const response = await api.post("/tip/confirm", { signedTransaction, sessionId }, 
        { headers: { Authorization: `${token}` } }
      );

      if (response.data.success && response.data.signature) {
        setIsWaiting(false);
        setFullTipDetails(response.data);
      } else {
        setErrorMessage('Tip failed. Please try again.');
        setRetryable(true);
      }
    } catch (err) {
      const errorData = err?.response?.data;
      setErrorMessage(errorData?.message || 'Failed to tip artist.');
      setRetryable(errorData?.retryable ?? false);
    } 
  };

  const openSocial = (platform, handle) => {
    if (!handle) return;
    
    const urls = {
      twitter: `https://x.com/${handle.replace('@', '')}`,
      instagram: `https://instagram.com/${handle.replace('@', '')}`,
      tiktok: `https://tiktok.com/@${handle.replace('@', '')}`
    };
    
    Linking.openURL(urls[platform]);
  };

  return (
    <ActionSheet gestureEnabled={true} isModal={false} indicatorStyle={styles.indicator}>
      <View style={styles.container}>
        {!isProcessing ? (
          <>
            <View style={styles.artistHeader}>
              {track?.artist?.profile && (
                <Image source={{ uri: track.artist.profile }} style={styles.artistAvatar} />
              )}
              <View style={styles.artistInfo}>
                <View style={styles.artistTitle}>
                  <Text style={styles.artistName}>{track?.artist?.name}</Text>
                  {track?.artist?.is_verified ? (
                  <TouchableOpacity onPress={() => Alert.alert("Verified Tag", "This artist is verified by Audius platform.")}>
                    <Octicons name="verified" size={12} color="#333" />
                  </TouchableOpacity>
                  ) : null}
                </View>
                <View style={styles.socialIcons}>
                  {track?.artist?.socials?.twitter && (
                    <TouchableOpacity onPress={() => openSocial('twitter', track.artist.socials.twitter)}>
                      <FontAwesome6 name="x-twitter" size={16} color="#333" />
                    </TouchableOpacity>
                  )}
                  {track?.artist?.socials?.instagram && (
                    <TouchableOpacity onPress={() => openSocial('instagram', track.artist.socials.instagram)}>
                      <Ionicons name="logo-instagram" size={16} color="#E4405F" />
                    </TouchableOpacity>
                  )}
                  {track?.artist?.socials?.tiktok && (
                    <TouchableOpacity onPress={() => openSocial('tiktok', track.artist.socials.tiktok)}>
                      <Ionicons name="logo-tiktok" size={16} color="#000" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <Text style={styles.subtitle}>Send some love <Ionicons name="heart" size={10} color="red" /></Text>

            <View style={styles.quickButtons}>
              {quickValues.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[globalStyles.button, styles.quickButton, tipAmount === val && styles.selectedButton]}
                  onPress={() => setTipAmount(val)}
                >
                  <Text style={[styles.quickButtonText, tipAmount === val && styles.selectedButtonText]}>
                    {val} SOL
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.customAmountContainer}>
              <Text style={styles.customLabel}>Custom amount:</Text>
              <TextInput
                value={tipAmount}
                onChangeText={setTipAmount}
                placeholder="0.01"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Artist gets</Text>
                <Text style={styles.summaryAmount}>{artistGets.toFixed(3)} SOL</Text>
              </View>
              <View style={styles.summarySubtext}>
                <Text style={styles.feeSubtext}>
                  ~{total > 0 ? ((artistGets / total) * 100).toFixed(0) : '0'}% after small fees
                </Text>
                <TouchableOpacity onPress={showFeeInfo}>
                  <Ionicons name="information-circle-outline" size={14} color="#888" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                globalStyles.button,
                styles.tipButton,
                { opacity: isWaiting ? 0.7 : 1 },
              ]}
              onPress={async () => {
                await sendTip(tipAmount);
              }}
              disabled={isWaiting}
            >
              {isWaiting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="heart" size={18} color="#fff" style={styles.heartIcon} />
                  <Text style={styles.tipButtonText}>Send Tip</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.innerContent}>
          { isWaiting ? (
            <View>
              <Text style={styles.title}>Sending tip...</Text>
            
              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : (
                <ActivityIndicator size="large" color="#ccc" style={styles.loading} />
              )}

              {retryable && (
                <TouchableOpacity style={[ globalStyles.button, styles.retryButton ]} onPress={confirmTransaction}>
                  <Text style={styles.buttonText}>Retry Tip</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
              <Text style={styles.successTitle}>Tip sent! 🎉</Text>
              <Text style={styles.successSubtitle}>
                {track?.artist?.name} will be so happy!
              </Text>
              {fullTipDetails?.signature ? (
              <TouchableOpacity onPress={() => Linking.openURL(`https://solscan.io/tx/${fullTipDetails?.signature}`)}>
                <Text style={styles.linkText}>View transaction</Text>
              </TouchableOpacity>
              ) : null}
            </>
          )}
          </View>
        )}
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  indicator: {
    width: 130,
  },
  container: {
    padding: 20,
    marginBottom: 40,
  },
  
  // Artist Header
  artistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  artistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  artistInfo: {
    flex: 1,
  },
  artistTitle: {
    flexDirection: 'row', 
    alignItems: 'center',
    gap:4
  },
  artistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 8,
  },

  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Quick Buttons
  quickButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 16,
  },
  quickButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  quickButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedButton: {
    backgroundColor: 'rgba(132, 39, 217, 1)',
  },
  selectedButtonText: {
    color: 'white',
  },

  // Custom Amount
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  customLabel: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 6,
    borderRadius: 6,
    width: 80,
    textAlign: 'center',
    fontSize: 14,
  },

  // Summary
  summary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '700',
  },
  summarySubtext: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  feeSubtext: {
    fontSize: 12,
    color: '#888',
  },

  // Tip Button
  tipButton: {
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tipButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  heartIcon: {
    marginRight: 2,
  },

  // Success/Error States
  innerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 12,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  loading: {
    marginVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#00B0FF',
    textDecorationLine: 'underline',
  },
  errorText: {
    fontSize: 14,
    color: '#E04A4A',
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 16
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 20,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default TipSheet;