
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import App from '../App';

// Mock fetch
global.fetch = jest.fn();

const mockServices = [
  { id: '1', name: 'Haircut', price: '$25' },
  { id: '2', name: 'Manicure', price: '$15' },
];

describe('App Flow', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('successfully logs in and navigates to home', async () => {
     fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: '1', name: 'Test User' } }),
    });
    // Subsequent fetch for services
    fetch.mockResolvedValueOnce({
      json: async () => mockServices,
    });

    const { getByText, getByPlaceholderText, findAllByText } = render(<App />);

    // Login Screen
    const emailInput = getByPlaceholderText('email@example.com');
    const passwordInput = getByPlaceholderText('Password');
    const loginButton = getByText('Log In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password');
    fireEvent.press(loginButton);

    // Verify API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    // Check navigation to Home (Service List)
    const serviceItems = await findAllByText('Haircut');
    expect(serviceItems).toBeTruthy();
  });
});
