
# TestHistoryItemDto


## Properties

Name | Type
------------ | -------------
`id` | string
`pdfId` | string
`pdfTitle` | string
`score` | number
`total` | number
`percentage` | number
`completedAt` | Date
`report` | string
`answers` | [Array&lt;TestResultAnswerDto&gt;](TestResultAnswerDto.md)

## Example

```typescript
import type { TestHistoryItemDto } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "pdfId": null,
  "pdfTitle": null,
  "score": null,
  "total": null,
  "percentage": null,
  "completedAt": null,
  "report": null,
  "answers": null,
} satisfies TestHistoryItemDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TestHistoryItemDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


