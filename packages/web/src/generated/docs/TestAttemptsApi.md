# TestAttemptsApi

All URIs are relative to _http://localhost_

| Method                                                                                            | HTTP request                           | Description                            |
| ------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------- |
| [**testAttemptsControllerStartAttempt**](TestAttemptsApi.md#testattemptscontrollerstartattempt)   | **POST** /tests/attempts/{pdfId}/start | Start a new test attempt               |
| [**testAttemptsControllerSubmitAttempt**](TestAttemptsApi.md#testattemptscontrollersubmitattempt) | **POST** /tests/attempts/submit        | Submit a test attempt and get analysis |

## testAttemptsControllerStartAttempt

> StartAttemptResponseDto testAttemptsControllerStartAttempt(pdfId)

Start a new test attempt

### Example

```ts
import { Configuration, TestAttemptsApi } from "";
import type { TestAttemptsControllerStartAttemptRequest } from "";

async function example() {
    console.log("🚀 Testing  SDK...");
    const config = new Configuration({
        // Configure HTTP bearer authorization: bearer
        accessToken: "YOUR BEARER TOKEN",
    });
    const api = new TestAttemptsApi(config);

    const body = {
        // string
        pdfId: pdfId_example,
    } satisfies TestAttemptsControllerStartAttemptRequest;

    try {
        const data = await api.testAttemptsControllerStartAttempt(body);
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name      | Type     | Description | Notes                     |
| --------- | -------- | ----------- | ------------------------- |
| **pdfId** | `string` |             | [Defaults to `undefined`] |

### Return type

[**StartAttemptResponseDto**](StartAttemptResponseDto.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **201**     |             | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## testAttemptsControllerSubmitAttempt

> TestAnalysisResponseDto testAttemptsControllerSubmitAttempt(submitTestResultsDto)

Submit a test attempt and get analysis

### Example

```ts
import {
  Configuration,
  TestAttemptsApi,
} from '';
import type { TestAttemptsControllerSubmitAttemptRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestAttemptsApi(config);

  const body = {
    // SubmitTestResultsDto
    submitTestResultsDto: ...,
  } satisfies TestAttemptsControllerSubmitAttemptRequest;

  try {
    const data = await api.testAttemptsControllerSubmitAttempt(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name                     | Type                                            | Description | Notes |
| ------------------------ | ----------------------------------------------- | ----------- | ----- |
| **submitTestResultsDto** | [SubmitTestResultsDto](SubmitTestResultsDto.md) |             |       |

### Return type

[**TestAnalysisResponseDto**](TestAnalysisResponseDto.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **200**     |             | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
