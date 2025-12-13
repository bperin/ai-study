"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
            <h1 className="text-4xl font-bold mb-8">Welcome to AI Study</h1>
            <div className="flex gap-4">
                <Link href="/login" className="rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
                    Login
                </Link>
                <Link href="/register" className="rounded border border-blue-600 px-6 py-3 text-blue-600 hover:bg-blue-50">
                    Register
                </Link>
            </div>
        </main>
    );
}
