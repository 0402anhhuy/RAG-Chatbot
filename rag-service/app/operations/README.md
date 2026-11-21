# `app/operations` — Operational commands

## Chức năng

Chỗ dành cho các **script/tiện ích vận hành** (migration parity, maintenance, CLI) chạy ngoài
đường request. Hiện package chỉ là marker: logic vận hành thật đang nằm trong
`app/core/rollout.py` (`compare_migration_parity`, `build_rollout_plan`) và tài liệu trong
`docs/operations/`.

## Pipeline hiện tại

Không có pipeline runtime. Package không được import từ `app/main.py`; đây là điểm mở rộng —
các command trong tương lai có thể được chạy tay (ví dụ `python -m app.operations.<cmd>`) mà
không kéo thêm dependency vào server path.

## Các file

| File          | Vai trò                                   |
| ------------- | ----------------------------------------- |
| `__init__.py` | Docstring marker package; chưa export gì. |

## Điểm cần lưu ý

- Nếu bổ sung lệnh vận hành, nên giữ chúng thuần (không import FastAPI app) để có thể chạy trong
  job CI/container riêng.
- Tài liệu vận hành liên quan: `docs/operations/deployment.md`, `docs/operations/rollout.md`,
  `docs/operations/ingest-recovery.md`.
