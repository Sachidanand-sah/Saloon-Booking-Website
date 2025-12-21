'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Client-side validation
    if (name.trim().length < 2) {
      alert('Please enter your full name.');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        alert('Account created successfully! You can now use these credentials to log in anytime.');
        router.push('/');
      } else {
        alert(data.message || 'Signup failed.');
      }
    } catch (error) {
      console.error('Signup Error:', error);
      alert('Failed to connect to the server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-pink-200 blur-3xl opacity-30 animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-pink-300 blur-3xl opacity-30 animate-pulse-slow"></div>
      </div>

      <div className="w-full max-w-5xl h-[800px] max-h-[90vh] grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden z-10 mx-4">
        <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-pink-600 to-rose-700 text-white p-12 relative text-center">
          <div className="z-10 animate-slide-up">
            <h1 className="text-5xl font-display font-bold mb-4">Lovely Glow</h1>
            <p className="text-xl text-pink-100 italic">"Join us for an exquisite experience."</p>
          </div>
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute top-10 left-10 w-20 h-20 border border-white/20 rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-32 h-32 border border-white/20 rounded-full"></div>
        </div>

        <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-white/80 backdrop-blur-sm">
          <div className="w-full max-w-md mx-auto space-y-8 animate-fade-in">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-gray-900 font-display">Create Account</h2>
              <p className="mt-2 text-sm text-gray-600">Please fill in your details to sign up.</p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Email address"
                  type="email"
                  placeholder="hello@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" isLoading={loading} size="lg">
                Sign Up
              </Button>
            </form>

            <div className="pt-6 border-t border-gray-100 mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-pink-600 hover:text-pink-500 transition-colors">
                  Log in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
