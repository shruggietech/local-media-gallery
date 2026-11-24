// SPDX-License-Identifier: Apache-2.0
import { useEffect, useState } from "react";
import { assetKey, mediaUrl } from "./api";
import type { Asset, MediaFacts } from "./types";

interface Preview {
  image: Blob;
  facts: MediaFacts;
}

interface Job {
  asset: Asset;
  signal: AbortSignal;
  resolve: (value: Preview | null) => void;
}

const queue: Job[] = [];
const cache = new Map<string, Preview>();
let active = 0;

function acquireFrame(item: Asset, signal: AbortSignal): Promise<Preview | null> {
  return new Promise((resolve) => {
    const video = item.kind === 1 ? document.createElement("video") : null;
    const image = video ? null : new Image();
    const media = video ?? image!;
    let finished = false;
    const finish = (result: Preview | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", cancelled);
      media.removeAttribute("src");
      video?.load();
      resolve(result);
    };
    const cancelled = () => finish(null);
    const timer = window.setTimeout(cancelled, 10000);
    const capture = (w: number, h: number, dur: number) => {
      if (!w || !h || finished) return;
      const scale = Math.min(1, 512 / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const context = canvas.getContext("2d");
      if (!context) return finish(null);
      try {
        context.drawImage(media, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => finish(blob ? { image: blob, facts: { w, h, dur } } : null), "image/webp", 0.78);
      } catch {
        finish(null);
      }
    };
    if (signal.aborted) return finish(null);
    signal.addEventListener("abort", cancelled, { once: true });
    media.onerror = cancelled;
    if (video) {
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        if (duration > 0.2) video.currentTime = Math.min(duration * 0.1, 3);
        else capture(video.videoWidth, video.videoHeight, duration);
      };
      video.onseeked = () => capture(video.videoWidth, video.videoHeight, video.duration);
    } else if (image) {
      image.onload = () => capture(image.naturalWidth, image.naturalHeight, 0);
    }
    media.src = mediaUrl(item);
  });
}

function pump() {
  while (active < 2 && queue.length > 0) {
    const job = queue.pop()!;
    if (job.signal.aborted) {
      job.resolve(null);
      continue;
    }
    active++;
    void acquireFrame(job.asset, job.signal).then((result) => {
      if (result) {
        if (cache.size >= 192) cache.delete(cache.keys().next().value!);
        cache.set(assetKey(job.asset), result);
      }
      job.resolve(result);
    }).finally(() => {
      active--;
      pump();
    });
  }
}

function requestPreview(asset: Asset, signal: AbortSignal): Promise<Preview | null> {
  const found = cache.get(assetKey(asset));
  if (found) return Promise.resolve(found);
  return new Promise((resolve) => {
    queue.push({ asset, signal, resolve });
    pump();
  });
}

export function usePreview(asset: Asset, onFacts: (asset: Asset, facts: MediaFacts) => void) {
  const key = assetKey(asset);
  const needsPreview = asset.kind === 1 || asset.size > 192 * 1024 && asset.ext !== "svg";
  const [preview, setPreview] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    if (!needsPreview) return;
    const controller = new AbortController();
    let url = "";
    void requestPreview(asset, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result) {
        url = URL.createObjectURL(result.image);
        onFacts(asset, result.facts);
      }
      setPreview({ key, url });
    });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  // Primitive identity prevents rescanning a preview when its measured dimensions arrive.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, needsPreview, onFacts]);
  if (!needsPreview) return mediaUrl(asset);
  if (preview?.key !== key) return null;
  return preview.url || (asset.kind === 0 ? mediaUrl(asset) : null);
}
