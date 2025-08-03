import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import MediaPlayer from '@/components/MediaPlayer';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSession } from '@/context/authSession';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session } = useSession();

  const isLoggedIn = !!session;
  const userAvatar = session?.user?.avatar?.trim();

  const profileOptions = {
    title: 'Profile',
    tabBarIcon: ({ color }) =>
      isLoggedIn && userAvatar ? (
        <Image source={{ uri: userAvatar }} style={styles.avatar} />
      ) : (
        <Ionicons name="person" size={24} color={color} />
      ),
    ...(isLoggedIn
      ? {}
      : {
          tabBarButton: (props) => (
            <TouchableOpacity {...props} onPress={() => router.push('/login')} />
          ),
        }),
  };

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].icon,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: {
            borderTopWidth: 1,
            position: 'absolute',
            borderColor: 'rgba(35, 35, 35, 1)',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="radio"
          options={{
            title: 'Radio',
            tabBarIcon: ({ color }) => <Feather size={26} name="radio" color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color }) => <Ionicons size={24} name="chatbubble-ellipses" color={color} />,
          }}
        />
        <Tabs.Screen name="profile" options={profileOptions} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatar: {
    width:24,
    height: 24,
    borderRadius: 90,
  }
});