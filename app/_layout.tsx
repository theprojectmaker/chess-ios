import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka/700Bold';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '../components/ToastHost';
import { setSoundEnabled } from '../lib/sound';
import { loadProgress } from '../lib/storage';
import { colors } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold, Nunito_600SemiBold, Nunito_800ExtraBold });

  useEffect(() => {
    loadProgress().then((p) => setSoundEnabled(p.sound));
  }, []);
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.page }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="game" options={{ gestureEnabled: false }} />
        <Stack.Screen name="local" options={{ gestureEnabled: false }} />
        <Stack.Screen name="lesson" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="review" />
        <Stack.Screen name="teach" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
      </Stack>
      <ToastHost />
    </SafeAreaProvider>
  );
}
