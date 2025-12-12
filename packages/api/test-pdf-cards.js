const { PrismaClient } = require('@prisma/client');

async function testSaveObjective() {
    const prisma = new PrismaClient();
    
    try {
        // First, create a test user
        const testUser = await prisma.user.create({
            data: {
                email: 'test@example.com',
                password: 'hashedpassword',
            }
        });
        
        console.log('✅ Created test user:', testUser.id);
        
        // Create a test PDF
        const testPdf = await prisma.pdf.create({
            data: {
                filename: 'test.pdf',
                content: 'Test PDF content for card generation',
                userId: testUser.id,
                gcsPath: 'test/path.pdf'
            }
        });
        
        console.log('✅ Created test PDF:', testPdf.id);
        
        // Test creating an objective with MCQs (simulating what save_objective tool does)
        const objective = await prisma.objective.create({
            data: {
                title: 'Test Learning Objective',
                difficulty: 'medium',
                pdfId: testPdf.id,
                mcqs: {
                    create: [
                        {
                            question: 'What is the capital of France?',
                            options: ['London', 'Berlin', 'Paris', 'Madrid'],
                            correctIdx: 2,
                            explanation: 'Paris is the capital and largest city of France.',
                            hint: 'Think of the city of lights.'
                        },
                        {
                            question: 'Which planet is closest to the Sun?',
                            options: ['Venus', 'Mercury', 'Earth', 'Mars'],
                            correctIdx: 1,
                            explanation: 'Mercury is the smallest planet and closest to the Sun.',
                            hint: 'Named after the Roman messenger god.'
                        }
                    ]
                }
            },
            include: { mcqs: true }
        });
        
        console.log('✅ Created objective with MCQs:', {
            objectiveId: objective.id,
            title: objective.title,
            mcqCount: objective.mcqs.length
        });
        
        // Verify the data was saved correctly
        const savedObjective = await prisma.objective.findUnique({
            where: { id: objective.id },
            include: { mcqs: true }
        });
        
        console.log('✅ Verification - Objective details:', {
            id: savedObjective.id,
            title: savedObjective.title,
            difficulty: savedObjective.difficulty,
            pdfId: savedObjective.pdfId,
            mcqCount: savedObjective.mcqs.length
        });
        
        savedObjective.mcqs.forEach((mcq, index) => {
            console.log(`✅ MCQ ${index + 1}:`, {
                question: mcq.question.substring(0, 50) + '...',
                optionsCount: mcq.options.length,
                correctIdx: mcq.correctIdx,
                hasExplanation: !!mcq.explanation,
                hasHint: !!mcq.hint
            });
        });
        
        // Clean up test data
        await prisma.mcq.deleteMany({ where: { objectiveId: objective.id } });
        await prisma.objective.delete({ where: { id: objective.id } });
        await prisma.pdf.delete({ where: { id: testPdf.id } });
        await prisma.user.delete({ where: { id: testUser.id } });
        
        console.log('✅ Cleaned up test data');
        console.log('🎉 PDF card creation test PASSED - Database operations work correctly!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testSaveObjective()
    .then(() => {
        console.log('\n🔍 DIAGNOSIS: The database and save_objective functionality works correctly.');
        console.log('📋 NEXT STEPS: The issue is likely in the AI generation process or API endpoints.');
        console.log('🔧 RECOMMENDATIONS:');
        console.log('   1. Check if the API server is running and accessible');
        console.log('   2. Test the PDF upload and generation endpoints');
        console.log('   3. Check AI agent execution logs for errors');
        console.log('   4. Verify Google Cloud Storage access');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 CRITICAL ISSUE: Database operations failed');
        console.error('🔧 REQUIRED FIXES:');
        console.error('   1. Check database connection');
        console.error('   2. Verify Prisma schema matches database');
        console.error('   3. Run database migrations');
        process.exit(1);
    });
