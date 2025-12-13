"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { authApi } from "../../api-client";

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
                <h1 className="text-6xl font-bold">
                    Login to <span className="text-blue-600">AI Study</span>
                </h1>

                <form onSubmit={handleSubmit} className="mt-8 flex w-full max-w-md flex-col space-y-4">
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded border p-2" required />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded border p-2" required />
                    <button type="submit" className="rounded bg-blue-600 p-2 text-white hover:bg-blue-700">
                        Sign In
                    </button>
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
