
# SubmitTestResultsDto


## Properties

Name | Type
------------ | -------------
`attemptId` | string
`score` | number
`totalQuestions` | number
`missedQuestions` | [Array&lt;MissedQuestionDto&gt;](MissedQuestionDto.md)
`allAnswers` | [Array&lt;TestResultAnswerDto&gt;](TestResultAnswerDto.md)

## Example

```typescript
import type { SubmitTestResultsDto } from ''

// TODO: Update the object below with actual values
const example = {
  "attemptId": null,
  "score": null,
  "totalQuestions": null,
  "missedQuestions": null,
  "allAnswers": null,
} satisfies SubmitTestResultsDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SubmitTestResultsDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


