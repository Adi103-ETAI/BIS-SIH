"""Illustrative seed knowledge. NOT official BIS data — demo content only.

Every seed source is flagged illustrative=True and served with that label.
Real corpus acquisition is OD-016; these seeds unblock Stage 3 eval only.
"""

import uuid

from app.domain.knowledge import Document, DocumentChunk, DocumentVersion, Source

SEED_SOURCES = [
    Source(key="bis-illustrative", source_type="bis", title="BIS illustrative demo set"),
    Source(key="iso-illustrative", source_type="iso", title="ISO illustrative demo set"),
]

_RAW_DOCS: list[tuple[str, str, str, list[tuple[str, str]]]] = [
    # (source_key, title, doc_id, [(section, text)])
    (
        "bis-illustrative",
        "IS 4119 (illustrative) — Stainless steel cutlery",
        "seed-is4119",
        [
            ("Scope", "This illustrative specification covers requirements for stainless steel cutlery including knives, forks and spoons for domestic use. It defines material grades, dimensions and finish."),
            ("Material", "Cutlery shall be manufactured from stainless steel grades capable of taking and retaining a keen cutting edge for knives. Handles may be of stainless steel or other materials firmly secured to the blade or prongs."),
            ("Tests", "Samples are subjected to corrosion resistance tests, hardness tests for knife blades and bend tests for forks and spoons. Dimensions are verified against the tables in this specification."),
        ],
    ),
    (
        "bis-illustrative",
        "BIS hallmarking (illustrative) — HUID jewellery",
        "seed-hallmark",
        [
            ("HUID", "Hallmark Unique Identification is a six-digit alphanumeric code given to each piece of hallmarked gold jewellery. Consumers can verify the HUID number on the BIS Care app before purchase."),
            ("Purity", "Common gold purities under hallmarking are 14, 18 and 22 karat, marked as 14K585, 18K750 and 22K916 respectively alongside the BIS logo and HUID."),
        ],
    ),
    (
        "bis-illustrative",
        "Product certification scheme (illustrative)",
        "seed-cert",
        [
            ("Scheme", "Under the product certification scheme, a manufacturer applies for a licence to use the ISI mark on products conforming to the relevant Indian Standard. The process includes application, factory inspection and sample testing."),
            ("Surveillance", "After grant of licence, surveillance visits and market sample testing ensure continued conformity. Non-conformity can lead to warnings, suspension or cancellation of the licence."),
        ],
    ),
    (
        "iso-illustrative",
        "ISO 9001 concepts (illustrative)",
        "seed-iso9001",
        [
            ("Quality", "A quality management system helps organisations consistently meet customer and regulatory requirements. Core ideas include process approach, risk-based thinking and continual improvement."),
        ],
    ),
]


def seed_documents() -> list[tuple[Document, DocumentVersion, list[DocumentChunk]]]:
    out = []
    for source_key, title, doc_id, sections in _RAW_DOCS:
        version = DocumentVersion(id=f"{doc_id}-v1", document_id=doc_id, version=1, status="published")
        doc = Document(id=doc_id, source_key=source_key, title=title, current_version_id=version.id)
        chunks = [
            DocumentChunk(
                id=f"{doc_id}-c{i}",
                document_id=doc_id,
                version_id=version.id,
                chunk_text=text,
                section=section,
                ordinal=i,
            )
            for i, (section, text) in enumerate(sections)
        ]
        out.append((doc, version, chunks))
    return out


def new_ids(doc_id: str) -> tuple[str, str]:
    suffix = uuid.uuid4().hex[:8]
    return f"{doc_id}-{suffix}", f"{doc_id}-{suffix}-v1"
