import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Bell, LogOut, GraduationCap, Target, Clock, Calendar, FileText, Award, ChevronDown } from 'lucide-react';
import logoImage from '@/assets/logo.jpg';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-notifications', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      return count || 0;
    },
    enabled: !!user,
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b bg-card shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-card/95">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logoImage} alt="Progressia Logo" className="h-10 w-10 object-contain rounded-lg" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Progressia
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button
                variant={isActive('/dashboard') ? 'default' : 'ghost'}
                className="gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>

            <Link to="/courses">
              <Button
                variant={isActive('/courses') ? 'default' : 'ghost'}
                className="gap-2"
              >
                <GraduationCap className="h-4 w-4" />
                Kursus
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  Fitur
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/goals" className="cursor-pointer">
                    <Target className="h-4 w-4 mr-2" />
                    Target & To-Do
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/timer" className="cursor-pointer">
                    <Clock className="h-4 w-4 mr-2" />
                    Timer Belajar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/records" className="cursor-pointer">
                    <Calendar className="h-4 w-4 mr-2" />
                    Catatan & Kalender
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/materials" className="cursor-pointer">
                    <FileText className="h-4 w-4 mr-2" />
                    Materi
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/rewards" className="cursor-pointer">
                    <Award className="h-4 w-4 mr-2" />
                    Penghargaan
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isAdmin && (
              <Link to="/admin/users">
                <Button
                  variant={isActive('/admin/users') || isActive('/admin/courses') ? 'default' : 'ghost'}
                  className="gap-2"
                >
                  Admin Panel
                </Button>
              </Link>
            )}

            <Link to="/notifications" className="relative">
              <Button
                variant={isActive('/notifications') ? 'default' : 'ghost'}
                size="icon"
              >
                <Bell className="h-4 w-4" />
                {unreadCount && unreadCount > 0 ? (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-destructive">
                    {unreadCount}
                  </Badge>
                ) : null}
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};