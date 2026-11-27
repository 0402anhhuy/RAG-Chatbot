"""CLI entrypoint for the Hugging Face model/provider MCP server."""

from __future__ import annotations

import argparse

from mcp_hf.server import build_runtime
from mcp_hf.settings import Settings


def main() -> None:
    parser = argparse.ArgumentParser(description="Hugging Face free-provider MCP server")
    parser.add_argument("--http", action="store_true", help="Run streamable HTTP instead of stdio")
    parser.add_argument("--host", default=None, help="HTTP bind host (default from HF_MCP_HOST)")
    parser.add_argument("--port", type=int, default=None, help="HTTP bind port (default from HF_MCP_PORT)")
    parser.add_argument(
        "--transport",
        choices=["stdio", "streamable-http"],
        default=None,
        help="Transport override",
    )
    args = parser.parse_args()

    settings = Settings()
    transport = "streamable-http" if args.http else (args.transport or settings.transport)
    server, _ = build_runtime(settings)

    if transport == "streamable-http":
        server.run(
            "streamable-http",
            host=args.host or settings.host,
            port=args.port or settings.port,
        )
    else:
        server.run("stdio")


if __name__ == "__main__":
    main()
