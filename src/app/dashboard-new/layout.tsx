import { Providers } from "@/lib/providers";

export default function DashboardNewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
