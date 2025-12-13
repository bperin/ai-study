
# TestResultAnswerDto


## Properties

Name | Type
------------ | -------------
`questionId` | string
`questionText` | string
`selectedAnswer` | string
`correctAnswer` | string
`isCorrect` | boolean

## Example

```typescript
import type { TestResultAnswerDto } from ''

// TODO: Update the object below with actual values
const example = {
  "questionId": null,
  "questionText": null,
  "selectedAnswer": null,
  "correctAnswer": null,
  "isCorrect": null,
} satisfies TestResultAnswerDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TestResultAnswerDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


