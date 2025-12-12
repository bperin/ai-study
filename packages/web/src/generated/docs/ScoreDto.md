# ScoreDto

## Properties

| Name         | Type   |
| ------------ | ------ |
| `correct`    | number |
| `total`      | number |
| `percentage` | number |

## Example

```typescript
import type { ScoreDto } from "";

// TODO: Update the object below with actual values
const example = {
    correct: null,
    total: null,
    percentage: null,
} satisfies ScoreDto;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ScoreDto;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
