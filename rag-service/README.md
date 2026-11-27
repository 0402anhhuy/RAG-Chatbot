# RAG Service

Thư mục này chứa RAG service chuẩn (canonical). Compose ở thư mục gốc chạy nó và Spring dùng client
nội bộ có version. Xem [inventory di trú và kiến trúc đích](docs/migration/legacy-map.md).

## Bắt đầu nhanh

### Chạy Python cục bộ

Từ thư mục gốc repository trong PowerShell:

```powershell
Set-Location rag-service
py -3.12 -m venv .venv
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Chạy container cục bộ

```powershell
Set-Location rag-service
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d
docker compose -f docker-compose.yml ps
```

Xem [phát triển cục bộ](docs/guides/local-development.md) để biết các lệnh chính xác và
[cấu hình](docs/guides/configuration.md) trước khi thay đổi settings. Lock dependency đã xác minh hash
được cài trong `.venv` cục bộ của service; xem [chính sách dependency](docs/operations/dependency-policy.md)
để biết các phiên bản Python được hỗ trợ và cách cập nhật lock.
Xem [Triển khai và vận hành container](docs/operations/deployment.md) cho runbook Compose, hướng dẫn
backup/restore và health check, và [Rollout và cổng phát hành](docs/operations/rollout.md) cho yêu cầu
triển khai theo giai đoạn.

Các health probe:

- `GET /api/v1/health/liveness`
- `GET /api/v1/health/readiness`

Service đang được triển khai từng phase. Xem [mục lục tài liệu](docs/index.md) để biết trạng thái phase
hiện tại và phạm vi của phần nền được hỗ trợ.
