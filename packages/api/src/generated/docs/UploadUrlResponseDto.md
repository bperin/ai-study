
# UploadUrlResponseDto


## Properties

Name | Type
------------ | -------------
`uploadUrl` | string
`filePath` | string
`expiresAt` | string
`maxSizeBytes` | number

## Example

```typescript
import type { UploadUrlResponseDto } from ''

// TODO: Update the object below with actual values
const example = {
  "uploadUrl": https://storage.googleapis.com/bucket/path?signature=...,
  "filePath": uploads/user-id/file-id-filename.pdf,
  "expiresAt": 2025-12-12T05:54:23.322Z,
  "maxSizeBytes": 10485760,
} satisfies UploadUrlResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UploadUrlResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


