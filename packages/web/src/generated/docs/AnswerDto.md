# AnswerDto

## Properties

| Name          | Type   |
| ------------- | ------ |
| `mcqId`       | string |
| `selectedIdx` | number |

## Example

```typescript
import type { AnswerDto } from "";

// TODO: Update the object below with actual values
const example = {
    mcqId: null,
    selectedIdx: null,
} satisfies AnswerDto;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AnswerDto;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
