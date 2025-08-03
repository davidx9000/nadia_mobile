import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
  Button,
  Alert
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { globalStyles } from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/context/authSession';

const { width } = Dimensions.get('window');

export default function Profile() {
  const { session, isAuthLoading, signOut } = useSession();

  useEffect(() => {
    if (!isAuthLoading && !session) {
      router.replace('/login');
    }
  }, [session, isAuthLoading]);
  
  if (isAuthLoading) {
    return (
      <ThemedView style={[globalStyles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#8427d9" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </ThemedView>
    );
  }
  
  if (!session) return null;

  const support = () => {
    return Alert.alert(
      'Help & Support',
      'Please contact the developer at ldaviwof@gmail.com or @daviwof.'
    );
  }
  
  const { name, username, avatar, type, member_since: memberSince, auth_with: authWith } = session.user;
  
  return (
    <ThemedView style={globalStyles.container}>

      <View style={globalStyles.header}>
        <View style={globalStyles.headerIcon}>
          <Ionicons name="person" size={26} style={globalStyles.headerIconStyle} />
        </View>
        <ThemedText style={globalStyles.headerTitle}>My Profile</ThemedText>
      </View>

      <View style={styles.container}>
        <View>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarWrapper}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.defaultAvatar}>
                    <Ionicons name="person" size={40} color="#8427d9" />
                  </View>
                )}
                <View style={styles.avatarBorder} />
              </View>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.username}>@{username}</Text>
              <View style={styles.roleContainer}>
                <Ionicons name="shield-checkmark" size={16} color="#8427d9" />
                <Text style={styles.role}>{type}</Text>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="calendar" size={20} color="#8427d9" />
                <Text style={styles.statLabel}>Joined</Text>
                <Text style={styles.statValue}>{memberSince ?? '-'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="star" size={20} color="#8427d9" />
                <Text style={styles.statLabel}>Authenticated With</Text>
                <Text style={styles.statValue}>{authWith ?? '-'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionSection}>
            <TouchableOpacity onPress={() => router.push('/member/edit')}  style={styles.actionButton}>
              <Ionicons name="settings" size={20} color="#8427d9" />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => support()} style={styles.actionButton}>
              <Ionicons name="help-circle" size={20} color="#8427d9" />
              <Text style={styles.actionButtonText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
            <Ionicons name="log-out" size={20} color="#fff" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingBottom: 24,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -30,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  defaultAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBorder: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#fff',
  },
  
  // User Info Styles
  userInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f4ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  role: {
    fontSize: 14,
    color: '#8427d9',
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },

  // Stats Styles
  statsContainer: {
    flexDirection: 'row',
    marginTop: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },

  // Action Section Styles
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },

  // Logout Section Styles
  logoutSection: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    paddingTop: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8427d9',
    paddingVertical: 16,
    borderRadius: 199,
    shadowColor: '#8427d9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});