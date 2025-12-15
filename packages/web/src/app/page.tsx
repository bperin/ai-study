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
                <Link href="/login" className="rounded bg-white px-6 py-3 text-gray-900 shadow hover:bg-gray-100">
                    Login
                </Link>
                <Link href="/register" className="rounded border border-white px-6 py-3 text-white hover:bg-white hover:text-gray-900">
                    Register
                </Link>
            </div>
        </main>
    );
}
