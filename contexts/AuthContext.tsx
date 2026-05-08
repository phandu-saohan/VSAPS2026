import { createContext, useContext } from 'react';
import { Session } from '@supabase/supabase-js';
import { Profile, Notification } from '../types';

export interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  notifications: Notification[];
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  logout: () => void;
  markNotificationAsRead: (id: number) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'> & { user_id: string }) => Promise<void>;
  notifyAdmins: (message: string, link: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
