// Public route group shell. Header/footer navigation, theme provider,
// and the design system wrapper are implemented in Phase G (Homepage).
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
