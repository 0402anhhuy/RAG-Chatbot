# Frontend — React + Vite

Prism Studio frontend (Developer Hub, Academy Hub, Admin, Overview, Landing).

## Commands

```bash
npm install     # cài dependency
npm run dev     # dev server (vite)
npm run build   # build production -> dist/
npm run lint    # oxlint
```

## Cấu trúc `src/`

```
src/
├── main.jsx              # entry: mount App + style toàn cục
├── app/                  # App.jsx (routes) + providers (Theme/Toast)
├── api/                  # client.js (request/buildQuery/unwrap) + 1 file mỗi domain
├── components/
│   ├── ui/               # primitives dùng chung: Modal, Spinner, EmptyState, SearchPill
│   ├── layout/           # khung app: AppShell, SidebarRail, TopBar
│   └── <domain>/         # breadcrumb, canvas, document-icon, logo, selector, theme, three, toast
├── features/             # mỗi khu vực nghiệp vụ một thư mục
│   ├── developer-hub/    #   layout/, modals/, home/, projects/, tasks/, conversations/, settings/
│   ├── academy-hub/      #   layout/, home/, courses/, documents/, quizzes/, tools/, ...
│   ├── admin/  auth/  landing/  overview/  profile/
├── hooks/                # useAsyncData (fetch + loading/error/reload), useSession
├── lib/                  # session.js (localStorage), validators.js
├── styles/               # tokens.css (design token) → base.css → primitives.css → shared.css
└── assets/               # icon định dạng file
```

## Quy ước

- **Import tuyệt đối**: luôn dùng alias `@/...` (map tới `src/`), không dùng `../../..`.
- **Gọi API**: mọi thứ đi qua `@/api` (client tự gắn Bearer token, `buildQuery` dựng query, `unwrap` bóc envelope).
- **Tải dữ liệu**: dùng `useAsyncData(loader, deps, options)` thay cho `useEffect` + `setLoading/setError` tự viết.
- **Modal**: dùng `@/components/ui/Modal` (overlay, header, footer, ESC, khoá scroll) — không tự dựng overlay.
- **Điều hướng**: hub dùng `SidebarRail` + `TopBar`; mỗi hub chỉ khai báo `nav.js` (id/label/icon).
- **CSS**: token nằm ở `styles/tokens.css`; block nào trùng ở ≥2 feature thì đưa vào `styles/shared.css`; style riêng đặt cạnh component.
