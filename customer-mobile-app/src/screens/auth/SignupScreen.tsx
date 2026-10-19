import type { RootScreenProps } from '@/navigation/types';
import { AuthForm } from './AuthForm';

export default function SignupScreen(_props: RootScreenProps<'Signup'>) {
  return <AuthForm mode="signup" />;
}
