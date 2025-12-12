describe('Application Smoke Tests', () => {
    it('should pass basic sanity check', () => {
        expect(true).toBe(true);
    });

    it('should have environment configured', () => {
        expect(process.env.NODE_ENV).toBeDefined();
    });

    describe('Core Modules', () => {
        it('should import PrismaService', async () => {
            const { PrismaService } = await import('../src/prisma/prisma.service');
            expect(PrismaService).toBeDefined();
        });

        it('should import PdfsService', async () => {
            const { PdfsService } = await import('../src/pdfs/pdfs.service');
            expect(PdfsService).toBeDefined();
        });

        it('should import AuthService', async () => {
            const { AuthService } = await import('../src/auth/auth.service');
            expect(AuthService).toBeDefined();
        });
    });

    describe('DTOs', () => {
        it('should have valid SubmitTestResultsDto', async () => {
            const { SubmitTestResultsDto } = await import('../src/pdfs/dto/submit-test-results.dto');
            expect(SubmitTestResultsDto).toBeDefined();
        });

        it('should have valid ChatMessageDto', async () => {
            const { ChatMessageDto } = await import('../src/pdfs/dto/chat-message.dto');
            expect(ChatMessageDto).toBeDefined();
        });
    });

    describe('Prompts', () => {
        it('should have test plan chat prompt', async () => {
            const { TEST_PLAN_CHAT_PROMPT } = await import('../src/pdfs/prompts');
            expect(TEST_PLAN_CHAT_PROMPT).toBeDefined();
            expect(typeof TEST_PLAN_CHAT_PROMPT).toBe('function');

            const prompt = TEST_PLAN_CHAT_PROMPT('test.pdf');
            expect(prompt).toContain('test.pdf');
        });

        it('should have flashcard generation prompt builder', async () => {
            const { FLASHCARD_GENERATION_PROMPT } = await import('../src/pdfs/prompts');
            expect(FLASHCARD_GENERATION_PROMPT).toBeDefined();
            expect(typeof FLASHCARD_GENERATION_PROMPT).toBe('function');

            const prompt = FLASHCARD_GENERATION_PROMPT('custom request', 'pdf content sample');
            expect(prompt).toContain('custom request');
            expect(prompt).toContain('pdf content sample');
        });
    });
});
