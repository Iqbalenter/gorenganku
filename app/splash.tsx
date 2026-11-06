import { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts } from '../src/constants/theme';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const slideAnim = new Animated.Value(30);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View style={[styles.center, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🍟</Text>
        </View>
        <Text style={styles.brandName}>GorenganKu</Text>
        <Text style={styles.brandTagline}>Aplikasi Kasir Warung Gorengan</Text>
      </Animated.View>

      <Animated.View style={[styles.bottom, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.bottomText}>Kasir · Stok · Laporan</Text>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  bgCircle1: { position: 'absolute', width: width * 1.2, height: width * 1.2, borderRadius: width * 0.6, backgroundColor: 'rgba(255,255,255,0.03)', top: -width * 0.3, right: -width * 0.3 },
  bgCircle2: { position: 'absolute', width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: 'rgba(255,255,255,0.03)', bottom: -width * 0.1, left: -width * 0.2 },
  center: { alignItems: 'center' },
  logoBox: { width: 100, height: 100, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoEmoji: { fontSize: 52 },
  brandName: { fontFamily: fonts.display, fontSize: 36, color: colors.white, letterSpacing: 1 },
  brandTagline: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 },
  bottom: { position: 'absolute', bottom: 60, alignItems: 'center', gap: 16 },
  bottomText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor: colors.white, width: 18 },
});
