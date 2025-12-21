'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Button from './ui/Button';

export default function Navbar() {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [isOpen, setIsOpen] = useState(false);

  if (isLoginPage) return null;

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-gray-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 group-hover:scale-110 transition-transform duration-300"></div>
            <span className="font-display font-bold text-xl tracking-tight text-gray-900">
              Lovely Glow
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/services" className="text-sm font-medium text-gray-600 hover:text-pink-600 transition-colors">
              Services
            </Link>
            <Link href="/book" className="text-sm font-medium text-gray-600 hover:text-pink-600 transition-colors">
              Book Online
            </Link>
            <Link href="/admin" className="text-sm font-medium text-gray-600 hover:text-pink-600 transition-colors">
              Admin
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
             <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
               Sign in
             </Link>
             <Link href="/services">
              <Button size="sm" className="rounded-full">
                Book Now
              </Button>
             </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-slide-up">
          <div className="px-4 pt-2 pb-4 space-y-1">
            <Link href="/services" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-pink-600 hover:bg-gray-50">
              Services
            </Link>
            <Link href="/book" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-pink-600 hover:bg-gray-50">
              Book Online
            </Link>
            <Link href="/admin" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-pink-600 hover:bg-gray-50">
              Admin
            </Link>
            <hr className="my-2 border-gray-100" />
            <Link href="/login" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-pink-600 hover:bg-gray-50">
              Sign in
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
