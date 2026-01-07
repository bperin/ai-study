import { GEMINI_MODEL } from '../constants/models';
import { FileSearchService } from '../uploads/file-search.service';
import { GenAiService } from './genai.service';
import { TEST_ASSISTANCE_CHAT_PROMPT } from './prompts';

export const runFileSearchPrompt = (
  genAiService: GenAiService,
  userPrompt: string,
  fileSearchStoreName: string,
  systemInstruction?: string,
  model?: string,
) => {
  return genAiService.runFileSearchPrompt({
    userPrompt,
    fileSearchStoreName,
    systemInstruction,
    model,
  });
};

export const runTestPlanChat = (genAiService: GenAiService, userPrompt: string, pdfFilename: string, fileSearchStoreName?: string) => {
  return genAiService.runTestPlanChat(userPrompt, pdfFilename, fileSearchStoreName);
};

export const runTestAssistance = (
  genAiService: GenAiService,
  userPrompt: string,
  question: string,
  options: string[],
  fileSearchStoreName?: string,
) => {
  return genAiService.runTestAssistance(userPrompt, question, options, fileSearchStoreName);
};

export const createTestAssistanceAgent = (
  question: string,
  options: string[],
  fileSearchService: FileSearchService,
  fileSearchStoreName?: string,
) => {
  const tools = fileSearchStoreName
    ? [
        {
          name: 'file_search',
          description: 'Search the uploaded study material for relevant context.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
            required: ['query'],
          },
          execute: async ({ query }: { query: string }) => {
            const response = await fileSearchService.answerQuestionFromFile({
              fileUri: fileSearchStoreName,
              question: query,
            });
            return { text: response.text };
          },
        },
      ]
    : [];

  return {
    name: 'test-assistance',
    model: GEMINI_MODEL,
    systemInstruction: TEST_ASSISTANCE_CHAT_PROMPT(question, options),
    tools,
  };
};
