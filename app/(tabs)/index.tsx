import React, { useState, useEffect } from 'react';
import { View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    ActivityIndicator, 
    Linking, 
    ImageBackground
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { globalStyles } from '@/styles/global';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import Entypo from '@expo/vector-icons/Entypo';
import api from '@/services/axios';
import { useSession } from '@/context/authSession';

export default function HomeScreen() {
  const { session, isAuthLoading } = useSession();
  const [lastTweet, setLastTweet] = useState(null);
  const [topSongs, setTopSongs] = useState([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);
  const navigation = useNavigation();

  const loadHomeTimeline = async () => {
    try {
      const response = await api.get("/home/load");
      if (response.data) {
        setLastTweet(response.data?.lastTweet || null);
        setTopSongs(response.data?.topTracks || []);
      }
    } catch (error) {
      console.error("Failed to load home timeline:", error);
    } finally {
      setIsLoadingTimeline(false);
      setTimeout(loadHomeTimeline, 300000);
    }
  };

  useEffect(() => {
    loadHomeTimeline();
  }, []);

  return (
    <ThemedView style={globalStyles.container}>
      <ScrollView style={[{ marginBottom: 50, }]} showsVerticalScrollIndicator={false}>
        <View style={globalStyles.header}>
          <View style={globalStyles.headerIcon}>
            <Ionicons name="eye" size={26} style={globalStyles.headerIconStyle} />
          </View>
          <ThemedText style={globalStyles.headerTitle}>NADIA Dashboard</ThemedText>
        </View>

        <View style={styles.sectionContainer}>
          <View style={globalStyles.boxCard}>
            <View style={styles.boxHeader}>
              {isLoadingTimeline ? (
                <ActivityIndicator size="small" color="#8427d9" style={styles.loader} />
              ) : (
              <>
              <ImageBackground
                source={require('@/assets/images/nadia-avatar.jpg')}
                style={styles.avatar}
                imageStyle={{ borderRadius: 20 }}
              />
              <View style={styles.boxContent}>
                <Text style={styles.boxContentSubtitle}>NADIA's latest tweet</Text>
                  <Text style={styles.boxContentText}>
                    {lastTweet ? lastTweet.tweet || 'No tweet content available' : 'No tweets available'}
                  </Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  if (lastTweet?.id) {
                    Linking.openURL(`https://x.com/nadiaonline_ai/status/${lastTweet.id}`);
                  }
                }}
              >
                <LinearGradient 
                  colors={['rgba(13, 13, 13,.1)', 'rgba(13, 13, 13,.2)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.linkButton}>
                    <Text style={styles.linkIcon}>
                      <Entypo name="link" size={20} color="white" />
                    </Text>
                </LinearGradient>
              </TouchableOpacity>
              </>
              )}
            </View>
          </View>
        </View>

        <View style={globalStyles.header}>
          <View style={globalStyles.headerIcon}>
            <Ionicons name="radio" size={26} style={globalStyles.headerIconStyle} />
          </View>
          <ThemedText style={globalStyles.headerTitle}>Live Station</ThemedText>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.liveStationCard}>
            <ImageBackground
              source={require('@/assets/images/nadia-station.jpg')}
              style={styles.backgroundImage}
              resizeMode="cover"
              imageStyle={{ borderRadius: 8 }}
            >
              <View style={styles.overlay}>
                <View style={styles.buttonContainer}>

                  <View style={styles.button}>
                    <TouchableOpacity onPress={() => navigation.navigate('radio')}>
                      <LinearGradient
                        colors={['rgba(61,23,222,1)', 'rgba(197,55,218,1)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                      >
                        <Text style={styles.buttonIcon}>
                          <Ionicons
                            name="play"
                            size={28}
                            color="#fff"
                          />
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <Text style={styles.buttonText}>LISTEN</Text>
                  </View>

                  <View style={styles.button}>
                    <TouchableOpacity onPress={() => navigation.navigate('chat')}>
                      <LinearGradient
                        colors={['rgba(61,23,222,1)', 'rgba(197,55,218,1)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                      >
                        <Text style={styles.buttonIcon}>
                          <Ionicons
                            name="chatbubble-ellipses"
                            size={28}
                            color="#fff"
                          />
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <Text style={styles.buttonText}>CHAT</Text>
                  </View>
                </View>
              </View>
            </ImageBackground>
          </View>
        </View>

        <View style={globalStyles.header}>
          <View style={globalStyles.headerIcon}>
            <Ionicons name="heart-sharp" size={26} style={globalStyles.headerIconStyle} />
          </View>
          <ThemedText style={globalStyles.headerTitle}>Top Voted Songs</ThemedText>
        </View>

        <View style={styles.sectionContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {topSongs.map((song) => (
              <View key={song.id} style={styles.songItem}>
                <Image source={{ uri: song?.artwork?.medium || song.artwork?.large || song.artwork?.small }} style={styles.coverImage} contentFit="cover" />
                <ThemedText style={styles.songTitle}>{song?.title}</ThemedText>
                <ThemedText style={styles.songArtist}>{song?.artist?.name || '-'}</ThemedText>
              </View>
            ))}
          </ScrollView>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 0,
  },
  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boxContent: {
    flex: 1,
  },
  boxContentSubtitle: {
    fontSize: 10,
    color: 'white',
    marginBottom: 4,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  boxContentText: {
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
  },
  linkButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 5,
  },
  linkIcon: {
    fontSize: 16,
  },
  loader: {
    marginVertical: 8,
  },
  liveStationCard: {
    flex:1,
    minHeight: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '50%',
    gap: 0,
  },
  button: {
    flex: 1,
    alignItems: 'center',
  },
  gradientButton: {
    width:60,
    height:60,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    fontSize: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },

  viewAllText: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2d2d4a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sessionAvatarText: {
    fontSize: 20,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  sessionDuration: {
    fontSize: 12,
    color: '#8b8b8b',
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 12,
    color: '#8b8b8b',
  },
  playButton: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  playButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  songItem: {
    marginRight: 16,
    width: 160,
  },
  coverImage: {
    width: 160,
    height: 160,
    borderRadius: 8,
    marginBottom: 6,
  },
  songTitle: {
    fontSize: 12,
    textAlign: 'left',
  },
  songArtist: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'left',
  },
});