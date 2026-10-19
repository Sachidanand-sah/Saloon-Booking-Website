import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/AuthProvider';
import { AuthForm } from '@/screens/auth/AuthForm';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

async function setup(mode: 'login' | 'signup') {
  global.fetch = jest.fn(async (url: string) => {
    if (String(url).endsWith('/auth/signup')) {
      return {
        ok: false,
        status: 409,
        json: async () => ({ code: 'EMAIL_TAKEN', message: 'An account with this email already exists' }),
      } as Response;
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as unknown as typeof fetch;

  return await render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <AuthForm mode={mode} />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

it('validates the sign-up form before calling the server', async () => {
  await setup('signup');
  await fireEvent.press(await screen.findByRole('button', { name: 'Create account' }));
  expect(screen.getByText('Please enter your full name')).toBeTruthy();
  expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
  expect(screen.getByText('Use at least 8 characters')).toBeTruthy();
  expect(global.fetch).not.toHaveBeenCalled();
});

it('shows the server message when the email is taken', async () => {
  await setup('signup');
  await fireEvent.changeText(screen.getByLabelText('Full name'), 'Sita Sharma');
  await fireEvent.changeText(screen.getByLabelText('Email'), 'sita@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'long-enough');
  await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() => expect(screen.getByText('An account with this email already exists')).toBeTruthy());
});
