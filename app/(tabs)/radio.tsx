import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ScrollView, ActivityIndicator, Alert, Button, Dimensions  } from 'react-native';
import { globalStyles } from '@/styles/global';
import { router } from 'expo-router';
import { AudioPro, AudioProContentType, AudioProEventType } from 'react-native-audio-pro';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import AntDesign from '@expo/vector-icons/AntDesign';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import {SheetManager} from 'react-native-actions-sheet';
import { useWebSocket } from '@/context/WebSocketContext';
import { useSession } from '@/context/authSession';
import api from '@/services/axios';

const screenHeight = Dimensions.get('window').height;

export default function radioStation() {
  const { session } = useSession();
  const { on, off, emit, isConnected } = useWebSocket();
  const hasTriggeredRef = useRef(false);
  const isTogglingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIdPlaying, setTrackIdPlaying] = useState<string | null>(null);
  const [trackPlaying, setTrackPlaying] = useState(null);
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
  const streamUrl = 'https://nadiaradio.com/streaming/station/nadia';

  // Animated values
  const playButtonScale = useSharedValue(1);
  const cardScale = useSharedValue(0.9);
  const cardOpacity = useSharedValue(0);
  const liveDotOpacity = useSharedValue(1);
  const visualizerBars = [
    useSharedValue(0.3),
    useSharedValue(0.5),
    useSharedValue(0.7),
    useSharedValue(0.4),
    useSharedValue(0.6),
  ];

  // Set User Voting Status
  useEffect(() => {
    if (!session || !trackIdPlaying) return;
    const voteStatus = session.user.voted_tracks?.[trackIdPlaying] || null;
    setUserVote(voteStatus);
  }, [trackIdPlaying, session]);

  // Setup Media Player
  useEffect(() => {
    AudioPro.configure({
      contentType: AudioProContentType.MUSIC,
      showNextPrevControls: false,
      debug: false,
    });

    const subscription = AudioPro.addEventListener((event) => {
      if (event.type === AudioProEventType.PROGRESS && hasTriggeredRef.current === false) {
        hasTriggeredRef.current = true;
        setIsPlaying(true);
      }
      if (event.type === AudioProEventType.STATE_CHANGED) {
        const state = event.payload?.state;
        if (state === 'PLAYING') {
          setIsPlaying(true);
          setIsLoading(false);
        } else if (state === 'LOADING') {
          setIsLoading(true);
        } else {
          setIsPlaying(false);
          setIsLoading(false);
        }
      }
    });

    return () => {
      subscription.remove();
    };

  }, []);

  useEffect(() => {

    const handleStationInfo = (data: any) => {
      const track = data?.currentTrack || null;
      if (!track) return;

      if (track.id) {
        setTrackIdPlaying(track.id);
      }

      setTrackPlaying(track);

      if (isPlaying) {
        AudioPro.updateMetadata({
          title: track.title,
          artist: track?.artist?.name ?? 'NADIA Station',
          artwork: 'https://www.nadiaradio.com/agent/nadia/photo',
        });
      }
    };

    if (!isConnected) return;

    emit('joinStation');
    on('stationInfo', handleStationInfo);
    on('currentTrack', handleStationInfo);

    return () => {
      off('stationInfo', handleStationInfo);
      off('currentTrack', handleStationInfo);
    };

  }, [isConnected, isPlaying]);

  // Initialize animations
  useEffect(() => {
    cardScale.value = withTiming(1, { duration: 500 });
    cardOpacity.value = withTiming(1, { duration: 500 });
    
    // Animate live dot
    liveDotOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  // Start/stop visualizer animations
  useEffect(() => {
    if (isPlaying) {
      visualizerBars.forEach((bar, index) => {
        bar.value = withRepeat(
          withSequence(
            withTiming(Math.random() * 0.8 + 0.2, { duration: 300 }),
            withTiming(Math.random() * 0.8 + 0.2, { duration: 300 }),
            withTiming(Math.random() * 0.8 + 0.2, { duration: 300 }),
            withTiming(Math.random() * 0.8 + 0.2, { duration: 300 })
          ),
          -1,
          false
        );
      });
    } else {
      visualizerBars.forEach((bar) => {
        bar.value = withTiming(0.1, { duration: 300 });
      });
    }
  }, [isPlaying]);

  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const animatedPlayButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

  const animatedLiveDotStyle = useAnimatedStyle(() => ({
    opacity: liveDotOpacity.value,
  }));

  const createVisualizerBarStyle = (index: number) => 
    useAnimatedStyle(() => ({
      height: interpolate(visualizerBars[index].value, [0, 1], [2, 25]),
      opacity: interpolate(visualizerBars[index].value, [0, 1], [0.3, 1]),
    }));

  const handleVote = async (voteType: 'like' | 'dislike') => {
    if (!session || !trackIdPlaying) {
      router.push('/login');
      return;
    }

    const isUndo = userVote === voteType;
    const action = isUndo ? 'unvote' : 'vote';

    try {
      const response = await api.post(
        `/${action}`,
        { track: trackIdPlaying, vote: voteType },
        { headers: { Authorization: `${session?.token}` } }
      );

      if (isUndo) {
        delete session.user.voted_tracks[trackIdPlaying];
        setUserVote(null);
      } else {
        session.user.voted_tracks[trackIdPlaying] = voteType;
        setUserVote(voteType);
      }
    } catch (err) {
      Alert.alert('Voting Error', err?.response?.data?.message || 'Failed to vote');
    }
  };

  const togglePlayback = async () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;

    playButtonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    try {
      const state = AudioPro.getState();

      if (isLoading) {
        setIsLoading(false);
        setIsPlaying(false);
        if (state === 'PLAYING') {
          AudioPro.stop();
        }
        return;
      }

      if (state === 'PLAYING') {
        AudioPro.stop();
        setIsPlaying(false);
        hasTriggeredRef.current = false;
      } else {
        setIsLoading(true);
        await AudioPro.play(
          {
            id: 'nadia-stream',
            url: streamUrl,
            title: trackPlaying?.title ?? '',
            artist: trackPlaying?.artist?.name ?? 'NADIA Station',
            artwork: 'https://www.nadiaradio.com/agent/nadia/photo',
          },
          {
            headers: {
              audio: {
                'User-Agent': 'NADIA-App-a3f19c28-27b4-47e2-b8c9-5ddef97a21f2',
              },
            },
          }
        );
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('AudioPro error:', error);
    } finally {
      setIsLoading(false);
      isTogglingRef.current = false;
    }
  };

  const tipArtist = () => {

    if (!session?.walletSession) {
      Alert.alert(
        "Tip Unavailable",
        "You need to be authenticated with a Web3 wallet to tip an artist.",
        [{ text: "Got it", style: "default" }]
      );
      return;
    }

    if (!trackPlaying?.artist?.is_tip_available) {
      Alert.alert(
        "Tip Unavailable",
        "This artist is not ready to receive tips yet.",
        [{ text: "Got it", style: "default" }]
      );
      return; 
    }

    SheetManager.show('tipSheet', {
      payload: {
        track: trackPlaying,
        token: session?.token || null
      },
    });
  };

  return (
    <ThemedView style={globalStyles.container}>
        <View style={styles.container}>
        <Text style={styles.stationTitle}>
          <Text style={styles.station}>NADIA </Text>
          <Text style={styles.stationSub}>Station</Text>
        </Text>
          <Animated.View style={[styles.playerContainer, animatedCardStyle]}>
            <View style={styles.coverContainer}>
              <ImageBackground
                source={require('@/assets/images/nadia.jpg')}
                style={styles.stationCover}
                resizeMode="cover"
                imageStyle={{ borderRadius: 20 }}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.2)']}
                  style={styles.gradientOverlay}
                />
              </ImageBackground>
              
              <View style={styles.liveIndicator}>
                <Animated.View style={[styles.liveDot, animatedLiveDotStyle]} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>

            <View style={styles.stationInfo}> 
              <View style={styles.trackInfo}>
                <Text style={styles.nowPlayingLabel}>Now Playing</Text>
                <Text style={styles.trackTitle}>
                  { trackPlaying ? `${trackPlaying.title} by ${trackPlaying.artist.name}` : 'Loading...' }
                </Text>
              </View>
            </View>

            <View style={styles.controlsContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleVote('dislike')}
              >
                <LinearGradient
                  colors={['rgba(61,23,222,1)', 'rgba(197,55,218,1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <AntDesign name={userVote === 'dislike' ? 'dislike1' : 'dislike2'} size={22} color="white" />
                </LinearGradient>
              </TouchableOpacity>
              <Animated.View style={animatedPlayButtonStyle}>
                <TouchableOpacity 
                  onPress={togglePlayback}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(61,23,222,1)', 'rgba(197,55,218,1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.playButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={28}
                        color="#fff"
                      />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleVote('like')}
              >
                <LinearGradient
                  colors={['rgba(61,23,222,1)', 'rgba(197,55,218,1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <AntDesign name={userVote === 'like' ? 'like1' : 'like2'} size={22} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </View>


            <View style={styles.controlsContainer}>
              <View style={styles.tipButton}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={tipArtist}
                  style={{
                    opacity: trackPlaying?.artist?.is_tip_available ? 1 : 0.5,
                  }}
                >
                  <LinearGradient
                    colors={['rgba(61,23,222,1)', 'rgba(197,55,218,1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tipButtonGradient}
                  >
                    <FontAwesome5 name="hand-holding-heart" size={18} color="white" />
                    <Text style={styles.tipButtonText}>Tip Artist</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.visualizer}>
              {visualizerBars.map((_, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.visualizerBar,
                    createVisualizerBarStyle(index)
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  playerContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, .5)',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    padding: 24,
    height: '95%',
    marginHorizontal: 0,
    marginTop: 15,
  },
  coverContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  stationCover: {
    width: 280,
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  liveIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 3,
    marginRight: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stationInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stationTitle: {
    fontSize: 18,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  station: {
    color: '#FF7CE5',
    textShadowColor: 'rgba(255, 124, 229, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  stationSub: {
    color: '#7DD3FC',
    textShadowColor: 'rgba(125, 211, 252, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  trackInfo: {
    alignItems: 'center',
  },
  nowPlayingLabel: {
    color: 'white',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  trackTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  playButtonGradient: {
    borderWidth: 2,
    borderColor: 'rgba(132, 39, 217, 0.5)',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonGradient: {
    borderWidth: 2,
    borderColor: 'rgba(132, 39, 217, 0.5)',
    width: 50,
    height: 50,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButtonGradient: {
    width: 45,
    height: 45,
    borderWidth: 2,
    borderColor: 'rgba(132, 39, 217, 0.5)',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: 'rgba(132, 39, 217, 0.5)',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    gap:5,
  },
  visualizer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 30,
  },
  visualizerBar: {
    width: 4,
    backgroundColor: 'rgba(132, 39, 217, 1)',
    borderRadius: 2,
    minHeight: 2,
  },
  tipButton: {
    marginVertical:30,
  },
  tipButtonText: {
    color: 'white',
    letterSpacing:-0.1,
    fontWeight:'bold',
    marginTop:-2.5,
  },
  modal: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: 'grey',
  },
  modalContainer: {
    flex: 1,
    alignItems: 'center',
  },
});