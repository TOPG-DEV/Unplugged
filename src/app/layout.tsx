import { ProvidersWrapper } from "./ProviderWrapper";
import "./globals.css";

// Using system monospace stack via Tailwind's `font-mono` class.
// Swap to `next/font/google` or `next/font/local` later if a specific
// typeface is needed. The system stack is durable and network-free.

export const metadata = {
  title: "UNPLUGGED",
  description:
    "The operator's channel. Signed calls. Smart-wallet tracking. Tools before the crowd.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-mono antialiased bg-black text-white">
        <ProvidersWrapper>{children}</ProvidersWrapper>
      </body>
    </html>
  );
}
