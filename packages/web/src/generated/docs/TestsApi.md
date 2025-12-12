# TestsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**testsControllerGetGlobalLeaderboard**](TestsApi.md#testscontrollergetgloballeaderboard) | **GET** /tests/leaderboard |  |
| [**testsControllerGetMyRank**](TestsApi.md#testscontrollergetmyrank) | **GET** /tests/leaderboard/me |  |
| [**testsControllerGetPdfLeaderboard**](TestsApi.md#testscontrollergetpdfleaderboard) | **GET** /tests/leaderboard/pdf/{pdfId} |  |
| [**testsControllerSubmitTest**](TestsApi.md#testscontrollersubmittest) | **POST** /tests/submit |  |



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

