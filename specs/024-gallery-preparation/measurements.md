# S024 timing

All timestamps are UTC. Preparation, qualification and combined clocks remain separate. Target 660s is advisory; hard limit 900s and provisional finalization reserve 15s apply to every accepted campaign.

## Local development qualification (chronological)

| Campaign | Preparation seconds | Qualification seconds | Combined seconds | Result |
| --- | ---: | ---: | ---: | --- |
| Initial prerequisite check |24.376|0|24.376|Clippy prerequisite failure, retained|
|3e192c7|20.554|94.126|114.680|Pass|
|407637c|21.901|86.551|108.452|Pass|
|7dc04a8|22.593|91.421|114.014|Pass|
|c68c4a4|21.660|89.131|110.791|Pass|
|9339e4c|16.568|86.407|102.975|Pass|
|07adf79|16.888|85.725|102.613|Pass|

## Hosted diagnostic attempts (chronological)

| Source / scope / attempt | Preparation seconds | Qualification seconds | Combined seconds | Result |
| --- | ---: | ---: | ---: | --- |
|9339e4c macOS packages, attempt 1|453.975|129.521|583.496|Rejected AX observation|
|9339e4c Windows packages, attempt 1|802.855|885.417|1688.272|Rejected at reserve; elected readback incomplete|
|9339e4c macOS packages, attempt 2|535.995|308.495|844.490|Rejected AX observation|
|9339e4c Windows packages, attempt 2|595.483|712.740|1308.223|Pass; advisory target overrun|

## Accepted implementation run 41381517704

Rows are ordered by preparation start, then scope. Every original receipt binds revision 07adf79510d658a3f0290dbaa6780ee46a8fb95e and the logical source in verification.md.

| Scope | Preparation start | Readiness | Terminal | Preparation s | Qualification s | Combined s | Advisory target overrun |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
|linux-packages|2026-11-02T03:09:37.000Z|2026-11-02T03:18:23.120Z|2026-11-02T03:26:08.028Z|526.120|464.908|991.028|No|
|website|2026-11-02T03:09:37.000Z|2026-11-02T03:10:44.026Z|2026-11-02T03:11:42.026Z|67.026|58.000|125.026|No|
|repository|2026-11-02T03:09:38.000Z|2026-11-02T03:10:24.480Z|2026-11-02T03:10:35.466Z|46.480|10.986|57.466|No|
|macos-packages|2026-11-02T03:09:39.000Z|2026-11-02T03:17:16.115Z|2026-11-02T03:22:28.567Z|457.115|312.452|769.567|No|
|product-linux|2026-11-02T03:09:39.000Z|2026-11-02T03:18:21.090Z|2026-11-02T03:20:12.922Z|522.090|111.832|633.922|No|
|product-macos|2026-11-02T03:09:42.000Z|2026-11-02T03:27:30.352Z|2026-11-02T03:32:15.399Z|1068.352|285.047|1353.399|No|
|product-windows|2026-11-02T03:09:44.878Z|2026-11-02T03:14:28.242Z|2026-11-02T03:19:58.442Z|283.364|330.200|613.564|No|
|windows-packages|2026-11-02T03:09:46.706Z|2026-11-02T03:28:50.929Z|2026-11-02T03:43:28.501Z|1144.223|877.572|2021.795|Yes|
|release-validation|2026-11-02T03:46:50.000Z|2026-11-02T03:48:40.613Z|2026-11-02T03:51:46.543Z|110.613|185.930|296.543|No|
