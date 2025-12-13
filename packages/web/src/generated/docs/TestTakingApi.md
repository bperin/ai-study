# TestTakingApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**testTakingControllerCompleteTest**](TestTakingApi.md#testtakingcontrollercompletetest) | **POST** /tests/taking/{attemptId}/complete | Complete the test |
| [**testTakingControllerGetSession**](TestTakingApi.md#testtakingcontrollergetsession) | **GET** /tests/taking/{attemptId} | Get current test session state |
| [**testTakingControllerRecordAnswer**](TestTakingApi.md#testtakingcontrollerrecordanswer) | **POST** /tests/taking/{attemptId}/answer | Record an answer |
| [**testTakingControllerStartSession**](TestTakingApi.md#testtakingcontrollerstartsession) | **POST** /tests/taking/start/{pdfId} | Start or resume a test session |



## testTakingControllerCompleteTest

> testTakingControllerCompleteTest(attemptId)

Complete the test

### Example

```ts
import {
  Configuration,
  TestTakingApi,
} from '';
import type { TestTakingControllerCompleteTestRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestTakingApi(config);

  const body = {
    // string
    attemptId: attemptId_example,
  } satisfies TestTakingControllerCompleteTestRequest;

  try {
    const data = await api.testTakingControllerCompleteTest(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **attemptId** | `string` |  | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Test completed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## testTakingControllerGetSession

> TestSessionStateDto testTakingControllerGetSession(attemptId)

Get current test session state

### Example

```ts
import {
  Configuration,
  TestTakingApi,
} from '';
import type { TestTakingControllerGetSessionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestTakingApi(config);

  const body = {
    // string
    attemptId: attemptId_example,
  } satisfies TestTakingControllerGetSessionRequest;

  try {
    const data = await api.testTakingControllerGetSession(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **attemptId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**TestSessionStateDto**](TestSessionStateDto.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## testTakingControllerRecordAnswer

> RecordAnswerResponseDto testTakingControllerRecordAnswer(attemptId, recordAnswerDto)

Record an answer

### Example

```ts
import {
  Configuration,
  TestTakingApi,
} from '';
import type { TestTakingControllerRecordAnswerRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestTakingApi(config);

  const body = {
    // string
    attemptId: attemptId_example,
    // RecordAnswerDto
    recordAnswerDto: ...,
  } satisfies TestTakingControllerRecordAnswerRequest;

  try {
    const data = await api.testTakingControllerRecordAnswer(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **attemptId** | `string` |  | [Defaults to `undefined`] |
| **recordAnswerDto** | [RecordAnswerDto](RecordAnswerDto.md) |  | |

### Return type

[**RecordAnswerResponseDto**](RecordAnswerResponseDto.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## testTakingControllerStartSession

> TestSessionStateDto testTakingControllerStartSession(pdfId)

Start or resume a test session

### Example

```ts
import {
  Configuration,
  TestTakingApi,
} from '';
import type { TestTakingControllerStartSessionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestTakingApi(config);

  const body = {
    // string
    pdfId: pdfId_example,
  } satisfies TestTakingControllerStartSessionRequest;

  try {
    const data = await api.testTakingControllerStartSession(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **pdfId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**TestSessionStateDto**](TestSessionStateDto.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

