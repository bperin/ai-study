"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPdfsApi, getUsersApi, getTestsApi } from "@/api-client";
import { PdfResponseDto, TestHistoryItemDto, UserResponseDto } from "@/generated";
import { Info, Trash2 } from "lucide-react";

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
    const [page, setPage] = useState(1);
    const [history, setHistory] = useState<TestHistoryItemDto[]>([]);
    const [user, setUser] = useState<UserResponseDto | null>(null);
    const [pdfToDelete, setPdfToDelete] = useState<string | null>(null);

    const handleLogout = useCallback(() => {
        localStorage.removeItem("access_token");
        router.push("/login");
    }, [router]);

    const handleDeletePdf = async () => {
        if (!pdfToDelete) return;
        try {
            const api = getPdfsApi();
            await api.pdfsControllerDeletePdf({ id: pdfToDelete });
            setPdfs(pdfs.filter((p) => p.id !== pdfToDelete));
            setPdfToDelete(null);
        } catch (error) {
            console.error("Failed to delete PDF:", error);
            alert("Failed to delete PDF");
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            router.push("/login");
        } else {
            const usersApi = getUsersApi();
            const testsApi = getTestsApi();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

            Promise.all([
                fetch(`${baseUrl}/pdfs?page=${page}&limit=8`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                    .then((res) => res.json())
                    .then(setPdfs),
                usersApi.usersControllerGetMe().then((u) => setUser(u)),
                testsApi.testsControllerGetTestHistory().then((res) => setHistory(res.attempts)),
            ])
                .catch((err) => {
                    console.error("Failed to fetch data", err);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [router, page]);

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-6">
                <h1 className="text-2xl font-bold">AI Study</h1>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                            <p className="text-sm font-medium">{user?.email?.split("@")[0]}</p>
                            {user?.isAdmin && <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">Admin</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">{user?.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
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
                            <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Tests</h3>
                            {pdfs.map((pdf) => (
                                <Button key={pdf.id} variant="ghost" className="w-full justify-start truncate text-left text-muted-foreground hover:text-foreground" onClick={() => router.push(`/study/${pdf.id}`)}>
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
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>
                        <TabsContent value="tests" className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {pdfs.map((pdf) => {
                                    const objectives = (pdf.objectives as PdfObjective[]) || [];
                                    const questionCount = objectives.reduce((sum, obj) => sum + (obj._count?.mcqs || 0), 0);
                                    return (
                                        <Card key={pdf.id} className="flex flex-col h-full hover:bg-muted/50 transition-all duration-200 relative group">
                                            <CardHeader>
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex-1 overflow-hidden">
                                                        <CardTitle className="line-clamp-1" title={pdf.filename}>
                                                            {pdf.filename}
                                                        </CardTitle>
                                                        <CardDescription>Generated {new Date(pdf.createdAt).toLocaleDateString()}</CardDescription>
                                                    </div>
                                                    {user?.isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPdfToDelete(pdf.id);
                                                            }}
                                                        >
                                                            <Info className="h-4 w-4" />
                                                            <span className="sr-only">Delete</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-1">
                                                <p className="mb-2 text-sm font-medium">{questionCount} Questions</p>
                                                <div className="space-y-1">
                                                    {objectives.slice(0, 2).map((obj, i) => (
                                                        <p key={i} className="text-sm text-muted-foreground line-clamp-1">
                                                            • {obj.title || "Objective"}
                                                        </p>
                                                    ))}
                                                    {objectives.length > 2 && <p className="text-xs text-muted-foreground">+{objectives.length - 2} more objectives</p>}
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
                            <div className="flex justify-center gap-2 mt-4">
                                <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                                    Previous
                                </Button>
                                <Button variant="outline" disabled={pdfs.length < 8} onClick={() => setPage((p) => p + 1)}>
                                    Next
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="history" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Activity</CardTitle>
                                    <CardDescription>Your past test results.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {history.length === 0 ? (
                                        <p className="text-muted-foreground">No attempts yet.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {history.map((attempt) => (
                                                <div key={attempt.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors" onClick={() => router.push(`/history/${attempt.id}`)}>
                                                    <div>
                                                        <p className="font-medium">{attempt.pdfTitle}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {new Date(attempt.completedAt).toLocaleDateString()} at {new Date(attempt.completedAt).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="font-bold text-lg">{Math.round(attempt.percentage)}%</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {attempt.score}/{attempt.total}
                                                            </p>
                                                        </div>
                                                        <div className="text-muted-foreground">→</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>

            <Dialog open={!!pdfToDelete} onOpenChange={(open) => !open && setPdfToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Test</DialogTitle>
                        <DialogDescription>Are you sure you want to delete this test? This action cannot be undone and will remove all associated data including questions and history.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPdfToDelete(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeletePdf}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
