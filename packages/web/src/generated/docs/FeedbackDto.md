# FeedbackDto

## Properties

| Name                     | Type                                                     |
| ------------------------ | -------------------------------------------------------- |
| `strengths`              | Array&lt;string&gt;                                      |
| `weaknesses`             | Array&lt;string&gt;                                      |
| `byObjective`            | [Array&lt;ObjectiveResultDto&gt;](ObjectiveResultDto.md) |
| `wrongAnswers`           | [Array&lt;WrongAnswerDto&gt;](WrongAnswerDto.md)         |
| `longestStreak`          | number                                                   |
| `averageTimePerQuestion` | number                                                   |
| `encouragement`          | string                                                   |

## Example

```typescript
import type { FeedbackDto } from "";

// TODO: Update the object below with actual values
const example = {
    strengths: null,
    weaknesses: null,
    byObjective: null,
    wrongAnswers: null,
    longestStreak: null,
    averageTimePerQuestion: null,
    encouragement: null,
} satisfies FeedbackDto;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as FeedbackDto;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
