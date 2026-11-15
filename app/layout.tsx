import './globals.css';
import { SiteGate } from './components/MaintenanceGates';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen w-full bg-neutral-950 text-neutral-100 select-none antialiased">
        <SiteGate>{children}</SiteGate>
      </body>
    </html>
  );
}