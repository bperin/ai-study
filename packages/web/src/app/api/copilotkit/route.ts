import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import OpenAI from "openai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const copilotKit = new CopilotRuntime();

    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    if (!apiKey) {
        return new Response("API key not configured", { status: 500 });
    }

    // Use Gemini via OpenAI-compatible endpoint
    const openai = new OpenAI({
        apiKey,
        baseURL: process.env.GOOGLE_OPENAI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai",
    });

    const serviceAdapter = new OpenAIAdapter({
        model: "gemini-2.5-flash",
        openai,
    });

    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
        runtime: copilotKit,
        serviceAdapter,
        endpoint: "/api/copilotkit",
    });

    return handleRequest(req);
}
