# TestsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**testsControllerChatAssist**](TestsApi.md#testscontrollerchatassist) | **POST** /tests/chat | Chat with AI for help on a question |
| [**testsControllerGetAllTestHistory**](TestsApi.md#testscontrollergetalltesthistory) | **GET** /tests/history/all | Get all users test history |
| [**testsControllerGetAttemptDetails**](TestsApi.md#testscontrollergetattemptdetails) | **GET** /tests/attempt/{id} | Get detailed results for a specific test attempt |
| [**testsControllerGetGlobalLeaderboard**](TestsApi.md#testscontrollergetgloballeaderboard) | **GET** /tests/leaderboard |  |
| [**testsControllerGetMyRank**](TestsApi.md#testscontrollergetmyrank) | **GET** /tests/leaderboard/me |  |
| [**testsControllerGetPdfLeaderboard**](TestsApi.md#testscontrollergetpdfleaderboard) | **GET** /tests/leaderboard/pdf/{pdfId} |  |
| [**testsControllerGetTestHistory**](TestsApi.md#testscontrollergettesthistory) | **GET** /tests/history | Get user\&#39;s test history with scores and reports |
| [**testsControllerGetTestStats**](TestsApi.md#testscontrollergetteststats) | **GET** /tests/stats/{pdfId} | Get test stats: attempt count, avg score, top scorer |
| [**testsControllerSubmitTest**](TestsApi.md#testscontrollersubmittest) | **POST** /tests/submit |  |



## testsControllerChatAssist

> testsControllerChatAssist()

Chat with AI for help on a question

### Example

```ts
import {
  Configuration,
  TestsApi,
} from '';
import type { TestsControllerChatAssistRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestsApi(config);

  try {
    const data = await api.testsControllerChatAssist();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

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
| **200** | AI assistance response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## testsControllerGetAllTestHistory

> TestHistoryResponseDto testsControllerGetAllTestHistory()

Get all users test history

### Example

```ts
import {
  Configuration,
  TestsApi,
} from '';
import type { TestsControllerGetAllTestHistoryRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestsApi(config);

  try {
    const data = await api.testsControllerGetAllTestHistory();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**TestHistoryResponseDto**](TestHistoryResponseDto.md)

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


## testsControllerGetAttemptDetails

> TestHistoryItemDto testsControllerGetAttemptDetails(id)

Get detailed results for a specific test attempt

### Example

```ts
import {
  Configuration,
  TestsApi,
} from '';
import type { TestsControllerGetAttemptDetailsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestsApi(config);

  const body = {
    // string
    id: id_example,
  } satisfies TestsControllerGetAttemptDetailsRequest;

  try {
    const data = await api.testsControllerGetAttemptDetails(body);
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
| **id** | `string` |  | [Defaults to `undefined`] |

### Return type

[**TestHistoryItemDto**](TestHistoryItemDto.md)

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


## testsControllerGetGlobalLeaderboard

> testsControllerGetGlobalLeaderboard(limit)



### Example

```ts
import {
  Configuration,
  TestsApi,
} from '';
import type { TestsControllerGetGlobalLeaderboardRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestsApi(config);

  const body = {
    // string
    limit: limit_example,
  } satisfies TestsControllerGetGlobalLeaderboardRequest;

  try {
    const data = await api.testsControllerGetGlobalLeaderboard(body);
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
| **limit** | `string` |  | [Defaults to `undefined`] |

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
| **200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## testsControllerGetMyRank

> testsControllerGetMyRank()



### Example

```ts
import {
  Configuration,
  TestsApi,
} from '';
import type { TestsControllerGetMyRankRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestsApi(config);

  try {
    const data = await api.testsControllerGetMyRank();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

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
| **200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## testsControllerGetPdfLeaderboard

> testsControllerGetPdfLeaderboard(pdfId, limit)



### Example

```ts
import {
  Configuration,
  TestsApi,
} from '';
import type { TestsControllerGetPdfLeaderboardRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestsApi(config);

  const body = {
    // string
    pdfId: pdfId_example,
    // string
    limit: limit_example,
  } satisfies TestsControllerGetPdfLeaderboardRequest;

  try {
    const data = await api.testsControllerGetPdfLeaderboard(body);
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
| **limit** | `string` |  | [Defaults to `undefined`] |

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
| **200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## testsControllerGetTestHistory

> TestHistoryResponseDto testsControllerGetTestHistory()

Get user\&#39;s test history with scores and reports

### Example

```ts
import {
  Configuration,
  TestsApi,
} from '';
import type { TestsControllerGetTestHistoryRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestsApi(config);

  try {
    const data = await api.testsControllerGetTestHistory();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**TestHistoryResponseDto**](TestHistoryResponseDto.md)

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


## testsControllerGetTestStats

> TestStatsDto testsControllerGetTestStats(pdfId)

Get test stats: attempt count, avg score, top scorer

### Example

```ts
import {
  Configuration,
  TestsApi,
} from '';
import type { TestsControllerGetTestStatsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestsApi(config);

  const body = {
    // string
    pdfId: pdfId_example,
  } satisfies TestsControllerGetTestStatsRequest;

  try {
    const data = await api.testsControllerGetTestStats(body);
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

[**TestStatsDto**](TestStatsDto.md)

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


## testsControllerSubmitTest

> testsControllerSubmitTest(submitTestDto)



### Example

```ts
import {
  Configuration,
  TestsApi,
} from '';
import type { TestsControllerSubmitTestRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TestsApi(config);

  const body = {
    // SubmitTestDto
    submitTestDto: ...,
  } satisfies TestsControllerSubmitTestRequest;

  try {
    const data = await api.testsControllerSubmitTest(body);
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
| **submitTestDto** | [SubmitTestDto](SubmitTestDto.md) |  | |

### Return type

`void` (Empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

