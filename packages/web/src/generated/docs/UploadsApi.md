# UploadsApi

All URIs are relative to _http://localhost_

| Method                                                                                             | HTTP request              | Description |
| -------------------------------------------------------------------------------------------------- | ------------------------- | ----------- |
| [**uploadsControllerConfirmUpload**](UploadsApi.md#uploadscontrollerconfirmupload)                 | **POST** /uploads/confirm |             |
| [**uploadsControllerCreateSignedUploadUrl**](UploadsApi.md#uploadscontrollercreatesigneduploadurl) | **POST** /uploads/sign    |             |

## uploadsControllerConfirmUpload

> ConfirmUploadResponseDto uploadsControllerConfirmUpload(body)

### Example

```ts
import { Configuration, UploadsApi } from "";
import type { UploadsControllerConfirmUploadRequest } from "";

async function example() {
    console.log("🚀 Testing  SDK...");
    const api = new UploadsApi();

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

[**ConfirmUploadResponseDto**](ConfirmUploadResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **201**     |             | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## uploadsControllerCreateSignedUploadUrl

> UploadUrlResponseDto uploadsControllerCreateSignedUploadUrl(body)

### Example

```ts
import { Configuration, UploadsApi } from "";
import type { UploadsControllerCreateSignedUploadUrlRequest } from "";

async function example() {
    console.log("🚀 Testing  SDK...");
    const api = new UploadsApi();

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

[**UploadUrlResponseDto**](UploadUrlResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **201**     |             | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
