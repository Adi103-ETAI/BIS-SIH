"""Knowledge domain models (docs/08). Illustrative seed content only — NOT official BIS data."""

from typing import Literal

from pydantic import BaseModel, Field

TrustLevel = Literal["authoritative", "verified_official", "controlled_reference", "secondary"]
DocStatus = Literal["draft", "published", "superseded", "withdrawn"]


class Source(BaseModel):
    key: str  # e.g. "bis-illustrative"
    source_type: Literal["bis", "iso", "iec"]
    title: str
    trust_level: TrustLevel = "controlled_reference"
    illustrative: bool = True


class DocumentVersion(BaseModel):
    id: str
    document_id: str
    version: int = 1
    status: DocStatus = "draft"
    file_name: str = ""


class Document(BaseModel):
    id: str
    source_key: str
    title: str
    current_version_id: str = ""


class DocumentChunk(BaseModel):
    id: str  # stable chunk id; exposed as legacy mongo_id
    document_id: str
    version_id: str
    chunk_text: str
    section: str = ""
    ordinal: int = 0
