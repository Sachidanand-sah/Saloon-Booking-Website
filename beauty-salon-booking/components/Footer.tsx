import Link from 'next/link';
import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand */}
        <div className="col-span-1 md:col-span-1">
          <Link href="/" className="flex items-center gap-2 group mb-4">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600"></div>
             <span className="font-display font-bold text-xl text-white">Lovely Glow</span>
          </Link>
          <p className="text-sm text-gray-400">
            Elevating your beauty with precision, care, and a touch of magic.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-white font-bold mb-4">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/services" className="hover:text-pink-400 transition">Services</Link></li>
            <li><Link href="/book" className="hover:text-pink-400 transition">Book Appointment</Link></li>
            <li><Link href="/login" className="hover:text-pink-400 transition">Client Login</Link></li>
            <li><Link href="/admin" className="hover:text-pink-400 transition">Admin Portal</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-white font-bold mb-4">Contact</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>Hattisar, Kathmandu</li>
            <li>+977 9812345678</li>
            <li>lovelyglow@gmail.com</li>
          </ul>
        </div>

        {/* Social / Newsletter */}
        <div>
          <h3 className="text-white font-bold mb-4">Follow Us</h3>
          <div className="flex gap-4 mb-4">
            {/* Social Placeholders */}
            <div className="w-8 h-8 bg-gray-700 rounded-full hover:bg-pink-600 transition cursor-pointer flex items-center justify-center text-xs">IG</div>
            <div className="w-8 h-8 bg-gray-700 rounded-full hover:bg-pink-600 transition cursor-pointer flex items-center justify-center text-xs">FB</div>
            <div className="w-8 h-8 bg-gray-700 rounded-full hover:bg-pink-600 transition cursor-pointer flex items-center justify-center text-xs">TW</div>
          </div>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Lovely Glow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
