# `app/schemas` — Shared HTTP response schemas

## Chức năng

Chứa các Pydantic model **dùng chung** cho response envelope, hiện chủ yếu phục vụ contract lỗi
và tài liệu OpenAPI. Request/response model đặc thù của từng route vẫn được khai báo ngay trong
file route tương ứng (`app/api/v1/*.py`).

## Pipeline hiện tại

Không có pipeline runtime; các model được dùng như kiểu mô tả (documentation/validation) và để
đồng bộ envelope `{success, error:{code,message,details,request_id}}` với `app/core/errors.py`.

## Các file

| File          | Vai trò                                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__init__.py` | Docstring marker package.                                                                                                                                       |
| `common.py`   | `ErrorDetail` (`code`, `message`, `details`, `request_id`) và `ErrorResponse` (`success: Literal[False] = False`, `error: ErrorDetail`) — mô tả thân lỗi chuẩn. |

## Điểm cần lưu ý

- Hiện route trả `JSONResponse` thủ công, chưa dùng `response_model=` với các schema này; chúng
  chủ yếu là contract tham chiếu. Khi chuẩn hóa OpenAPI, nên gắn `responses={...: {"model": ErrorResponse}}`.
- `openapi.json` tĩnh trong `docs/api/openapi.json` là nguồn tham chiếu cho client (Spring).
