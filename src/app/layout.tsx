import { ProvidersWrapper } from "./ProviderWrapper";
import "./globals.css";

// Archivo font loaded via @import in globals.css from fontshare CDN.
// Applied through --font-sans Tailwind theme token.

export const metadata = {
  title: "UNPLUGGED // OPERATOR",
  description:
    "The operator's terminal. On-chain tools. Signed calls. No sockpuppets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-black text-white">
        <ProvidersWrapper>{children}</ProvidersWrapper>
      </body>
    </html>
  );
}
