import type { Metadata } from 'next';
import { AdminApp } from '@/features/admin/AdminApp';
import '@/features/admin/admin.css';

export const metadata: Metadata = {
  title: 'Админка SYP',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
