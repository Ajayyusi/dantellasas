# ADR 0001 — Multi-tenant Firestore with org-rooted subcollections

- **Status:** Accepted (scaffold)
- **Date:** 2026-09-28

## Context

The platform serves many salon businesses, each with one or more branches.
Tenant data must be isolated, and staff may be limited to specific branches.

## Decision

- Root all tenant data at `organizations/{orgId}`.
- Store access in `organizations/{orgId}/members/{uid}` (role, branchIds, status).
- Branch-scoped entities carry `branchId` and live in org-level collections.
- Tenancy-structure writes happen only on the server (Admin SDK) behind guards.

## Consequences

- Simple, auditable rules; one extra `get()` per rule evaluation.
- Cross-branch reporting is a plain query within one org.
- Cross-org queries for a user go through the `users/{uid}/orgs` index.
- Domain entities are deferred until product research is verified.
