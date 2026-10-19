import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Photo, Row } from '@/components/ui';
import { BRAND } from '@/config';
import { colors, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

const perks = [
  { icon: 'calendar-outline' as const, text: 'Live availability, instant confirmation' },
  { icon: 'gift-outline' as const, text: '100 welcome points to spend' },
  { icon: 'location-outline' as const, text: 'Three studios across the valley' },
];

export default function WelcomeScreen({ navigation }: RootScreenProps<'Welcome'>) {
  return (
    <LinearGradient colors={[colors.plum900, colors.plum700]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <Photo uri="/images/hero.jpg" style={styles.arch} icon="flower-outline">
            <LinearGradient colors={['transparent', 'rgba(42,22,38,0.75)']} style={StyleSheet.absoluteFill} />
          </Photo>
        </View>

        <View style={styles.bottom}>
          <AppText variant="eyebrow" style={{ color: colors.rose300 }}>
            {BRAND.tagline}
          </AppText>
          <AppText variant="display" style={styles.title}>
            {BRAND.name}
          </AppText>
          <AppText style={styles.lead}>Hair, skin, nails and spa by senior specialists. Book in under a minute.</AppText>

          <View style={{ gap: 10, marginTop: space.lg }}>
            {perks.map(p => (
              <Row key={p.text} gap={10}>
                <Ionicons name={p.icon} size={18} color={colors.rose300} />
                <AppText style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{p.text}</AppText>
              </Row>
            ))}
          </View>

          <View style={{ gap: 10, marginTop: space.xl }}>
            <Button title="Create an account" variant="light" size="lg" onPress={() => navigation.navigate('Signup')} />
            <Button
              title="I already have an account"
              variant="onDark"
              size="lg"
              onPress={() => navigation.navigate('Login')}
            />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  top: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingTop: space.lg },
  arch: { width: '70%', maxWidth: 300, flex: 1, maxHeight: 360, borderTopLeftRadius: 999, borderTopRightRadius: 999 },
  bottom: { padding: space.xl, paddingTop: space.xl },
  title: { color: colors.white, marginTop: 6, fontSize: 38, lineHeight: 44 },
  lead: { color: 'rgba(255,255,255,0.75)', marginTop: 8 },
});
