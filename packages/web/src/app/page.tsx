"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (token) {
            router.push("/dashboard");
        }
    }, [router]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="mb-12">
                <Logo size="xl" />
            </div>
            <div className="flex gap-4">
                <Link href="/login" className="rounded bg-red-600 px-6 py-3 text-white hover:bg-red-700">
                    Login
                </Link>
                <Link href="/register" className="rounded border border-red-600 px-6 py-3 text-red-600 hover:bg-red-50">
                    Register
                </Link>
            </div>
        </main>
    );
}
