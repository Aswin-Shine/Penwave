import { Navbar } from '@/components/layout/navbar';
import { Toaster } from '@/components/ui/toaster';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-[72px]">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
