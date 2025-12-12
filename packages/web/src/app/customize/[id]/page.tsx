'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FileText, Sparkles, ArrowRight, Loader2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function CustomizePage() {
    const router = useRouter();
    const params = useParams();
    const pdfId = params.id as string;

    const [pdfInfo, setPdfInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [prompt, setPrompt] = useState('');

    // Example prompts
    const examples = [
        "Create 15 hard questions focusing on key concepts",
        "Make 20 easy flashcards with hints and explanations",
        "Generate 10 medium difficulty questions about the main topics",
        "Create 25 challenging questions with detailed explanations",
    ];

    useEffect(() => {
        // TODO: Fetch PDF info from backend
        setPdfInfo({
            id: pdfId,
            filename: 'Study Guide.pdf',
            uploadedAt: new Date().toISOString(),
        });
        setLoading(false);
    }, [pdfId]);

    const handleGenerateTest = async () => {
        if (!prompt.trim()) {
            alert('Please describe what kind of test you want');
            return;
        }

        setGenerating(true);

        try {
            const token = localStorage.getItem('access_token');

            // Call backend API to generate flashcards with Gemini
            const response = await fetch(`http://localhost:3000/pdfs/${pdfId}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate flashcards');
            }

            await response.json();

            // Redirect to study page
            router.push(`/study/${pdfId}`);
        } catch (error: any) {
            console.error('Failed to generate test:', error);
            alert(error.message || 'Failed to generate flashcards. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-purple-950 dark:to-pink-950 p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/dashboard')}
                        className="mb-4"
                    >
                        ← Back to Dashboard
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Generate Your Flashcards</h1>
                            <p className="text-slate-600 dark:text-slate-400">
                                {pdfInfo?.filename}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <Card className="border-2 shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                            Describe Your Test
                        </CardTitle>
                        <CardDescription>
                            Tell AI what kind of flashcards you want in your own words
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Text Input */}
                        <div className="space-y-3">
                            <Label htmlFor="prompt" className="text-base font-semibold">
                                What do you want to study?
                            </Label>
                            <textarea
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., Create 20 medium difficulty questions with hints and explanations focusing on the main concepts..."
                                className="w-full min-h-[150px] p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 
                         focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900
                         resize-none text-base transition-all duration-200
                         bg-white dark:bg-slate-900"
                                disabled={generating}
                            />
                            <p className="text-sm text-slate-500">
                                Be specific about difficulty, number of questions, and any special requirements
                            </p>
                        </div>

                        {/* Example Prompts */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-yellow-600" />
                                <Label className="text-sm font-semibold">Try these examples:</Label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {examples.map((example, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setPrompt(example)}
                                        disabled={generating}
                                        className="text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700
                             hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20
                             transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        "{example}"
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Generate Button */}
                        <Button
                            onClick={handleGenerateTest}
                            disabled={!prompt.trim() || generating}
                            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 
                       hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                            size="lg"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    AI is generating your flashcards...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Generate with AI
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Info Card */}
                <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg">Powered by Gemini 2.0 Flash</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Our AI will analyze your PDF content and generate personalized flashcards based on your requirements.
                                    The more specific you are, the better the results!
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <Badge variant="secondary">Smart Question Generation</Badge>
                                    <Badge variant="secondary">Adaptive Difficulty</Badge>
                                    <Badge variant="secondary">Contextual Hints</Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
