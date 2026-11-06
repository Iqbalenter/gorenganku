import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { enableScreens } from 'react-native-screens';
import {
  useFonts,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_500Medium,
} from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { initDb } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import { colors, fonts } from '../src/constants/theme';

enableScreens(true);

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    let active = true;

    async function prepareApp() {
      try {
        await initDb();
        await seedDatabase();
        if (active) setDbReady(true);
      } catch (error) {
        if (active) {
          setDbError(error instanceof Error ? error.message : 'Database gagal diinisialisasi');
        }
      }
    }

    prepareApp();
    return () => { active = false; };
  }, []);

  if (dbError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
        <Text style={{ fontFamily: fonts.bodySemiBold, color: colors.danger, textAlign: 'center' }}>
          Gagal menyiapkan database
        </Text>
        <Text style={{ fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
          {dbError}
        </Text>
      </View>
    );
  }

  if (!fontsLoaded || !dbReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark }}>
        <ActivityIndicator size="large" color={colors.white} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={colors.statusBar} translucent={false} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 300,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="splash" options={{ animation: 'none', gestureEnabled: false }} />
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="(pos)" options={{ animation: 'fade', animationDuration: 200 }} />
      </Stack>
    </>
  );
}
