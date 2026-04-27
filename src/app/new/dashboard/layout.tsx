import { Providers } from "@/lib/providers";

export default function NewDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
