import type { RootScreenProps } from '@/navigation/types';
import { AuthForm } from './AuthForm';

export default function LoginScreen(_props: RootScreenProps<'Login'>) {
  return <AuthForm mode="login" />;
}
