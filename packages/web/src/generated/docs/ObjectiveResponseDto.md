# ObjectiveResponseDto

## Properties

| Name         | Type                             |
| ------------ | -------------------------------- |
| `id`         | string                           |
| `title`      | string                           |
| `difficulty` | string                           |
| `mcqs`       | [Array&lt;McqDto&gt;](McqDto.md) |

## Example

```typescript
import type { ObjectiveResponseDto } from "";

// TODO: Update the object below with actual values
const example = {
    id: null,
    title: null,
    difficulty: null,
    mcqs: null,
} satisfies ObjectiveResponseDto;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ObjectiveResponseDto;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
