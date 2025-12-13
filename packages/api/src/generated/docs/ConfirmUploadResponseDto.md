
# ConfirmUploadResponseDto


## Properties

Name | Type
------------ | -------------
`id` | string
`filename` | string
`userId` | string

## Example

```typescript
import type { ConfirmUploadResponseDto } from ''

// TODO: Update the object below with actual values
const example = {
  "id": 12cb4237-d74f-4cda-998d-4ef35f56...,
  "filename": study-material.pdf,
  "userId": 2778db4c-ec62-49d4-a0d1-229f6f3c15de,
} satisfies ConfirmUploadResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ConfirmUploadResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


