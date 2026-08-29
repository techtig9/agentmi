# Agentmi Phase 3 — Knowledge & RAG

Status: COMPLETE at code/static verification level.

## Implemented
- Durable `knowledge_sources` records, organization/agent scoped.
- Additive `source_id` on existing `knowledge_chunks`; existing rows remain valid.
- Text source ingestion without replacing previous sources.
- Public HTTPS website ingestion with SSRF/private-host protections.
- Input size and chunk-count limits.
- Batched Voyage embeddings with timeout and incomplete-batch validation.
- Source metadata: title, locator, status, character count and chunk count.
- pgvector RPC retrieval (`match_knowledge_chunks`) so runtime does not load every embedding into Node.
- Minimum similarity threshold and bounded top-K retrieval.
- Knowledge UI for adding text/URLs, viewing sources and inspecting recent chunks.
- Organization RLS for knowledge sources.
- Knowledge validation/chunking tests added.

## Verification
- Phase 3 file/static contracts: PASS.
- Runtime vector-retrieval integration contract: PASS.
- SQL schema contract checks: PASS.
- Delimiter/syntax sanity checks on changed TS/TSX files: PASS.

## Environment limitation
The project dependencies (`node_modules`) are not present in the supplied ZIP. A full `npm test` / `next build` cannot be executed in this environment without installing dependencies; previous installation attempts timed out. Therefore this report does not claim a full runtime build passed.

## Database migration
Run `supabase/phase3_knowledge_sources.sql` after the existing Agentmi schema/Phase 3 schema. It is additive and preserves existing knowledge chunks.
