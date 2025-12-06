import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Akros Digital - Invoicing & Expenses",
  description: "Simple invoicing and expense tracking for Akros Digital Consultancy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-100">
        <AppProvider>
          <Navigation />
          <main className="md:ml-56 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen">
            <div className="p-4 md:p-6 max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
