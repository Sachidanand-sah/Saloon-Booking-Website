'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      if (email === 'user@example.com' && password === 'password123') {
        // Successful login
        router.push('/'); // Redirect to home
      } else {
        alert('Invalid email or password.');
      }
    }, 1500);
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
            <p className="text-xl text-pink-100 italic">"Where elegance meets expertise."</p>
          </div>
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute top-10 left-10 w-20 h-20 border border-white/20 rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-32 h-32 border border-white/20 rounded-full"></div>
        </div>

        <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-white/80 backdrop-blur-sm">
          <div className="w-full max-w-md mx-auto space-y-8 animate-fade-in">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-gray-900 font-display">Welcome Back</h2>
              <p className="mt-2 text-sm text-gray-600">Please enter your details to sign in.</p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
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

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-pink-600 hover:text-pink-500">
                    Forgot password?
                  </a>
                </div>
              </div>

              <Button type="submit" className="w-full" isLoading={loading} size="lg">
                Sign in
              </Button>

              
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/book" className="font-medium text-pink-600 hover:text-pink-500">
                Book as Guest
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
