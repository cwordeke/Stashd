import { redirectAuthenticatedFromAuthEntry } from "@/lib/auth-guards";

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectAuthenticatedFromAuthEntry();
  return children;
}
