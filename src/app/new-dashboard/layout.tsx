import { Providers } from "@/lib/providers";

export default function DashboardV4Layout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
