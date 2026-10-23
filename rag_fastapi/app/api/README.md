# API routes

Add one router per bounded API area here: auth, users, documents, chat, study,
and workspace. The current migration keeps the first working routes in
`backend/app/main.py`; they can be moved into routers without changing the
frontend contract.
