// SPDX-License-Identifier: Apache-2.0
import type { Asset, Config, Snapshot } from "./types";

async function call<T>(url: string, method = "GET", payload?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      ...(payload === undefined ? {} : {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    });
  } catch {
    throw new Error("The gallery stopped responding. Open it again from the launcher.");
  }
  if (!response.ok) {
    const fallback = response.status === 401 ? "Open the gallery from the launcher." : "The request failed.";
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.error || fallback);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

const gallery = (generation: string) => "/api/gallery/" + generation;

export const api = {
  state: () => call<Snapshot>("/api/state"),
  status: () => call<Snapshot>("/api/status"),
  config: (generation: string, patch: Partial<Config>) => call<Config>(gallery(generation) + "/config", "PUT", patch),
  refresh: (generation: string) => call<void>(gallery(generation) + "/refresh", "POST"),
  favorite: (asset: Asset) => call<void>(gallery(asset.generation) + "/favorite", "POST", {
    id: asset.id, revision: asset.revision, value: !asset.fav,
  }),
  open: (generation: string, path: string) => call<Snapshot>("/api/open", "POST", { generation, path }),
  pick: () => call<{ path: string }>("/api/pick", "POST"),
  ping: () => call<void>("/api/ping", "POST"),
  quit: () => call<void>("/api/quit", "POST"),
};

export const assetKey = (item: Asset) => [item.generation, item.id, item.revision].join("/");
export const mediaUrl = (item: Asset) => "/media/" + assetKey(item);
