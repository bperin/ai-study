#!/bin/bash

# Move new files to replace old ones
mv packages/api/src/domain/study-tests/tests.repository.new.ts packages/api/src/domain/study-tests/tests.repository.ts
mv packages/api/src/shared/genai/ai-study-plan.service.new.ts packages/api/src/shared/genai/ai-study-plan.service.ts
mv packages/api/src/shared/genai/tool-calling.service.new.ts packages/api/src/shared/genai/tool-calling.service.ts
mv packages/api/src/domain/study-tests/test-sessions/test-sessions.service.new.ts packages/api/src/domain/study-tests/test-sessions/test-sessions.service.ts
mv packages/api/src/domain/study-tests/test-sessions/interfaces/study-session.interface.new.ts packages/api/src/domain/study-tests/test-sessions/interfaces/study-session.interface.ts
mv packages/api/src/domain/study-tests/test-sessions/in-memory-session.store.new.ts packages/api/src/domain/study-tests/test-sessions/in-memory-session.store.ts
mv packages/api/src/domain/study-tests/test-sessions/dto/start-session.dto.new.ts packages/api/src/domain/study-tests/test-sessions/dto/start-session.dto.ts
mv packages/api/src/domain/study-tests/dto/test-session.dto.new.ts packages/api/src/domain/study-tests/dto/test-session.dto.ts

# Remove legacy DTOs
rm -f packages/api/src/domain/documents/dto/objective-response.dto.ts
rm -f packages/api/src/domain/study-tests/dto/create-objective-record.dto.ts

echo "Migration completed successfully!"
