// Old route. Management now lives inside the Staff Panel, so this just passes through to the redirect page.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
