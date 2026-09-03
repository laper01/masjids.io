import { AdminTheme } from "@/app/(admin)/_components/AdminTheme";
import { Providers } from "@/app/providers";
import { MosqueProviderWrapper } from "@/components/MosqueProviderWrapper";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      {/* MosqueProviderWrapper must be inside Providers so useSession() works */}
      <MosqueProviderWrapper>
        <AdminTheme>{children}</AdminTheme>
      </MosqueProviderWrapper>
    </Providers>
  );
}