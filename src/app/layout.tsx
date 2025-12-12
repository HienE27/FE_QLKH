import type { Metadata } from "next";
import "./globals.css";
import "@/styles/animations.css";
import AlertInterceptor from "@/components/AlertInterceptor";

export const metadata: Metadata = {
  title: "Hệ thống quản lý kho hàng",
  description: "Warehouse Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AlertInterceptor />
        {children}
      </body>
    </html>
  );
}
