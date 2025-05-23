import { Briefcase } from 'lucide-react';
import Link from 'next/link';

export default function AppHeader() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
          <Briefcase className="h-8 w-8" />
          <span>CareerCraft AI</span>
        </Link>
        {/* Future navigation items can go here */}
      </div>
    </header>
  );
}
