import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import GlobalGenerationStatus from "@/components/GlobalGenerationStatus";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Dash AI",
    description: "Dash AI - AI-powered study assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                <GlobalGenerationStatus />
                {children}
                <Toaster />
            </body>
        </html>
    );
}
