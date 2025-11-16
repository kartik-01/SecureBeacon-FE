import { Shield, Lock, User, LogOut, ArrowLeft, History } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

interface NavbarProps {
  showBackButton?: boolean;
  onBack?: () => void;
  showGuestMode?: boolean;
  onAuth?: () => void;
  showHistory?: boolean;
  onHistoryClick?: () => void;
  historyButtonRef?: React.RefObject<HTMLButtonElement>;
}

export function Navbar({ 
  showBackButton = false, 
  onBack, 
  showGuestMode = false, 
  onAuth,
  showHistory = false,
  onHistoryClick,
  historyButtonRef
}: NavbarProps) {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div 
      className="sticky top-0 z-50"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        boxShadow: '0 2px 20px rgba(16, 185, 129, 0.15)',
      }}
    >
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            {showBackButton && onBack && !isAuthenticated && (
              <Button
                onClick={onBack}
                variant="ghost"
                className="text-emerald-400 hover:text-slate-50 hover:bg-emerald-500/10 p-2 sm:p-3"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-emerald-400" />
              <h1 className="text-lg sm:text-xl md:text-2xl font-mono text-slate-50">SecureBeacon</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {!isAuthenticated && (
              <>
                {showGuestMode && (
                  <Badge variant="outline" className="border-emerald-500 text-emerald-400 text-xs px-2 py-1">
                    Guest Mode
                  </Badge>
                )}
                {onAuth && (
                  <Button
                    onClick={onAuth}
                    variant="outline"
                    className="border-emerald-500 text-emerald-400 hover:text-white p-2 sm:p-3"
                    style={{
                      backgroundColor: 'rgba(10, 13, 10, 0.5)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      boxShadow: '0 2px 20px rgba(16, 185, 129, 0.15)',
                      border: '1px solid #093d0f',
                    }}
                  >
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Login / Sign Up</span>
                    <span className="sm:hidden">Login</span>
                  </Button>
                )}
              </>
            )}
            {isAuthenticated && (
              <>
                {showHistory && onHistoryClick && (
                  <>
                    <Button
                      ref={historyButtonRef}
                      onClick={onHistoryClick}
                      variant="outline"
                      className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 hidden sm:flex"
                    >
                      <History className="w-4 h-4 mr-2" />
                      History
                    </Button>
                    <Button
                      onClick={onHistoryClick}
                      variant="outline"
                      className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 p-2 sm:hidden"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 p-2 sm:p-3"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline font-mono text-sm ml-2">
                      {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 sm:w-64">
                  <DropdownMenuLabel className="font-mono break-words">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-400 text-xs">Logged in as</span>
                      <span className="text-slate-200 break-words text-sm">{user?.email || 'User Account'}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      logout();
                    }}
                    className="cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

