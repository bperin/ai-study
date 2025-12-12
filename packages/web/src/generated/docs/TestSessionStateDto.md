
# TestSessionStateDto


## Properties

Name | Type
------------ | -------------
`attemptId` | string
`userId` | string
`currentQuestionIndex` | number
`totalQuestions` | number
`answers` | [Array&lt;TestSessionAnswerDto&gt;](TestSessionAnswerDto.md)
`correctCount` | number
`incorrectCount` | number
`currentStreak` | number
`longestStreak` | number
`startTime` | Date
`totalTimeSpent` | number

## Example

```typescript
import type { TestSessionStateDto } from ''

// TODO: Update the object below with actual values
const example = {
  "attemptId": null,
  "userId": null,
  "currentQuestionIndex": null,
  "totalQuestions": null,
  "answers": null,
  "correctCount": null,
  "incorrectCount": null,
  "currentStreak": null,
  "longestStreak": null,
  "startTime": null,
  "totalTimeSpent": null,
} satisfies TestSessionStateDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TestSessionStateDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


