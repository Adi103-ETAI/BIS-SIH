# BIS AI — Kaggle batch embedding job (bge-m3, free GPU)
#
# RUNBOOK (Kaggle notebook, GPU accelerator ON):
#   1. Add `chunks.jsonl` as a notebook input (from: backend/scripts/export_chunks.py).
#      Each line: {"id": ..., "text": ...}. Chunking already done server-side —
#      this job ONLY embeds, so boundaries always match the backend 1:1.
#   2. Paste this file into a notebook cell (or upload as a script) and run.
#   3. Download `vectors.json` from notebook output.
#   4. Load into Supabase pgvector:
#        BIS_DATABASE_URL=<pooler> uv run python scripts/load_vectors.py vectors.json
#
# Cost: fits a free T4 (bge-m3 is ~2.3GB). ~2.5k chunks embed in minutes.

# Cell 1 — install (run once):
# !pip install -q sentence-transformers

# Cell 2 — embed:
import json

from sentence_transformers import SentenceTransformer

MODEL = "BAAI/bge-m3"  # must match backend BIS_EMBEDDING_MODEL (dim 1024)

model = SentenceTransformer(MODEL, device="cuda")

ids, texts = [], []
with open("/kaggle/input/bis-chunks/chunks.jsonl") as fh:
    for line in fh:
        row = json.loads(line)
        ids.append(row["id"])
        texts.append(row["text"])

print(f"{len(texts)} chunks → {MODEL}")
vectors = model.encode(texts, batch_size=32, show_progress_bar=True, normalize_embeddings=True)

out = {cid: vec.tolist() for cid, vec in zip(ids, vectors)}
assert all(len(v) == 1024 for v in out.values()), "dim mismatch — check model"
with open("/kaggle/working/vectors.json", "w") as fh:
    json.dump(out, fh)
print(f"wrote {len(out)} vectors → /kaggle/working/vectors.json")
