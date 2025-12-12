# DefaultApi

All URIs are relative to _http://localhost_

| Method                                                                                             | HTTP request                 | Description |
| -------------------------------------------------------------------------------------------------- | ---------------------------- | ----------- |
| [**appControllerGetHello**](DefaultApi.md#appcontrollergethello)                                   | **GET** /                    |             |
| [**pdfsControllerGenerateFlashcards**](DefaultApi.md#pdfscontrollergenerateflashcards)             | **POST** /pdfs/{id}/generate |             |
| [**uploadsControllerConfirmUpload**](DefaultApi.md#uploadscontrollerconfirmupload)                 | **POST** /uploads/confirm    |             |
| [**uploadsControllerCreateSignedUploadUrl**](DefaultApi.md#uploadscontrollercreatesigneduploadurl) | **POST** /uploads/sign       |             |

## appControllerGetHello

> appControllerGetHello()

### Example

```ts
import { Configuration, DefaultApi } from "";
import type { AppControllerGetHelloRequest } from "";

async function example() {
    console.log("🚀 Testing  SDK...");
    const api = new DefaultApi();

    try {
        const data = await api.appControllerGetHello();
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

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **200**     |             | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## pdfsControllerGenerateFlashcards

> pdfsControllerGenerateFlashcards(id, body)

### Example

```ts
import { Configuration, DefaultApi } from "";
import type { PdfsControllerGenerateFlashcardsRequest } from "";

async function example() {
    console.log("🚀 Testing  SDK...");
    const api = new DefaultApi();

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

| Name     | Type     | Description | Notes                     |
| -------- | -------- | ----------- | ------------------------- |
| **id**   | `string` |             | [Defaults to `undefined`] |
| **body** | `object` |             |                           |

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: Not defined

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **201**     |             | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## uploadsControllerConfirmUpload

> uploadsControllerConfirmUpload(body)

### Example

```ts
import { Configuration, DefaultApi } from "";
import type { UploadsControllerConfirmUploadRequest } from "";

async function example() {
    console.log("🚀 Testing  SDK...");
    const api = new DefaultApi();

    const body = {
        // object
        body: Object,
    } satisfies UploadsControllerConfirmUploadRequest;

    try {
        const data = await api.uploadsControllerConfirmUpload(body);
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name     | Type     | Description | Notes |
| -------- | -------- | ----------- | ----- |
| **body** | `object` |             |       |

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: Not defined

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **201**     |             | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## uploadsControllerCreateSignedUploadUrl

> uploadsControllerCreateSignedUploadUrl(body)

### Example

```ts
import { Configuration, DefaultApi } from "";
import type { UploadsControllerCreateSignedUploadUrlRequest } from "";

async function example() {
    console.log("🚀 Testing  SDK...");
    const api = new DefaultApi();

    const body = {
        // object
        body: Object,
    } satisfies UploadsControllerCreateSignedUploadUrlRequest;

    try {
        const data = await api.uploadsControllerCreateSignedUploadUrl(body);
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name     | Type     | Description | Notes |
| -------- | -------- | ----------- | ----- |
| **body** | `object` |             |       |

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: Not defined

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **201**     |             | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
