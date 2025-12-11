# AuthApi

All URIs are relative to _http://localhost_

| Method                                                          | HTTP request            | Description |
| --------------------------------------------------------------- | ----------------------- | ----------- |
| [**authControllerRegister**](AuthApi.md#authcontrollerregister) | **POST** /auth/register |             |
| [**authControllerSignIn**](AuthApi.md#authcontrollersignin)     | **POST** /auth/login    |             |

## authControllerRegister

> AuthResponseDto authControllerRegister(createUserDto)

### Example

```ts
import {
  Configuration,
  AuthApi,
} from '';
import type { AuthControllerRegisterRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AuthApi();

  const body = {
    // CreateUserDto
    createUserDto: ...,
  } satisfies AuthControllerRegisterRequest;

  try {
    const data = await api.authControllerRegister(body);
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
| **createUserDto** | [CreateUserDto](CreateUserDto.md) |             |       |

### Return type

[**AuthResponseDto**](AuthResponseDto.md)

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

## authControllerSignIn

> AuthResponseDto authControllerSignIn(loginDto)

### Example

```ts
import {
  Configuration,
  AuthApi,
} from '';
import type { AuthControllerSignInRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AuthApi();

  const body = {
    // LoginDto
    loginDto: ...,
  } satisfies AuthControllerSignInRequest;

  try {
    const data = await api.authControllerSignIn(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name         | Type                    | Description | Notes |
| ------------ | ----------------------- | ----------- | ----- |
| **loginDto** | [LoginDto](LoginDto.md) |             |       |

### Return type

[**AuthResponseDto**](AuthResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **200**     |             | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
