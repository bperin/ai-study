# TestSessionAnswerDto

## Properties

| Name             | Type    |
| ---------------- | ------- |
| `questionId`     | string  |
| `questionNumber` | number  |
| `questionText`   | string  |
| `selectedAnswer` | number  |
| `correctAnswer`  | number  |
| `isCorrect`      | boolean |
| `timeSpent`      | number  |
| `hintsUsed`      | number  |

## Example

```typescript
import type { TestSessionAnswerDto } from "";

// TODO: Update the object below with actual values
const example = {
    questionId: null,
    questionNumber: null,
    questionText: null,
    selectedAnswer: null,
    correctAnswer: null,
    isCorrect: null,
    timeSpent: null,
    hintsUsed: null,
} satisfies TestSessionAnswerDto;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TestSessionAnswerDto;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
