import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

const AppLayout = ({ children, title }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-64">
        <Header title={title} />
        <main className="p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
