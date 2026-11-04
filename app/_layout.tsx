import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTitleStyle: { color: colors.text, fontWeight: '800' },
          headerTintColor: colors.primary,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Chess Buddy' }} />
        <Stack.Screen name="play" options={{ title: 'Play vs Bot' }} />
        <Stack.Screen name="puzzles" options={{ title: 'Puzzles' }} />
        <Stack.Screen name="puzzle/[id]" options={{ title: 'Puzzle' }} />
        <Stack.Screen name="review" options={{ title: 'Game Review' }} />
      </Stack>
    </>
  );
}
