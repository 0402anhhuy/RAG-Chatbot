from __future__ import annotations

from app.core.metrics import METRICS, MetricsRegistry


def test_counters_and_histograms_render_prometheus() -> None:
    registry = MetricsRegistry(buckets=(0.1, 0.5))
    registry.inc("rag_http_requests_total", labels={"method": "GET", "route": "/x", "status": "200"})
    registry.inc("rag_http_requests_total", 2, labels={"method": "GET", "route": "/x", "status": "200"})
    registry.observe("rag_http_request_duration_seconds", 0.05, labels={"method": "GET", "route": "/x"})
    registry.observe("rag_http_request_duration_seconds", 0.75, labels={"method": "GET", "route": "/x"})

    text = registry.render()

    assert 'rag_http_requests_total{method="GET",route="/x",status="200"} 3' in text
    assert 'rag_http_request_duration_seconds_bucket{method="GET",route="/x",le="0.1"} 1' in text
    assert 'rag_http_request_duration_seconds_bucket{method="GET",route="/x",le="0.5"} 1' in text
    assert 'rag_http_request_duration_seconds_bucket{method="GET",route="/x",le="+Inf"} 2' in text
    assert 'rag_http_request_duration_seconds_count{method="GET",route="/x"} 2' in text
    assert 'rag_http_request_duration_seconds_sum{method="GET",route="/x"} 0.8' in text


def test_registry_reset() -> None:
    registry = MetricsRegistry()
    registry.inc("counter")
    registry.reset()

    assert registry.render() == ""


def test_global_registry_accepts_metadata_labels() -> None:
    METRICS.reset()
    METRICS.inc("rag_chat_workflow_total", labels={"status": "generated", "provider": "mock"})

    assert 'status="generated"' in METRICS.render()
    METRICS.reset()
