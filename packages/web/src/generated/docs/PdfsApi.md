# PdfsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**pdfsControllerChatPlan**](PdfsApi.md#pdfscontrollerchatplan) | **POST** /pdfs/chat | Chat with AI to plan test generation |
| [**pdfsControllerDeletePdf**](PdfsApi.md#pdfscontrollerdeletepdf) | **DELETE** /pdfs/{id} | Delete a PDF and all associated data (Admin only) |
| [**pdfsControllerGenerateFlashcards**](PdfsApi.md#pdfscontrollergenerateflashcards) | **POST** /pdfs/{id}/generate | Generate flashcards from a PDF |
| [**pdfsControllerGetObjectives**](PdfsApi.md#pdfscontrollergetobjectives) | **GET** /pdfs/{id}/objectives | Get generated objectives and questions for a PDF |
| [**pdfsControllerListAllPdfs**](PdfsApi.md#pdfscontrollerlistallpdfs) | **GET** /pdfs/all | List all PDFs from all users (for taking tests) |
| [**pdfsControllerListPdfs**](PdfsApi.md#pdfscontrollerlistpdfs) | **GET** /pdfs | List all PDFs for the user with pagination |



## pdfsControllerChatPlan

> pdfsControllerChatPlan(chatMessageDto)

Chat with AI to plan test generation

### Example

```ts
import {
  Configuration,
  PdfsApi,
} from '';
import type { PdfsControllerChatPlanRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PdfsApi(config);

  const body = {
    // ChatMessageDto
    chatMessageDto: ...,
  } satisfies PdfsControllerChatPlanRequest;

  try {
    const data = await api.pdfsControllerChatPlan(body);
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
| **chatMessageDto** | [ChatMessageDto](ChatMessageDto.md) |  | |

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
| **200** | AI response with test plan |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## pdfsControllerDeletePdf

> pdfsControllerDeletePdf(id)

Delete a PDF and all associated data (Admin only)

### Example

```ts
import {
  Configuration,
  PdfsApi,
} from '';
import type { PdfsControllerDeletePdfRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PdfsApi(config);

  const body = {
    // string
    id: id_example,
  } satisfies PdfsControllerDeletePdfRequest;

  try {
    const data = await api.pdfsControllerDeletePdf(body);
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

`void` (Empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | PDF deleted successfully |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## pdfsControllerGenerateFlashcards

> pdfsControllerGenerateFlashcards(id, body)

Generate flashcards from a PDF

### Example

```ts
import {
  Configuration,
  PdfsApi,
} from '';
import type { PdfsControllerGenerateFlashcardsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PdfsApi(config);

  const body = {
    // string
    id: id_example,
    // object
    body: Object,
  } satisfies PdfsControllerGenerateFlashcardsRequest;

  try {
    const data = await api.pdfsControllerGenerateFlashcards(body);
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
| **body** | `object` |  | |

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


## pdfsControllerGetObjectives

> Array&lt;ObjectiveResponseDto&gt; pdfsControllerGetObjectives(id)

Get generated objectives and questions for a PDF

### Example

```ts
import {
  Configuration,
  PdfsApi,
} from '';
import type { PdfsControllerGetObjectivesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PdfsApi(config);

  const body = {
    // string
    id: id_example,
  } satisfies PdfsControllerGetObjectivesRequest;

  try {
    const data = await api.pdfsControllerGetObjectives(body);
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

[**Array&lt;ObjectiveResponseDto&gt;**](ObjectiveResponseDto.md)

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


## pdfsControllerListAllPdfs

> PaginatedPdfResponseDto pdfsControllerListAllPdfs(page, limit)

List all PDFs from all users (for taking tests)

### Example

```ts
import {
  Configuration,
  PdfsApi,
} from '';
import type { PdfsControllerListAllPdfsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PdfsApi(config);

  const body = {
    // number
    page: 8.14,
    // number
    limit: 8.14,
  } satisfies PdfsControllerListAllPdfsRequest;

  try {
    const data = await api.pdfsControllerListAllPdfs(body);
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
| **page** | `number` |  | [Defaults to `undefined`] |
| **limit** | `number` |  | [Defaults to `undefined`] |

### Return type

[**PaginatedPdfResponseDto**](PaginatedPdfResponseDto.md)

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


## pdfsControllerListPdfs

> PaginatedPdfResponseDto pdfsControllerListPdfs(page, limit)

List all PDFs for the user with pagination

### Example

```ts
import {
  Configuration,
  PdfsApi,
} from '';
import type { PdfsControllerListPdfsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PdfsApi(config);

  const body = {
    // number
    page: 8.14,
    // number
    limit: 8.14,
  } satisfies PdfsControllerListPdfsRequest;

  try {
    const data = await api.pdfsControllerListPdfs(body);
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
| **page** | `number` |  | [Defaults to `undefined`] |
| **limit** | `number` |  | [Defaults to `undefined`] |

### Return type

[**PaginatedPdfResponseDto**](PaginatedPdfResponseDto.md)

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

