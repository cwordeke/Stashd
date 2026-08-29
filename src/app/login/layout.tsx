import LoginAuthenticatedRedirect from "@/components/LoginAuthenticatedRedirect";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LoginAuthenticatedRedirect />
      {children}
    </>
  );
}
