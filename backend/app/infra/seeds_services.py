"""Illustrative catalogue seeds (docs/12 §7). Content only — NOT official BIS data.

Every seed row is labeled illustrative; AC-SRV-5: seeds require no code change.
"""

from datetime import datetime

from app.domain.catalogue import Service, ServiceCategory, ServiceVersion

CATEGORIES = [
    ("product-certification", "Product Certification"),
    ("hallmarking", "Hallmarking"),
    ("laboratory-recognition", "Laboratory Recognition"),
]

ILLUSTRATIVE = "Illustrative placeholder — requires verification against official BIS sources."

SERVICES: list[tuple[dict, dict]] = [
    (
        {"key": "product-certification", "name": f"Product Certification ({ILLUSTRATIVE})",
         "category_key": "product-certification",
         "description": "Scheme under which a product may be licensed to use the ISI mark. " + ILLUSTRATIVE},
        {"summary": "Apply for a licence to use the ISI mark on conforming products. " + ILLUSTRATIVE,
         "eligibility": [
             {"criterion": "manufacturing_site_in_india", "description": ILLUSTRATIVE},
             {"criterion": "testing_facility_access", "description": ILLUSTRATIVE}],
         "required_documents": [
             {"key": "manufacturing-license", "name": "Factory license", "mandatory": True,
              "accepted_formats": ["pdf"]},
             {"key": "test-report", "name": "Third-party test report", "mandatory": True,
              "accepted_formats": ["pdf"]}],
         "fees": [{"item": "application_fee", "amount": None, "currency": "INR",
                   "note": "To be confirmed from official source"}],
         "workflow_ref": "standard-application-v1",
         "allowed_roles": ["manufacturer", "laboratory", "consumer", "researcher", "student"]},
    ),
    (
        {"key": "hallmarking-registration", "name": f"Hallmarking Registration ({ILLUSTRATIVE})",
         "category_key": "hallmarking",
         "description": "Registration for jewellers under the hallmarking scheme. " + ILLUSTRATIVE},
        {"summary": "Register a jewellery outlet for hallmarked sales. " + ILLUSTRATIVE,
         "eligibility": [{"criterion": "valid_trade_license", "description": ILLUSTRATIVE}],
         "required_documents": [
             {"key": "trade-license", "name": "Trade license", "mandatory": True,
              "accepted_formats": ["pdf"]}],
         "fees": [{"item": "registration_fee", "amount": None, "currency": "INR",
                   "note": "To be confirmed from official source"}],
         "workflow_ref": "standard-application-v1",
         "allowed_roles": ["consumer", "manufacturer", "researcher", "student"]},
    ),
]


def seed_catalogue(db) -> bool:  # type: ignore[no-untyped-def]
    """Insert seeds iff the catalogue is empty. Returns True when seeded."""
    if db.query(Service).count():
        return False
    for key, name in CATEGORIES:
        db.add(ServiceCategory(key=key, name=name))
    db.flush()  # categories must exist before services reference them (PG enforces FKs)
    now = datetime.utcnow()
    for svc, ver in SERVICES:
        db.add(Service(status="published", current_version_number=1,
                       created_at=now, updated_at=now, **svc))
        db.add(ServiceVersion(service_key=svc["key"], version_number=1, status="published",
                              published_at=now, created_at=now, **ver))
    db.commit()
    return True
