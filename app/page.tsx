'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecoilValue } from 'recoil';
import { userState } from '@/store/atoms';

export default function Home() {
  const user = useRecoilValue(userState);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('auth_token');
    if (token && user) {
      router.push('/dashboard');
    } else {
      router.push('/auth/login');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}