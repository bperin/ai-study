# WrongAnswerDto

## Properties

| Name            | Type   |
| --------------- | ------ |
| `question`      | string |
| `yourAnswer`    | string |
| `correctAnswer` | string |

## Example

```typescript
import type { WrongAnswerDto } from "";

// TODO: Update the object below with actual values
const example = {
    question: null,
    yourAnswer: null,
    correctAnswer: null,
} satisfies WrongAnswerDto;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as WrongAnswerDto;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
