# S021 data model

## Product version and source

Product version is the existing canonical numeric triplet without leading zeros (except zero itself). Snapshot versions add one v prefix. Windows MSI components must fit255/255/65535. Current VERSION stays0.0.0; baseline is not publishable product output. Source identity binds the exact40-hex revision,64-hex logical digest and positive file count. Native published/support combinations remain the existing matrix.

## Candidate and assets

Release formatVersion1 uses product local-media-gallery and one immutable candidateId (SHA-256 of canonical immutable candidate content). Fields bind repository, version/source, six primary package rows, supporting assets, documentation snapshot/review and native qualification. Assets have role, unique portable filename, canonical repository release URL, decimal byte count and64-hex SHA-256. Package rows additionally identify edition/platform/architecture/format/prerequisites/optional tools and full inventory/notice/native receipt bindings. Reject unknown fields, duplicate names/rows, unsafe paths, unsupported claims and mixed identities. Hash files as streams; do not load package archives into JSON.

The six primary archives are selected only from ordinary native build.records. Windows Full preserves its embedded updater/descriptors. Linux Full's external descriptor remains a supporting asset bound to the unchanged .deb basename. Replacement/negative/runtime-proof artifacts are qualification evidence, never primary downloads.

## Snapshots and review

A snapshot owns version, original source/release binding, ordered chapters, assets, schema/examples/contracts/additional schemas and captured external references. A complete sorted relative-path/byte/hash inventory binds all retained inputs. Capture is fresh or exact-idempotent, never arbitrary overwrite. Historical correction records bind old/new digests, date, reason and changelog reference. Ordinary review binds current document/glossary inventories. Major review also maps terms to definitions, external primary references and local usage; checks validate recorded coverage without claiming automated semantic approval.

## Documentation gate

A receipt binds candidateId, original source, complete snapshot inventory digests, renderer fingerprint, projection and exact output inventory plus all required terminal structural/browser/link/schema/search/review outcomes. Projection is candidate before product publication, observed-publication before canonical promotion. The latter additionally binds an observed publication digest. Both outcomes must pass. No receipt for changed inputs/renderer/artifacts/source can be reused.

## Publication state

assembled -> staged draft -> observed published -> canonical promoted. Failure/uncertainty retains owned operation identity, intent, observations and prior public selection. The remote release body identifies its exact candidate. Resolve existing tags to commits, including annotated tags. Native publication initially leaves latest unchanged. Product/support assets are checked by actual bytes and remote identity. The canonical record is an immutable release.json asset uploaded only after matching post-publication documentation qualification; its own hash is observed externally to avoid self-reference.

Mutation acknowledgement is not authority. Repeat stage/upload/publish/promote observes remote state and exact existing bytes before completing/retrying. Foreign same-name bytes and conflicting published state refuse. An attributable empty starter asset may be removed only from the owned draft when operation/label identity proves ownership; unknown assets remain untouched. Comparison with previous selection and serialized workflow operations detect observed concurrent pointer changes. No service-wide atomic compare-and-swap is asserted.

## Public projection

Canonical published records bind actual repository/tag/release ID/source/publication and verified product/support asset IDs/hashes/URLs plus both documentation receipts. A per-snapshot historical record remains bound to its original source; current renderer source is separate. Ordinary website/download consumers require verified published data. Candidate qualification uses a separate private projection and cannot authorize public downloads. Normal website CI resolves the actual latest published record; absent release retains the specification baseline.
