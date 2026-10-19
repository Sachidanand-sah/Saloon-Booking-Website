import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/auth/AuthProvider';
import { errorMessage, fieldErrors } from '@/api/client';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { colors, space } from '@/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const navigation = useNavigation();
  const { login, signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === 'signup' && form.name.trim().length < 2) e.name = 'Please enter your full name';
    if (!EMAIL.test(form.email.trim())) e.email = 'Please enter a valid email address';
    if (mode === 'signup' && form.phone && !/^\+?[0-9 ()-]{7,20}$/.test(form.phone.trim())) {
      e.phone = 'Please enter a valid phone number';
    }
    if (mode === 'signup' ? form.password.length < 8 : !form.password) {
      e.password = mode === 'signup' ? 'Use at least 8 characters' : 'Please enter your password';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setFormError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      // On success the navigator swaps to the signed-in screens automatically.
      if (mode === 'login') await login(form.email.trim(), form.password);
      else
        await signup({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
        });
    } catch (e) {
      setErrors(fieldErrors(e));
      setFormError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={[]} contentStyle={{ paddingTop: space.sm }}>
        <View>
          <AppText variant="display">{mode === 'login' ? 'Welcome back' : 'Create your account'}</AppText>
          <AppText variant="caption" style={{ marginTop: 6, fontSize: 15 }}>
            {mode === 'login'
              ? 'Log in to book, manage appointments and use your points.'
              : 'Join free and get 100 welcome points to spend on your first visit.'}
          </AppText>
        </View>

        {mode === 'signup' ? (
          <Input label="Full name" value={form.name} onChangeText={set('name')} placeholder="Sita Sharma" autoComplete="name" error={errors.name} />
        ) : null}
        <Input
          label="Email"
          value={form.email}
          onChangeText={set('email')}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={errors.email}
        />
        {mode === 'signup' ? (
          <Input
            label="Phone (optional)"
            value={form.phone}
            onChangeText={set('phone')}
            placeholder="98XXXXXXXX"
            keyboardType="phone-pad"
            autoComplete="tel"
            hint="For appointment reminders only."
            error={errors.phone}
          />
        ) : null}
        <Input
          label="Password"
          value={form.password}
          onChangeText={set('password')}
          placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
          secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          onSubmitEditing={submit}
          error={errors.password}
        />

        {formError ? (
          <View style={{ backgroundColor: '#f6e0df', padding: space.md, borderRadius: 12 }} accessibilityRole="alert">
            <AppText style={{ color: colors.danger, fontSize: 14 }}>{formError}</AppText>
          </View>
        ) : null}

        <Button title={mode === 'login' ? 'Log in' : 'Create account'} size="lg" loading={busy} onPress={submit} />

        <Pressable
          onPress={() => navigation.navigate(mode === 'login' ? 'Signup' : 'Login')}
          style={{ alignItems: 'center', padding: space.sm }}
          accessibilityRole="link"
        >
          <AppText variant="caption" style={{ fontSize: 14 }}>
            {mode === 'login' ? 'New to Lalima? ' : 'Already have an account? '}
            <AppText variant="label" style={{ color: colors.rose600 }}>
              {mode === 'login' ? 'Create an account' : 'Log in'}
            </AppText>
          </AppText>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
