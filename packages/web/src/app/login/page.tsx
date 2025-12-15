"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { authApi } from "../../api-client";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const data = await authApi.authControllerSignIn({
                loginDto: { email, password },
            });

            localStorage.setItem("access_token", data.accessToken);
            toast.success("Login successful");
            router.push("/");
        } catch (err) {
            toast.error("Login failed. Please check your credentials.");
            setError("Login failed. Please check your credentials.");
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-2">
            <main className="flex w-full flex-1 flex-col items-center justify-center px-20 text-center">
                <div className="mb-8">
                    <Logo size="lg" />
                </div>
                <h2 className="text-2xl font-semibold mb-6">Welcome back</h2>

                <form onSubmit={handleSubmit} className="mt-8 flex w-full max-w-md flex-col space-y-4">
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded border p-2" required />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded border p-2" required />
                    <Button type="submit" variant="default" className="w-full">
                        Sign In
                    </Button>
                    {error && <p className="text-red-500">{error}</p>}
                </form>

                <p className="mt-4">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-blue-600 hover:underline">
                        Register
                    </Link>
                </p>
            </main>
        </div>
    );
}
