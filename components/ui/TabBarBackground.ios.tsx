import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabBarBackground() {
  return (
    <LinearGradient
      colors={['#0d0d0d', '#0d0d0d']}
      locations={[0, 0]}
      style={StyleSheet.absoluteFillObject}
    />
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
