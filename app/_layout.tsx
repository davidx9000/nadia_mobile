import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import React, { useEffect, useLayoutEffect } from 'react';
import { Stack, useNavigation  } from 'expo-router';
import { Text, TouchableOpacity, View, AppRegistry  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setBackgroundColorAsync } from 'expo-system-ui';
import 'react-native-reanimated';
import TrackPlayer from 'react-native-track-player';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/hooks/useColorScheme';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { SessionProvider } from '@/context/authSession';
import { SidebarProvider } from '@/components/Sidebar';
import { Ionicons } from '@expo/vector-icons';
import { SheetProvider } from 'react-native-actions-sheet';
import '@/providers/sheets.tsx';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    OpenSans: require('../assets/fonts/OpenSans.ttf'),
  });

  useEffect(() => {
    setBackgroundColorAsync('#0d0d0d');
  }, []);

  if (!loaded) return null;

  return (
    <SessionProvider>
      <WebSocketProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SheetProvider context="global">
            <SidebarProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="login" options={{ presentation: 'modal', contentStyle: { backgroundColor: "transparent" }, headerShown: false }} />
                  <Stack.Screen name="member/edit" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'light'} />
            </SidebarProvider>
            </SheetProvider>
          </GestureHandlerRootView> 
        </ThemeProvider>
      </WebSocketProvider>
    </SessionProvider>
  );
}