import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import RecoilProvider from '@/store/RecoilProvider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Interview Bot - Practice Technical Interviews',
  description: 'AI-powered interview practice platform with personalized questions and feedback',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RecoilProvider>
          {children}
          <Toaster />
        </RecoilProvider>
      </body>
    </html>
  );
}