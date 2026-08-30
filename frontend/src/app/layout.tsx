import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import SpiderWebCanvas from '@/components/canvas/SpiderWebCanvas';
import { AuthProvider } from '@/context/AuthContext';
import AuthModal from '@/components/auth/AuthModal';

export const metadata: Metadata = {
  title: 'GWEN — Local-First Multi-Agent AI Assistant',
  description: 'Cybernetic AI Command Center coordinating specialized agents for real task execution.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#030407] text-[#f8fafc] font-['Inter'] antialiased min-h-screen overflow-x-hidden relative selection:bg-[#ff1a40]/30 selection:text-white">
        <AuthProvider>
          {/* Interactive Spiderweb Network Background */}
          <SpiderWebCanvas primaryColor="#ff1a40" glowColor="#ff1a40" />

          {/* Ambient Subtle Red Glows & Grid */}
          <div className="ambient-glow" />
          <div className="ambient-grid" />

          <div className="flex min-h-screen relative z-10">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-64 pt-16 md:pt-8 p-4 md:p-8 min-h-screen flex flex-col overflow-y-auto">
              {children}
            </main>
          </div>

          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
