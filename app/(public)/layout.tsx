
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Providers } from "@/app/providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </Providers>
  );
}