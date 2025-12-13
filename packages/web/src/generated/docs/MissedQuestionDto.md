# MissedQuestionDto

## Properties

| Name             | Type   |
| ---------------- | ------ |
| `questionId`     | string |
| `questionText`   | string |
| `selectedAnswer` | string |
| `correctAnswer`  | string |

## Example

```typescript
import type { MissedQuestionDto } from "";

// TODO: Update the object below with actual values
const example = {
    questionId: null,
    questionText: null,
    selectedAnswer: null,
    correctAnswer: null,
} satisfies MissedQuestionDto;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MissedQuestionDto;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
