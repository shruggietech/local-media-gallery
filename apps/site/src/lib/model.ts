// SPDX-License-Identifier: Apache-2.0
import generated from '../generated/model.json';

type Snapshot = { version: string; status: string; source: string; topics: string[]; schema?: string };
type Page = { route: string; title: string; html: string; raw: string; version?: string; topic?: string };
type Artifact = { edition: string; platform: string; architecture: string; filename: string; url: string; sha256: string };
export type SiteModel = { manifest: { latest: string; snapshots: Snapshot[] }; pages: Page[]; release: { version: string; artifacts: Artifact[] } | null };
export const model = generated as SiteModel;
