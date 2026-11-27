"""In-process metrics with a Prometheus text exposition endpoint.

No external agent is required: counters and latency histograms live in memory and
are rendered at ``/api/v1/metrics``. Cardinality stays bounded because routes are
labelled with their template path, not the raw URL.
"""

from __future__ import annotations

import threading
import time
from collections.abc import Mapping
from dataclasses import dataclass, field

from starlette.types import ASGIApp, Message, Receive, Scope, Send

DEFAULT_BUCKETS: tuple[float, ...] = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0)

Labels = tuple[tuple[str, str], ...]


def _labels(labels: Mapping[str, str] | None) -> Labels:
    if not labels:
        return ()
    return tuple(sorted((str(key), str(value)) for key, value in labels.items()))


def _render_labels(labels: Labels) -> str:
    if not labels:
        return ""
    return "{" + ",".join(f'{key}="{value}"' for key, value in labels) + "}"


@dataclass
class _Histogram:
    buckets: tuple[float, ...]
    counts: list[int] = field(default_factory=list)
    total: float = 0.0
    observations: int = 0

    def __post_init__(self) -> None:
        if not self.counts:
            self.counts = [0] * len(self.buckets)

    def observe(self, value: float) -> None:
        self.total += value
        self.observations += 1
        for index, boundary in enumerate(self.buckets):
            if value <= boundary:
                self.counts[index] += 1


class MetricsRegistry:
    def __init__(self, *, buckets: tuple[float, ...] = DEFAULT_BUCKETS) -> None:
        self._buckets = buckets
        self._lock = threading.Lock()
        self._counters: dict[tuple[str, Labels], float] = {}
        self._histograms: dict[tuple[str, Labels], _Histogram] = {}

    def inc(self, name: str, value: float = 1.0, labels: Mapping[str, str] | None = None) -> None:
        key = (name, _labels(labels))
        with self._lock:
            self._counters[key] = self._counters.get(key, 0.0) + value

    def observe(self, name: str, value: float, labels: Mapping[str, str] | None = None) -> None:
        key = (name, _labels(labels))
        with self._lock:
            histogram = self._histograms.get(key)
            if histogram is None:
                histogram = _Histogram(self._buckets)
                self._histograms[key] = histogram
            histogram.observe(value)

    def snapshot(self) -> tuple[dict[tuple[str, Labels], float], dict[tuple[str, Labels], _Histogram]]:
        with self._lock:
            return dict(self._counters), dict(self._histograms)

    def reset(self) -> None:
        with self._lock:
            self._counters.clear()
            self._histograms.clear()

    def render(self) -> str:
        counters, histograms = self.snapshot()
        lines: list[str] = []
        by_name: dict[str, list[tuple[Labels, float]]] = {}
        for (name, labels), value in counters.items():
            by_name.setdefault(name, []).append((labels, value))
        for name in sorted(by_name):
            lines.append(f"# TYPE {name} counter")
            for labels, value in sorted(by_name[name]):
                lines.append(f"{name}{_render_labels(labels)} {value:g}")

        histogram_by_name: dict[str, list[tuple[Labels, _Histogram]]] = {}
        for (name, labels), histogram in histograms.items():
            histogram_by_name.setdefault(name, []).append((labels, histogram))
        for name in sorted(histogram_by_name):
            lines.append(f"# TYPE {name} histogram")
            for labels, histogram in sorted(histogram_by_name[name]):
                for boundary, count in zip(histogram.buckets, histogram.counts, strict=True):
                    bucket_labels = labels + (("le", f"{boundary:g}"),)
                    lines.append(f"{name}_bucket{_render_labels(bucket_labels)} {count}")
                lines.append(f"{name}_bucket{_render_labels(labels + (('le', '+Inf'),))} {histogram.observations}")
                lines.append(f"{name}_sum{_render_labels(labels)} {histogram.total:g}")
                lines.append(f"{name}_count{_render_labels(labels)} {histogram.observations}")
        return "\n".join(lines) + ("\n" if lines else "")


METRICS = MetricsRegistry()


class MetricsMiddleware:
    """Record request count and latency for every HTTP route."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started = time.perf_counter()
        status_code = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = int(message["status"])
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            route = scope.get("route")
            path = getattr(route, "path", None) or "unmatched"
            labels = {
                "method": str(scope.get("method", "GET")),
                "route": str(path),
                "status": str(status_code),
            }
            METRICS.inc("rag_http_requests_total", labels=labels)
            METRICS.observe(
                "rag_http_request_duration_seconds",
                time.perf_counter() - started,
                labels={"method": labels["method"], "route": labels["route"]},
            )


__all__ = ["METRICS", "MetricsMiddleware", "MetricsRegistry"]
