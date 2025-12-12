# TestsApi

All URIs are relative to _http://localhost_

| Method                                                                 | HTTP request           | Description |
| ---------------------------------------------------------------------- | ---------------------- | ----------- |
| [**testsControllerSubmitTest**](TestsApi.md#testscontrollersubmittest) | **POST** /tests/submit |             |

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

| Name              | Type                              | Description | Notes |
| ----------------- | --------------------------------- | ----------- | ----- |
| **submitTestDto** | [SubmitTestDto](SubmitTestDto.md) |             |       |

### Return type

`void` (Empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: Not defined

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **201**     |             | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
