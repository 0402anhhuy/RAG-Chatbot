# MCP servers

Thư mục này chứa các MCP server dùng để gom và so sánh model/provider từ nhiều nguồn.

## Cấu trúc

```
mcp/
  mcp-core/    # interface + tool dùng chung, không phụ thuộc provider
  mcp-hf/      # implementation cho Hugging Face
```

`mcp-hf` là server chạy được ngay. Các MCP sau (OpenRouter, Ollama, gateway nội bộ, ...)
chỉ cần implement lại `CatalogBackend` và dùng lại toàn bộ tool trong `mcp-core`.

## Cài đặt nhanh

```bash
python -m venv .venv
. .venv/bin/activate
pip install -e mcp-core -e mcp-hf
hf-free-mcp
```

Xem `mcp-hf/README.md` để biết biến môi trường, cấu hình client và danh sách tool.

## Interface chung

Mỗi nguồn model implement `mcp_core.contracts.CatalogBackend`:

```python
class CatalogBackend(ABC):
    name: str

    async def search_models(query, task, provider, limit) -> list[ModelRecord]: ...
    async def get_model(model_id) -> ModelRecord: ...
    async def get_model_limits(model_id, provider) -> ModelLimits: ...
    async def get_quota(...) -> QuotaSnapshot: ...
    async def list_providers(task) -> list[ProviderSummary]: ...
    async def build_provider_config(model_id, provider, target) -> dict: ...
```

Sau đó ghép với tool dùng chung:

```python
from mcp_core.server import build_server
from mcp_core.service import CatalogService

service = CatalogService(backend, registry)
server = build_server(service, name="my-source-mcp", version="0.1.0")
```

## Nguyên tắc thiết kế

- `unknown` không được biến thành `free` hoặc `paid`.
- Mọi verdict phải có `evidence`, `confidence`, `checked_at`.
- Tách `via: hf-router` và `via: direct-provider` vì billing/limit khác nhau.
- Không trả token ra output/log.
- Không gọi inference trả phí mặc định.
- Registry free tier/limit phải có `source_url` và `verified_at`.

## Thêm MCP mới

1. Tạo `mcp/mcp-<source>/`.
2. Implement `CatalogBackend` cho source đó.
3. Thêm registry YAML nếu source có free tier/limit.
4. Ghép bằng `build_server`.
5. Thêm test mock transport, không gọi mạng trong CI.
