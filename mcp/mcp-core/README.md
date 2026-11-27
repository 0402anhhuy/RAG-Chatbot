# mcp-core

Shared contracts and generic MCP tools for model-catalog servers.

## What is here

- `contracts.py` - `CatalogBackend` interface every source implements.
- `models.py` - `ModelRecord`, `Offer`, `FreeVerdict`, `ModelLimits`, `QuotaSnapshot`, ...
- `free_policy.py` - free/promo/paid/unknown classification with evidence.
- `registry.py` - YAML free-tier and provider-limit registry.
- `scoring.py` - recommendation score.
- `service.py` - search/check/limits/quota/recommend/config use cases.
- `server.py` - registers the 8 MCP tools.

## Add a source

```python
from mcp_core.contracts import CatalogBackend


class MyBackend(CatalogBackend):
    name = "my-source"
    ...
```

Then:

```python
from mcp_core.registry import load_registry
from mcp_core.server import build_server
from mcp_core.service import CatalogService

service = CatalogService(MyBackend(), load_registry(...))
server = build_server(service, name="my-source-mcp")
server.run("stdio")
```

No provider-specific code belongs in this package.
