import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthProvider';
import { api, errorMessage, fieldErrors } from '@/api/client';
import { AppText, Avatar, Button, Card, Input, Row, Screen } from '@/components/ui';
import { useToast } from '@/components/toast';
import { colors, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';
import type { User } from '@/api/types';

const PHONE = /^\+?[0-9 ()-]{7,20}$/;

export default function EditProfileScreen({ navigation }: RootScreenProps<'EditProfile'>) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const dirty = name.trim() !== user.name || phone.trim() !== (user.phone ?? '');

  const save = async () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Please enter your name';
    if (phone.trim() && !PHONE.test(phone.trim())) e.phone = 'Please enter a valid phone number';
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const res = await api.patch<{ user: User }>('/auth/me', { name: name.trim(), phone: phone.trim() || null });
      setUser(res.user);
      toast('Profile updated');
      navigation.goBack();
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={[]}>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: space.sm }}>
          <Avatar name={name.trim() || user.name} size={84} />
          <AppText variant="caption">Member since {new Date(user.createdAt).getFullYear()}</AppText>
        </View>

        <Card style={{ gap: space.lg }}>
          <Input label="Full name" value={name} onChangeText={setName} autoComplete="name" error={errors.name} returnKeyType="next" />
          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="98XXXXXXXX"
            keyboardType="phone-pad"
            autoComplete="tel"
            error={errors.phone}
            hint="We'll only call about your appointments and orders."
          />
          <View style={{ gap: 6 }}>
            <AppText variant="label">Email</AppText>
            <Row style={{ height: 50, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.sand }}>
              <AppText style={{ flex: 1, color: colors.muted }} numberOfLines={1}>
                {user.email}
              </AppText>
              <Ionicons name="lock-closed-outline" size={16} color={colors.muted} />
            </Row>
            <AppText variant="caption">To change your email, please contact the salon.</AppText>
          </View>
        </Card>

        {formError ? (
          <AppText variant="caption" style={{ color: colors.danger, textAlign: 'center' }} accessibilityLiveRegion="polite">
            {formError}
          </AppText>
        ) : null}
        <Button title="Save changes" size="lg" onPress={save} loading={busy} disabled={!dirty} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
