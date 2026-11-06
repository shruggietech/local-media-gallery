# Data model: ordinary Windows MSI upgrade repair

## Published input

Version, release/candidate ID, canonical bytes/hash, full artifact name/bytes/hash and old native MSI/payload/product/package identities. Every downloaded byte sequence must match its selected canonical descriptor. Embedded records retain original hashes and relative paths.

## Upgrade observation

Host OS/version/image, token/context, directory attributes, actual invocation, original installed product and choices, log/dialog/screenshot hashes, terminal exit, resulting product/location/integrations, retained private/gallery/foreign inventories and launch identity. Result is reproduced-failure, contrasting-pass, fixed-pass or incomplete; collection success is separate.

## Candidate regression

Exact source/build/MSI hash and baseline observation reference, verified predecessor, ordinary UI actions, preservation/refusal/cancellation observations and qualification receipt. Existing qualification clocks and package evidence contracts remain authoritative.

## Lifecycle

Qualified published inputs -> verified predecessor fixture -> ordinary UI attempt -> attributable terminal result -> independently verified state/preservation. Failure retains operands. A fixed-pass requires the same reproduced starting state and changed candidate identity, never a reused historical runtime result.
