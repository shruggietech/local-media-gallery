# Measurements: v0.2.0 preparation

## 2026-11-02

No new runtime performance or package-size claim is elected. S026 qualification will retain preparation, qualification and combined elapsed times from terminal receipts, with660-second target,900-second hard limit and15-second finalization reserve. Final accepted source/run and literal product/source hashes remain pending. Baseline S025 observations are not substituted for final S026 evidence.

## 2026-11-02 - Accepted source c614874039a6

Terminal receipt clocks from run41556315661, independently validated. Preparation and combined duration are separate from qualification. All scopes satisfy900s hard limit and15s reserve. Windows packages exceeded the660s advisory target; its717.582s result remains valid. Queue, artifact transfer and cache finalization also contribute to session wall time.

| Scope | Preparation seconds | Qualification seconds | Combined seconds |
| --- | ---: | ---: | ---: |
| repository | 24.358 | 15.716 | 40.074 |
| website | 54.008 | 57.865 | 111.873 |
| product-windows | 252.002 | 339.157 | 591.159 |
| product-linux | 1174.428 | 247.853 | 1422.281 |
| product-macos | 165.679 | 129.067 | 294.746 |
| windows-packages | 1098.094 | 717.582 | 1815.676 |
| linux-packages | 1068.368 | 337.732 | 1406.1 |
| macos-packages | 541.012 | 570.018 | 1111.03 |
| release-validation | 106.141 | 167.892 | 274.033 |

Native candidate c8cfe4fa08a20e3dec8a1eec129c4539057da592ec9c15c07c0673ad04928d77. These are accepted pre-merge bytes, not a published release. Future publication requires final merged-main qualification and that run's unchanged accepted bytes.

| Native artifact | Bytes | SHA256 |
| --- | ---: | --- |
| local-media-gallery-0.2.0-full-aarch64-macos.pkg | 28035585 | 0a9af6baa3e8ae1ec88047368bd88ee90c555298f5e364c3dc59562f485a3098 |
| local-media-gallery-0.2.0-full-x86_64-linux-runtime-sources.tar.xz | 1293158060 | 4f6fa32985e794424a3db4dccb8f9fc304ebdecb7fd611aa5cf4ab0633503d71 |
| local-media-gallery-0.2.0-full-x86_64-linux.run | 252591687 | 45f4aa2148499ae5929aa3d88380006c49f0957f58a93463e993607a1403f203 |
| local-media-gallery-0.2.0-full-x86_64-windows.exe | 308367872 | ab4375e1de637d833463dfda0f62b332934552ba9f7b6242f0f102049887658a |
| local-media-gallery-0.2.0-lite-aarch64-macos | 19896728 | 2b48a6278cded20952c9ae14310d86e977b9d4ff7baf3606ad0466dda9bf7d78 |
| local-media-gallery-0.2.0-lite-x86_64-linux | 21645439 | e6af4356cf6ac444a5c1bf8d2054b90d657d4fce126b5a3af8cd288766e2adf9 |
| local-media-gallery-0.2.0-lite-x86_64-windows.exe | 24225095 | 3b0d0b07e675b2ed7809a2e34533c9face9f5a5b1deadc5506a69e72d629f777 |

| Original CI archive ID | Bytes | SHA256 |
| --- | ---: | --- |
| 13195236385 | 1098 | 017c0c341ef024d3fca1753d68b147293114185375571d1bf633911dcc730257 |
| 13193748540 | 2692514 | 8fc44bd5531005c0cef985fb119874531bd00e43c4190d4e75a2a0d4b3cf9ece |
| 13194089627 | 41792896 | 4aa7d3a0a4a1f0365bac7be7f505017d083cdfdbe52303341423e6493be27664 |
| 13196256236 | 165525892 | 8ba53cd9b5b73e06862be3ae22a793500881f0f277901ea5506959ea56fb11bd |
| 13195680302 | 60867077 | a72fcfe8705464282709fa21eb04d697e6159cdf4bdf19500eaa4ce100e95819 |
| 13197006297 | 3112737508 | 8a55d63821bf5a1149fa38bfa53d481a88ff0bdf437a05c106319b80e052861b |
| 13196336026 | 2414825233 | 20196b1aa960f850079e100ff09d968d8c1fe803862f21420a1c6c7d7986f712 |
| 13196811534 | 710071441 | 5b5709dbc90a74c0fcb0fdb5ce4c96a3639c15d30e1a8754dbfb357f66a5eb5b |
| 13196992796 | 19340931 | c34f68857db246e779932a0e9c20f06e8cac8e22fc52ee784a394a61481bcdf4 |
| 13195101602 | 4861500 | febe19407564c9540be54740b247460428df0157f9cfc27f50821e36873b88a0 |
