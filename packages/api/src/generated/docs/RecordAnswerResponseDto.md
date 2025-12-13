# RecordAnswerResponseDto

## Properties

| Name            | Type    |
| --------------- | ------- |
| `isCorrect`     | boolean |
| `currentScore`  | string  |
| `currentStreak` | number  |
| `progress`      | string  |
| `encouragement` | string  |
| `explanation`   | string  |

## Example

```typescript
import type { RecordAnswerResponseDto } from "";

// TODO: Update the object below with actual values
const example = {
    isCorrect: null,
    currentScore: null,
    currentStreak: null,
    progress: null,
    encouragement: null,
    explanation: null,
} satisfies RecordAnswerResponseDto;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecordAnswerResponseDto;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
