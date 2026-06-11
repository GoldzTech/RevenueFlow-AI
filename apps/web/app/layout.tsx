import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RevenueFlow AI",
  description: "AI-assisted commercial workflow platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          background: "#07111f",
          color: "#e5eefc",
          overflowX: "hidden",
        }}
      >
        {children}
      </body>
    </html>
  );
}