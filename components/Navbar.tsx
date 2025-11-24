'use client';

import { useRecoilState } from 'recoil';
import { useRouter } from 'next/navigation';
import { userState } from '@/store/atoms';
import { Button } from '@/components/ui/button';
import { User, LogOut } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useRecoilState(userState);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    router.push('/auth/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">AI Interview Bot</h1>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user.name}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}