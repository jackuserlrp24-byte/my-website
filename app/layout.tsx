import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen w-full bg-neutral-950 text-neutral-100 select-none antialiased">
        {children}
      </body>
    </html>
  );
}