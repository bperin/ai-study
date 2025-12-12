"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPdfsApi } from "@/api-client";
import { PdfResponseDto } from "@/generated";

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [pdfs, setPdfs] = useState<PdfResponseDto[]>([]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem("access_token");
        router.push("/login");
    }, [router]);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            router.push("/login");
        } else {
            // Fetch PDFs
            const api = getPdfsApi();
            api.pdfsControllerListPdfs()
                .then(data => {
                    setPdfs(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch PDFs", err);
                    setLoading(false);
                });
        }
    }, [router]);

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-950">
            <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm px-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Memorang</h1>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-sm font-medium text-slate-200">Alex Learner</p>
                        <p className="text-xs text-slate-400">alex@example.com</p>
                    </div>
                    <Avatar>
                        <AvatarImage src="/avatars/01.png" alt="@user" />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">AL</AvatarFallback>
                    </Avatar>
                </div>
            </header>
            <div className="flex flex-1">
                <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-900/30 backdrop-blur-sm p-6">
                    <nav className="space-y-1">
                        <Button variant="secondary" className="w-full justify-start bg-slate-800 hover:bg-slate-700 text-slate-100">
                            Dashboard
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-slate-100 hover:bg-slate-800" onClick={() => router.push("/upload")}>
                            Uploads
                        </Button>
                        <div className="pt-4 pb-2">
                            <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Your Tests
                            </h3>
                            {pdfs.map((pdf) => (
                                <Button
                                    key={pdf.id}
                                    variant="ghost"
                                    className="w-full justify-start truncate text-left text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                                    onClick={() => router.push(`/study/${pdf.id}`)}
                                >
                                    <span className="truncate">{pdf.filename}</span>
                                </Button>
                            ))}
                        </div>
                    </nav>
                    <div className="mt-auto pt-6">
                        <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                </aside>
                <main className="flex-1 space-y-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Dashboard</p>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-100">Overview</h2>
                        </div>
                        <Button onClick={() => router.push("/upload")} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">Upload New PDF</Button>
                    </div>
                    <Tabs defaultValue="tests" className="space-y-4">
                        <TabsList className="bg-slate-800/50 border border-slate-700">
                            <TabsTrigger value="tests" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">Available Tests</TabsTrigger>
                            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">Leaderboard</TabsTrigger>
                            <TabsTrigger value="history" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">History</TabsTrigger>
                        </TabsList>
                        <TabsContent value="tests" className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {pdfs.map((pdf) => {
                                    // @ts-ignore
                                    const questionCount = pdf.objectives?.reduce((sum, obj) => sum + (obj._count?.mcqs || 0), 0) || 0;
                                    return (
                                        <Card key={pdf.id} className="flex flex-col h-full bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-200">
                                            <CardHeader>
                                                <CardTitle className="line-clamp-1 text-slate-100" title={pdf.filename}>{pdf.filename}</CardTitle>
                                                <CardDescription className="text-slate-400">Generated {new Date(pdf.createdAt).toLocaleDateString()}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-1">
                                                <p className="mb-2 text-sm font-medium text-slate-300">{questionCount} Questions</p>
                                                <div className="space-y-1">
                                                    {pdf.objectives?.slice(0, 2).map((obj, i) => (
                                                        <p key={i} className="text-sm text-slate-400 line-clamp-1">
                                                            • {obj.title}
                                                        </p>
                                                    ))}
                                                    {(pdf.objectives?.length || 0) > 2 && (
                                                        <p className="text-xs text-slate-500">+{pdf.objectives.length - 2} more objectives</p>
                                                    )}
                                                </div>
                                            </CardContent>
                                            <CardFooter className="mt-auto">
                                                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" onClick={() => router.push(`/study/${pdf.id}`)}>
                                                    Start Test
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    );
                                })}
                                {pdfs.length === 0 && (
                                    <div className="col-span-full text-center py-10">
                                        <p className="text-slate-400">No tests available. Upload a PDF to generate one.</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="leaderboard" className="space-y-4">
                            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="text-slate-100">Global Rankings</CardTitle>
                                    <CardDescription className="text-slate-400">See how you compare to other learners</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {[
                                            { rank: 1, name: "Sarah Chen", score: 98, tests: 24, badge: "🥇" },
                                            { rank: 2, name: "Alex Learner", score: 95, tests: 18, badge: "🥈", isYou: true },
                                            { rank: 3, name: "Mike Johnson", score: 92, tests: 21, badge: "🥉" },
                                            { rank: 4, name: "Emily Davis", score: 89, tests: 15, badge: "" },
                                            { rank: 5, name: "Chris Park", score: 87, tests: 19, badge: "" },
                                        ].map((user) => (
                                            <div
                                                key={user.rank}
                                                className={`flex items-center justify-between p-4 rounded-lg ${user.isYou ? "bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-700/50" : "bg-slate-800/30"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="text-2xl font-bold text-slate-400 w-8">
                                                        {user.badge || `#${user.rank}`}
                                                    </div>
                                                    <div>
                                                        <p className={`font-semibold ${user.isYou ? "text-blue-300" : "text-slate-200"}`}>
                                                            {user.name} {user.isYou && <span className="text-xs text-blue-400">(You)</span>}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{user.tests} tests completed</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-slate-100">{user.score}%</p>
                                                    <p className="text-xs text-slate-500">avg score</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="history" className="space-y-4">
                            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="text-slate-100">Recent Activity</CardTitle>
                                    <CardDescription className="text-slate-400">Your past test results.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-400">No attempts yet.</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    );
}
