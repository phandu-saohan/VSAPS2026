import { ToastType } from '../contexts/ToastContext';
import { NotificationKind } from '../types';

export const toastTypeFromKind = (kind?: NotificationKind): ToastType => {
  switch (kind) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'info':
    case 'task':
    case 'finance':
    case 'system':
    default:
      return 'info';
  }
};

export const toastMessage = (title: string | null | undefined, message: string) => {
  if (!title || title === message) return message;
  return `${title}: ${message}`;
};
