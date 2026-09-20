"""RET/CIT/SAF/ING + golden eval (docs/19 §3). Thresholds: validity 100%, recall ≥ 5/6."""

import re

import pytest
from fastapi.testclient import TestClient

from app.application.rag_orchestrator import RagOrchestrator
from app.infra.knowledge_store import reset_store
from app.main import create_app

GOLDEN = [
    ("What standard covers stainless steel cutlery?", "seed-is4119", "corrosion"),
    ("How do I verify HUID on gold jewellery?", "seed-hallmark", "BIS Care"),
    ("What karat options are hallmarked?", "seed-hallmark", "22K916"),
    ("How does a manufacturer get an ISI licence?", "seed-cert", "factory inspection"),
    ("What happens on non-conformity after licence grant?", "seed-cert", "suspension"),
    ("What is risk-based thinking?", "seed-iso9001", "continual improvement"),
]


@pytest.fixture()
def orch(tmp_path):
    return RagOrchestrator(reset_store(directory=tmp_path))


def test_ret_001_expected_doc_retrieved(orch):
    for query, doc_id, _ in GOLDEN:
        hits = orch.retrieve(query, top_k=3)
        assert hits, query
        assert hits[0][0].document_id == doc_id, query


def test_ret_002_top_k_respected(orch):
    assert len(orch.retrieve("stainless steel cutlery standard", top_k=1)) == 1


def test_cit_001_markers_map_to_citations(orch):
    res = orch.answer("What standard covers stainless steel cutlery?", 3)
    markers = {int(n) for n in re.findall(r"\[(\d+)\]", res.answer)}
    assert markers and markers == {c.index for c in res.citations}
    for c in res.citations:
        assert orch.store.chunk_by_id(c.mongo_id).chunk_text == c.chunk_text


def test_cit_002_insufficient_evidence_has_no_markers(orch):
    res = orch.answer("quantum entanglement protocols", 3)
    assert res.citations == [] and "[" not in res.answer and res.chunks_retrieved == 0


def test_saf_001_no_fabrication(orch):
    res = orch.answer("BIS rules for lunar habitats", 3)
    assert res.citations == []
    assert "sufficient evidence" in res.answer


def test_ing_001_upload_publish_searchable(tmp_path):
    client = TestClient(create_app())
    reset_store(directory=tmp_path)
    with open(__file__, "rb") as fh:
        r = client.post(
            "/api/v1/admin/documents/upload",
            files={"file": ("demo.txt", fh, "text/plain")},
            data={"title": "Demo Doc", "source_key": "bis-illustrative"},
        )
    assert r.status_code == 201, r.text
    version_id = r.json()["version_id"]
    assert client.post(f"/api/v1/admin/documents/{version_id}/publish").status_code == 200
    r = client.post("/api/v1/search", json={"query": "golden recall thresholds validity", "top_k": 3})
    assert r.status_code == 200 and r.json()["grounding"] in ("grounded", "insufficient_evidence")


def test_eval_001_golden_thresholds(orch):
    recalled, valid = 0, 0
    for query, doc_id, phrase in GOLDEN:
        res = orch.answer(query, 3)
        markers = {int(n) for n in re.findall(r"\[(\d+)\]", res.answer)}
        if markers == {c.index for c in res.citations}:
            valid += 1
        docs = [orch.store.documents[orch.store.chunk_by_id(c.mongo_id).document_id].id for c in res.citations]
        if doc_id in docs and phrase.lower() in res.answer.lower():
            recalled += 1
    assert valid == len(GOLDEN), "citation validity must be 100%"
    assert recalled >= 5, f"golden recall {recalled}/6 below threshold"
