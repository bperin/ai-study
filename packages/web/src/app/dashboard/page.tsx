"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPdfsApi } from "@/api-client";
import { PdfResponseDto } from "@/generated";

type PdfObjective = {
    title?: string;
    _count?: {
        mcqs?: number;
    };
};

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
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-6">
                <h1 className="text-2xl font-bold">Memorang</h1>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-sm font-medium">Alex Learner</p>
                        <p className="text-xs text-muted-foreground">alex@example.com</p>
                    </div>
                    <Avatar>
                        <AvatarImage src="/avatars/01.png" alt="@user" />
                        <AvatarFallback>AL</AvatarFallback>
                    </Avatar>
                </div>
            </header>
            <div className="flex flex-1">
                <aside className="flex w-64 flex-col border-r border-border bg-card/30 backdrop-blur-sm p-6">
                    <nav className="space-y-1">
                        <Button variant="secondary" className="w-full justify-start">
                            Dashboard
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => router.push("/upload")}>
                            Uploads
                        </Button>
                        <div className="pt-4 pb-2">
                            <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Your Tests
                            </h3>
                            {pdfs.map((pdf) => (
                                <Button
                                    key={pdf.id}
                                    variant="ghost"
                                    className="w-full justify-start truncate text-left text-muted-foreground hover:text-foreground"
                                    onClick={() => router.push(`/study/${pdf.id}`)}
                                >
                                    <span className="truncate">{pdf.filename}</span>
                                </Button>
                            ))}
                        </div>
                    </nav>
                    <div className="mt-auto pt-6">
                        <Button variant="outline" className="w-full" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                </aside>
                <main className="flex-1 space-y-4 p-8 pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Dashboard</p>
                            <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
                        </div>
                        <Button onClick={() => router.push("/upload")}>Upload New PDF</Button>
                    </div>
                    <Tabs defaultValue="tests" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="tests">Available Tests</TabsTrigger>
                            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>
                        <TabsContent value="tests" className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {pdfs.map((pdf) => {
                                    const objectives = (pdf.objectives as PdfObjective[]) || [];
                                    const questionCount = objectives.reduce((sum, obj) => sum + (obj._count?.mcqs || 0), 0);
                                    return (
                                        <Card key={pdf.id} className="flex flex-col h-full hover:bg-muted/50 transition-all duration-200">
                                            <CardHeader>
                                                <CardTitle className="line-clamp-1" title={pdf.filename}>{pdf.filename}</CardTitle>
                                                <CardDescription>Generated {new Date(pdf.createdAt).toLocaleDateString()}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-1">
                                                <p className="mb-2 text-sm font-medium">{questionCount} Questions</p>
                                                <div className="space-y-1">
                                                    {objectives.slice(0, 2).map((obj, i) => (
                                                        <p key={i} className="text-sm text-muted-foreground line-clamp-1">
                                                            • {obj.title || "Objective"}
                                                        </p>
                                                    ))}
                                                    {objectives.length > 2 && (
                                                        <p className="text-xs text-muted-foreground">+{objectives.length - 2} more objectives</p>
                                                    )}
                                                </div>
                                            </CardContent>
                                            <CardFooter className="mt-auto">
                                                <Button className="w-full" onClick={() => router.push(`/study/${pdf.id}`)}>
                                                    Start Test
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    );
                                })}
                                {pdfs.length === 0 && (
                                    <div className="col-span-full text-center py-10">
                                        <p className="text-muted-foreground">No tests available. Upload a PDF to generate one.</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="leaderboard" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Global Rankings</CardTitle>
                                    <CardDescription>See how you compare to other learners</CardDescription>
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
                                                className={`flex items-center justify-between p-4 rounded-lg ${user.isYou ? "bg-secondary border border-primary/20" : "bg-muted/30"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="text-2xl font-bold text-muted-foreground w-8">
                                                        {user.badge || `#${user.rank}`}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">
                                                            {user.name} {user.isYou && <span className="text-xs text-primary">(You)</span>}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{user.tests} tests completed</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold">{user.score}%</p>
                                                    <p className="text-xs text-muted-foreground">avg score</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="history" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Activity</CardTitle>
                                    <CardDescription>Your past test results.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">No attempts yet.</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    );
}
