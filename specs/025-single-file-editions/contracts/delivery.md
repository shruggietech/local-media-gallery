# Delivery contract

| Platform | Lite product | Full product |
| --- | --- | --- |
| Windows x86_64 | One PE executable | One elevated setup PE with offline payloads |
| Ubuntu24.04 x86_64 | One ELF executable | One native executable installer with verified offline deb closure |
| macOS15 aarch64 | One Mach-O executable | One system-domain flat pkg |

Final product filenames: local-media-gallery-VERSION-EDITION-ARCH-OS with native format suffix where applicable; actual releases omit candidate. Evidence and source/metadata assets are distinguishable and do not become extra product choices.

Lite internal notices/metadata require no user-side file handling. Gallery preparation verifies final file hash/size/platform, stages atomically, preserves collision/refusal and exact reuse, and copies only the executable as its application delivery. Generated gallery settings/caches remain user data.

Full installs all payloads through one normal entrypoint, obtains normal system authorization, never downloads installation operands, validates embedded identities before execution, discovers owned prior installation for maintenance, and retains/reuses required internal recovery metadata without manual JSON selection.

Native acceptance must prove actual delivered files, not internal archives or merely CLI identity. Linux and macOS executable permission/download handling must be tested and documented truthfully.
