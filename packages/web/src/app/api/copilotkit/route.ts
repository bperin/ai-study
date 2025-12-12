import { CopilotRuntime, OpenAIAdapter } from "@copilotkit/runtime";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const copilotKit = new CopilotRuntime();

    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    if (!apiKey) {
        return new Response("API key not configured", { status: 500 });
    }

    // Use Gemini via OpenAI-compatible endpoint
    const serviceAdapter = new OpenAIAdapter({
        model: "gemini-2.0-flash-exp",
        apiKey,
    });

    return copilotKit.response(req, serviceAdapter);
}
