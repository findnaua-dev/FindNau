import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface Props {
  header?: ReactNode;   // sticky header (greeting, search, quick actions)
  children: ReactNode;  // scrollable body
  hideNav?: boolean;
}

export default function UserScreenLayout({ header, children, hideNav = false }: Props) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* STICKY HEADER – walang padding, control ng header mismo */}
      {header && (
        <div className="sticky top-0 z-10 bg-gray-50">
          {header}
        </div>
      )}

      {/* SCROLLABLE BODY – may space para sa bottom nav */}
      <div className="flex-1 overflow-y-auto pb-[70px] md:pb-0">
        {children}
      </div>

      {/* BOTTOM NAV – fixed */}
      {!hideNav && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          <BottomNav />
        </div>
      )}
    </div>
  );
}