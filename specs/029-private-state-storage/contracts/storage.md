# Storage and recovery contract

This internal contract implements #90-#93. Product identity remains unchanged.

| Operation | Required result |
| --- | --- |
| Normal Windows Full/Lite paths | Shared application-named roots from Known Folders |
| Developer/native-test paths | Tooling-owned roots selected before WebView construction |
| Internal updater fixture/campaign | Explicit validated context shared by all transaction/worker calls |
| Valid format1 private preferences with other product version | Preserve usable fields and compatible unknown data |
| Obsolete private settings/history | Automatic private-only reset and writable defaults |
| Actual I/O/path/link failure | Refuse affected operation with full selected filename and action |
| Portable settings | Existing independent preserve/refuse contract, retaining shipped0.2.0 compatibility |
| Read-only update probe | No state creation/reset; report reset disposition for resettable private data |
| Concurrent updater ownership | One effective lease per destination in the selected shared context |
| Coordination release | Reclaim only validated owned coordination after effective ownership ends |
| Transaction cleanup | Retain authenticated recovery/rollback inputs; remove provably obsolete owned scratch |

The owner already removed reported legacy paths. S029 performs no local cleanup of those paths. Published snapshots/assets remain unchanged;0.2.1 is a candidate until separately published.
