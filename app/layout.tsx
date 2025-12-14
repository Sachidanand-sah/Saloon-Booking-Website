import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './globals.css';

export const metadata = {
  title: 'Lovely Glow | Premium Beauty Salon',
  description: 'Explore beauty salon services and book appointments easily',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <section className="min-h-screen">
             <div className="flex-1">
                {children}
             </div>
          </section>
        </main>
        <Footer />
      </body>
    </html>
  );
}
