# mcp-hf

MCP server khám phá model/provider trên Hugging Face, kiểm tra free, đọc giới hạn token và quota.

## Cài đặt

Yêu cầu Python 3.11+.

```bash
cd mcp/mcp-hf
python -m venv .venv
. .venv/bin/activate
pip install -e ../mcp-core -e .
```

## Cấu hình

Copy `.env.example` thành `.env` nếu muốn, hoặc đặt biến môi trường:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `HF_TOKEN` | trống | Token HF; cần cho `get_quota` phần account |
| `HF_MCP_ENABLE_ACCOUNT_QUOTA` | `true` | Cho phép gọi `whoami-v2` |
| `HF_MCP_ENABLE_CHAT` | `false` | Dự phòng cho tool gọi thử (chưa bật) |
| `HF_MCP_TRANSPORT` | `stdio` | `stdio` hoặc `streamable-http` |
| `HF_MCP_HOST` | `127.0.0.1` | Chỉ dùng cho HTTP |
| `HF_MCP_PORT` | `8765` | Chỉ dùng cho HTTP |
| `HF_MCP_TIMEOUT_SECONDS` | `15` | Timeout HTTP |
| `HF_MCP_CACHE_TTL_SECONDS` | `300` | TTL cache router |

Không commit token. Server không log token và không nhận token qua tool args.

## Chạy

```bash
hf-free-mcp              # stdio
hf-free-mcp --http       # streamable HTTP tại 127.0.0.1:8765
```

## Cấu hình MCP client

```json
{
  "mcpServers": {
    "hf-free-providers": {
      "command": "/duong/dan/to/mcp/mcp-hf/.venv/bin/hf-free-mcp",
      "env": {
        "HF_TOKEN": "${HF_TOKEN}"
      }
    }
  }
}
```

## Tool

| Tool | Việc |
|---|---|
| `search_free_models` | Tìm model/offer, lọc free, context, tools, sort |
| `get_model_offers` | Tất cả provider của một model |
| `check_free` | Verdict free/paid/unknown + evidence |
| `get_model_limits` | Context window, model max context, max output tokens + source |
| `get_quota` | Plan HF, ZeroGPU, Hub rate limit, provider free-tier limits |
| `list_providers` | Provider + số model + free count |
| `recommend_free_model` | Gợi ý tối đa 3 model, fallback paid nếu cần |
| `build_provider_config` | Config OpenAI-compatible cho OpenAI SDK/rag-service/env |

## Nguồn dữ liệu

- `https://router.huggingface.co/v1/models` - provider, pricing, `is_free`, context, latency/throughput.
- `https://huggingface.co/api/models` - search, downloads/likes/tags.
- `https://huggingface.co/{model}/raw/main/{config,tokenizer_config,generation_config}.json` - token limits.
- `https://huggingface.co/api/whoami-v2` - plan (`isPro`, `canPay`, `billingMode`).
- Header `ratelimit` / `ratelimit-policy` của Hub API - rate limit của process MCP.
- `data/free_tiers.yaml`, `data/provider_limits.yaml` - registry có `source_url` + `verified_at`.

## Điều cần biết

- Free trên HF là trạng thái động. Tại thời điểm 2026-11-26, router không có model `is_free=true`; free chủ yếu là promo tạm thời, free tier gọi trực tiếp provider, hoặc ZeroGPU Spaces.
- `HF_TOKEN` giúp đọc plan (Free/PRO/Team/Enterprise) nhưng **không** đọc được số credit còn lại của tài khoản cá nhân.
- `max_output_tokens` thường không được công bố; server trả `null` + `not_published`, không suy đoán.
- ZeroGPU chỉ trả quota theo tier; không có API trả số phút còn lại.
- Provider limits trong registry chỉ đúng khi gọi trực tiếp provider, không áp dụng qua HF router.

## Test

```bash
python -m pytest -q
HF_MCP_LIVE=1 python -m pytest -q -m live
ruff check . && ruff format --check .
```
