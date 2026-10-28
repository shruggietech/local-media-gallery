# S015 Validation Guide

1. Complete Spec Kit analysis and prerequisite preparation. Local work may compile/test pure code and build the site headlessly; do not execute installers, GUI, native input or runtime provisioning on the owner workstation.
2. Run npm run check, npm test and affected app/site checks. Source identity must remain frozen during qualification; generated package/tool data stays under ignored owned directories.
3. On the isolated Windows package job, prepare pinned WiX/Microsoft inputs, validate signature/hash/version, build ordinary release Full/Lite and native installer support, assemble both Full scopes and Lite, and independently inspect inventories/dependencies.
4. Begin the common package qualification clock only after readiness. Exercise actual user/machine install, repeat, collisions, installed identity/integration, native ordinary gallery, controlled missing-runtime failure, Lite extraction/root/relocation/Refresh and data-retaining removal. Preserve all existing S014 jobs separately.
5. Read back uploaded exact-source package/native/footprint receipts and archives. Check failed/restart/canceled outcomes without relabelling them success; retain every campaign's preparation/qualification/combined time and terminal timestamp.
6. Publish the official PR for #22 automatically under the carried authorization, complete at most two S015 review rounds, resolve every finding and wait for green applicable CI. The owner performs final review/merge; no product release/tag/public pointer promotion is part of this guide.
