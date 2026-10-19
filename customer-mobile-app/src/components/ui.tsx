import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadow, space } from '@/theme';
import { initials } from '@/lib/format';
import { imageUri } from '@/lib/places';
import type { BookingStatus } from '@/api/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------- Text ----------

const textVariants = StyleSheet.create({
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.plum900 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.plum900 },
  heading: { fontFamily: fonts.display, fontSize: 19, lineHeight: 25, color: colors.plum900 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.plum900 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.rose600 },
  price: { fontFamily: fonts.display, fontSize: 18, color: colors.plum900 },
});

export function AppText({
  variant = 'body',
  style,
  ...props
}: TextProps & { variant?: keyof typeof textVariants; style?: StyleProp<TextStyle> }) {
  return <Text {...props} style={[textVariants[variant], style]} />;
}

// ---------- Button ----------

const buttonTone = {
  primary: { bg: colors.plum900, fg: colors.white, border: colors.plum900 },
  accent: { bg: colors.rose500, fg: colors.white, border: colors.rose500 },
  outline: { bg: colors.white, fg: colors.plum900, border: colors.plum200 },
  ghost: { bg: 'transparent', fg: colors.plum800, border: 'transparent' },
  light: { bg: colors.white, fg: colors.plum900, border: colors.white },
  danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
  /** Outline for dark backgrounds. */
  onDark: { bg: 'transparent', fg: colors.white, border: 'rgba(255,255,255,0.35)' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: keyof typeof buttonTone;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = buttonTone[variant];
  const height = size === 'sm' ? 38 : size === 'lg' ? 54 : 46;
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        { height, backgroundColor: t.bg, borderColor: t.border, paddingHorizontal: size === 'sm' ? 14 : 20 },
        variant === 'primary' || variant === 'accent' ? shadow : null,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        inactive && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={t.fg} /> : null}
          <Text style={[styles.buttonText, { color: t.fg, fontSize: size === 'lg' ? 16 : 15 }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

// ---------- Layout ----------

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  edges = ['top'],
  contentStyle,
  background = colors.ivory,
}: {
  children: ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  background?: string;
}) {
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: background }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.screenContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.rose500} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, shadow, pressed && { opacity: 0.92 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, shadow, style]}>{children}</View>;
}

export function SectionHeader({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <AppText variant="eyebrow">{eyebrow}</AppText> : null}
        <AppText variant="title" style={{ marginTop: eyebrow ? 4 : 0 }}>
          {title}
        </AppText>
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="link">
          <AppText variant="label" style={{ color: colors.rose600 }}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- Inputs ----------

export function Input({
  label,
  error,
  hint,
  style,
  ...props
}: ComponentProps<typeof TextInput> & { label: string; error?: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 6 }, style as StyleProp<ViewStyle>]}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        onFocus={e => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
        style={[
          styles.input,
          props.multiline && { height: 100, paddingTop: 12, textAlignVertical: 'top' },
          focused && { borderColor: colors.rose500 },
          error ? { borderColor: colors.danger } : null,
        ]}
      />
      {error ? (
        <AppText variant="caption" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.plum900, borderColor: colors.plum900 }]}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? colors.white : colors.plum800} /> : null}
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

// ---------- Badges ----------

const badgeTones = {
  neutral: { bg: colors.sand, fg: colors.plum800 },
  plum: { bg: colors.plum100, fg: colors.plum800 },
  rose: { bg: colors.rose100, fg: colors.rose600 },
  success: { bg: '#e3f1ea', fg: colors.success },
  warning: { bg: '#f6ecdc', fg: colors.warning },
  danger: { bg: '#f6e0df', fg: colors.danger },
};

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: keyof typeof badgeTones; icon?: IconName }) {
  const t = badgeTones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} /> : null}
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const statusMeta: Record<BookingStatus, { label: string; tone: keyof typeof badgeTones }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'plum' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  NO_SHOW: { label: 'No-show', tone: 'danger' },
};

export const StatusBadge = ({ status }: { status: BookingStatus }) => (
  <Badge label={statusMeta[status].label} tone={statusMeta[status].tone} />
);

// ---------- Media ----------

export function Avatar({ name, uri, size = 44 }: { name: string; uri?: string | null; size?: number }) {
  const src = imageUri(uri);
  if (src) return <Image source={src} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  return (
    <LinearGradient
      colors={[colors.rose100, colors.plum100]}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontFamily: fonts.display, color: colors.plum700, fontSize: size * 0.36 }}>{initials(name)}</Text>
    </LinearGradient>
  );
}

const categoryIcon: Record<string, IconName> = {
  hair: 'cut-outline',
  skin: 'sparkles-outline',
  nails: 'hand-left-outline',
  spa: 'flower-outline',
};

/** Photo from the API, or a branded gradient with an icon when there isn't one. */
export function Photo({
  uri,
  style,
  icon = 'sparkles-outline',
  category,
  children,
}: {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
  category?: string;
  children?: ReactNode;
}) {
  const src = imageUri(uri);
  const [failed, setFailed] = useState(false);
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: colors.linen }, style]}>
      {src && !failed ? (
        <Image
          source={src}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <LinearGradient colors={[colors.plum700, colors.rose500]} style={[StyleSheet.absoluteFill, styles.photoFallback]}>
          <Ionicons name={(category && categoryIcon[category]) || icon} size={30} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      )}
      {children}
    </View>
  );
}

// ---------- States ----------

export function Skeleton({ height = 80, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ height, borderRadius: radius.md, backgroundColor: colors.linen, opacity }, style]} />;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 36 }}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.rose500} />
      </View>
      <AppText variant="heading" style={{ marginTop: 14, textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="caption" style={{ marginTop: 6, textAlign: 'center', maxWidth: 280 }}>
          {message}
        </AppText>
      ) : null}
      {action ? <Button title={action} size="sm" onPress={onAction} style={{ marginTop: 18 }} /> : null}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ alignItems: 'center', gap: 10 }}>
      <Ionicons name="cloud-offline-outline" size={28} color={colors.muted} />
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        {message}
      </AppText>
      {onRetry ? <Button title="Try again" size="sm" variant="outline" onPress={onRetry} /> : null}
    </Card>
  );
}

export function Row({ children, style, gap = space.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: space.md }} />;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  buttonText: { fontFamily: fonts.semibold },
  screenContent: { padding: space.lg, paddingBottom: 40, gap: space.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.plum800 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12 },
  photoFallback: { alignItems: 'flex-end', justifyContent: 'flex-end', padding: 14 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.rose50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
