# Permissions

Role/scope permission helpers (e.g. `is_staff_with_scope`, `canApproveMaterial`,
`canVerifyResult`) implemented starting Phase E. These functions are the single
source of truth consumed by UI, Server Actions/Route Handlers, and mirrored by
RLS policies — per the finalized security architecture.
