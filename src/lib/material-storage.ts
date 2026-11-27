import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SectionStorageRule } from "@/lib/platform-settings";

const B2_PREFIX = "b2://";
const R2_PREFIX = "r2://";
const SUPABASE_BUCKET = "academic-materials";

export const R2_FREE_TIER_BYTES = 10 * 1024 * 1024 * 1024;
export const R2_HARD_LIMIT_BYTES = 9.5 * 1024 * 1024 * 1024;
export const B2_BANDWIDTH_FAILOVER_PERCENT = 80;

export type ResolvedStorageProvider = "r2" | "b2" | "supabase";

export interface R2UsageStats {
  configured: boolean;
  usedBytes: number;
  objectCount: number;
  hardLimitBytes: number;
  freeTierBytes: number;
  percentOfFreeTier: number;
  hardLimitReached: boolean;
}

export interface StorageResolutionResult {
  provider: ResolvedStorageProvider;
  reason: string;
  fallbackTriggered: boolean;
}

function getB2Config() {
  const rawEndpoint = (process.env.B2_ENDPOINT ?? "").trim();
  const bucket = (process.env.B2_BUCKET_NAME ?? "").trim();
  const keyId = (process.env.B2_KEY_ID ?? "").trim();
  const appKey = (process.env.B2_APPLICATION_KEY ?? "").trim();

  if (!rawEndpoint || !bucket || !keyId || !appKey) return null;

  const cleanRaw = rawEndpoint.replace(/\/+$/, "");
  const endpoint = cleanRaw.startsWith("http") ? cleanRaw : `https://${cleanRaw}`;
  const regionMatch = endpoint.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i);
  const region = regionMatch?.[1] ?? "us-west-004";

  return { endpoint, region, bucket, keyId, appKey };
}

let cachedB2Client: S3Client | null = null;
let cachedB2ConfigKey = "";

function getB2Client() {
  const cfg = getB2Config();
  if (!cfg) return null;

  const sig = `${cfg.endpoint}|${cfg.bucket}|${cfg.keyId}`;
  if (!cachedB2Client || cachedB2ConfigKey !== sig) {
    cachedB2Client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.keyId,
        secretAccessKey: cfg.appKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    cachedB2ConfigKey = sig;
  }

  return { client: cachedB2Client, bucket: cfg.bucket };
}

function getR2Config() {
  const rawEndpoint = (process.env.R2_ENDPOINT ?? "").trim();
  const bucket = (process.env.R2_BUCKET_NAME ?? "").trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID ?? "").trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY ?? "").trim();

  if (!rawEndpoint || !bucket || !accessKeyId || !secretAccessKey) return null;

  const cleanRaw = rawEndpoint.replace(/\/+$/, "");
  const endpoint = cleanRaw.startsWith("http") ? cleanRaw : `https://${cleanRaw}`;

  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

let cachedR2Client: S3Client | null = null;
let cachedR2ConfigKey = "";

function getR2Client() {
  const cfg = getR2Config();
  if (!cfg) return null;

  const sig = `${cfg.endpoint}|${cfg.bucket}|${cfg.accessKeyId}`;
  if (!cachedR2Client || cachedR2ConfigKey !== sig) {
    cachedR2Client = new S3Client({
      endpoint: cfg.endpoint,
      region: "auto",
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    cachedR2ConfigKey = sig;
  }

  return { client: cachedR2Client, bucket: cfg.bucket };
}

export function isB2Configured(): boolean {
  return getB2Config() !== null;
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

export function isB2Path(filePath: string): boolean {
  return filePath.startsWith(B2_PREFIX);
}

export function isR2Path(filePath: string): boolean {
  return filePath.startsWith(R2_PREFIX);
}

export function normalizeMaterialKey(filePath: string): string {
  return filePath
    .replace(/^r2:\/\//, "")
    .replace(/^b2:\/\//, "")
    .replace(/^\/+/, "")
    .replace(/^academic-materials\//, "");
}

let cachedR2Usage: { stats: R2UsageStats; expiresAt: number } | null = null;
const R2_USAGE_CACHE_TTL_MS = 2 * 60 * 1000;

export function invalidateR2UsageCache(): void {
  cachedR2Usage = null;
}

export async function getR2BucketUsage(forceRefresh = false): Promise<R2UsageStats> {
  const r2 = getR2Client();
  if (!r2) {
    return {
      configured: false,
      usedBytes: 0,
      objectCount: 0,
      hardLimitBytes: R2_HARD_LIMIT_BYTES,
      freeTierBytes: R2_FREE_TIER_BYTES,
      percentOfFreeTier: 0,
      hardLimitReached: false,
    };
  }

  if (!forceRefresh && cachedR2Usage && Date.now() < cachedR2Usage.expiresAt) {
    return cachedR2Usage.stats;
  }

  let usedBytes = 0;
  let objectCount = 0;
  let continuationToken: string | undefined;

  try {
    do {
      const res = await r2.client.send(
        new ListObjectsV2Command({
          Bucket: r2.bucket,
          ContinuationToken: continuationToken,
        }),
      );

      for (const item of res.Contents ?? []) {
        usedBytes += item.Size ?? 0;
        objectCount += 1;
      }

      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);
  } catch (err) {
    console.error("[R2] Failed to measure bucket usage:", err);
  }

  const percentOfFreeTier = Math.min(
    100,
    Math.round((usedBytes / R2_FREE_TIER_BYTES) * 1000) / 10,
  );

  const stats: R2UsageStats = {
    configured: true,
    usedBytes,
    objectCount,
    hardLimitBytes: R2_HARD_LIMIT_BYTES,
    freeTierBytes: R2_FREE_TIER_BYTES,
    percentOfFreeTier,
    hardLimitReached: usedBytes >= R2_HARD_LIMIT_BYTES,
  };

  cachedR2Usage = { stats, expiresAt: Date.now() + R2_USAGE_CACHE_TTL_MS };
  return stats;
}

export async function resolveTargetStorageProvider(params: {
  rule: SectionStorageRule;
  fileSizeBytes: number;
  b2DailyBandwidthPercent?: number;
}): Promise<StorageResolutionResult> {
  const { rule, fileSizeBytes, b2DailyBandwidthPercent = 0 } = params;
  const r2Available = isR2Configured();
  const b2Available = isB2Configured();

  const canFitInR2 = async (): Promise<boolean> => {
    if (!r2Available) return false;
    const usage = await getR2BucketUsage();
    return usage.usedBytes + Math.max(0, fileSizeBytes) < R2_HARD_LIMIT_BYTES;
  };

  if (rule.mode === "supabase") {
    return { provider: "supabase", reason: "section_rule_supabase", fallbackTriggered: false };
  }

  if (rule.mode === "r2") {
    if (await canFitInR2()) {
      return { provider: "r2", reason: "section_rule_r2", fallbackTriggered: false };
    }
    if (b2Available) {
      return { provider: "b2", reason: "r2_hard_limit_failover_to_b2", fallbackTriggered: true };
    }
    return {
      provider: "supabase",
      reason: "r2_hard_limit_failover_to_supabase",
      fallbackTriggered: true,
    };
  }

  if (rule.mode === "b2") {
    if (b2Available && b2DailyBandwidthPercent < B2_BANDWIDTH_FAILOVER_PERCENT) {
      return { provider: "b2", reason: "section_rule_b2", fallbackTriggered: false };
    }
    if (await canFitInR2()) {
      return {
        provider: "r2",
        reason: "b2_bandwidth_threshold_failover_to_r2",
        fallbackTriggered: true,
      };
    }
    if (b2Available) {
      return { provider: "b2", reason: "b2_fallback_no_r2_space", fallbackTriggered: false };
    }
    return { provider: "supabase", reason: "b2_unconfigured_fallback", fallbackTriggered: true };
  }

  const cutoffBytes = rule.cutoff_mb * 1024 * 1024;
  const isLargeFile = fileSizeBytes >= cutoffBytes;

  if (isLargeFile) {
    if (await canFitInR2()) {
      return { provider: "r2", reason: "smart_auto_large_to_r2", fallbackTriggered: false };
    }
    if (b2Available) {
      return {
        provider: "b2",
        reason: "smart_auto_r2_limit_failover_to_b2",
        fallbackTriggered: true,
      };
    }
    return {
      provider: "supabase",
      reason: "smart_auto_fallback_to_supabase",
      fallbackTriggered: true,
    };
  }

  if (b2Available && b2DailyBandwidthPercent < B2_BANDWIDTH_FAILOVER_PERCENT) {
    return { provider: "b2", reason: "smart_auto_small_to_b2", fallbackTriggered: false };
  }

  if (await canFitInR2()) {
    return {
      provider: "r2",
      reason: "smart_auto_b2_bandwidth_failover_to_r2",
      fallbackTriggered: true,
    };
  }

  if (b2Available) {
    return { provider: "b2", reason: "smart_auto_small_to_b2_forced", fallbackTriggered: false };
  }

  return { provider: "supabase", reason: "smart_auto_no_cloud_fallback", fallbackTriggered: true };
}

export async function createB2UploadPresignedUrl(
  objectKey: string,
  contentType: string,
  expiresInSeconds = 900,
): Promise<{ uploadUrl: string; storagePath: string } | null> {
  const b2 = getB2Client();
  if (!b2) return null;

  const cleanKey = normalizeMaterialKey(objectKey);
  const cmd = new PutObjectCommand({
    Bucket: b2.bucket,
    Key: cleanKey,
    ContentType: contentType || "application/octet-stream",
  });

  const uploadUrl = await getSignedUrl(b2.client, cmd, {
    expiresIn: expiresInSeconds,
  });

  return {
    uploadUrl,
    storagePath: `${B2_PREFIX}${cleanKey}`,
  };
}

export async function createR2UploadPresignedUrl(
  objectKey: string,
  contentType: string,
  expiresInSeconds = 900,
): Promise<{ uploadUrl: string; storagePath: string } | null> {
  const r2 = getR2Client();
  if (!r2) return null;

  const cleanKey = normalizeMaterialKey(objectKey);
  const cmd = new PutObjectCommand({
    Bucket: r2.bucket,
    Key: cleanKey,
    ContentType: contentType || "application/octet-stream",
  });

  const uploadUrl = await getSignedUrl(r2.client, cmd, {
    expiresIn: expiresInSeconds,
  });

  invalidateR2UsageCache();

  return {
    uploadUrl,
    storagePath: `${R2_PREFIX}${cleanKey}`,
  };
}

export async function createMaterialSignedUrl(
  serviceSupabase: SupabaseClient,
  filePath: string,
  expiresInSeconds = 300,
  options?: { download?: boolean },
): Promise<string | null> {
  if (isR2Path(filePath)) {
    const r2 = getR2Client();
    if (!r2) return null;

    const cleanKey = normalizeMaterialKey(filePath);
    const fileName = cleanKey.split("/").pop() || "material.pdf";
    const safeName = fileName.replace(/"/g, "");

    const cmd = new GetObjectCommand({
      Bucket: r2.bucket,
      Key: cleanKey,
      ...(options?.download
        ? { ResponseContentDisposition: `attachment; filename="${safeName}"` }
        : {}),
    });

    return await getSignedUrl(r2.client, cmd, { expiresIn: expiresInSeconds });
  }

  if (isB2Path(filePath)) {
    const b2 = getB2Client();
    if (!b2) return null;

    const cleanKey = normalizeMaterialKey(filePath);
    const fileName = cleanKey.split("/").pop() || "material.pdf";
    const safeName = fileName.replace(/"/g, "");

    const cmd = new GetObjectCommand({
      Bucket: b2.bucket,
      Key: cleanKey,
      ...(options?.download
        ? { ResponseContentDisposition: `attachment; filename="${safeName}"` }
        : {}),
    });

    return await getSignedUrl(b2.client, cmd, { expiresIn: expiresInSeconds });
  }

  const normalizedPath = normalizeMaterialKey(filePath);
  const { data, error } = await serviceSupabase.storage
    .from(SUPABASE_BUCKET)
    .createSignedUrl(normalizedPath, expiresInSeconds, {
      ...(options?.download ? { download: true } : {}),
    });

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function downloadMaterialBuffer(
  serviceSupabase: SupabaseClient,
  filePath: string,
): Promise<Buffer | null> {
  if (isR2Path(filePath)) {
    const r2 = getR2Client();
    if (!r2) return null;

    const cleanKey = normalizeMaterialKey(filePath);
    const res = await r2.client.send(
      new GetObjectCommand({
        Bucket: r2.bucket,
        Key: cleanKey,
      }),
    );

    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  if (isB2Path(filePath)) {
    const b2 = getB2Client();
    if (!b2) return null;

    const cleanKey = normalizeMaterialKey(filePath);
    const res = await b2.client.send(
      new GetObjectCommand({
        Bucket: b2.bucket,
        Key: cleanKey,
      }),
    );

    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  const normalizedPath = normalizeMaterialKey(filePath);
  const { data: fileBlob, error } = await serviceSupabase.storage
    .from(SUPABASE_BUCKET)
    .download(normalizedPath);

  if (error || !fileBlob) return null;
  return Buffer.from(await fileBlob.arrayBuffer());
}

export async function removeMaterialObject(
  serviceSupabase: SupabaseClient,
  filePath: string,
): Promise<void> {
  if (!filePath) return;

  if (isR2Path(filePath)) {
    const r2 = getR2Client();
    if (!r2) return;

    const cleanKey = normalizeMaterialKey(filePath);
    await r2.client.send(
      new DeleteObjectCommand({
        Bucket: r2.bucket,
        Key: cleanKey,
      }),
    );
    invalidateR2UsageCache();
    return;
  }

  if (isB2Path(filePath)) {
    const b2 = getB2Client();
    if (!b2) return;

    const cleanKey = normalizeMaterialKey(filePath);

    try {
      const listed = await b2.client.send(
        new ListObjectVersionsCommand({
          Bucket: b2.bucket,
          Prefix: cleanKey,
        }),
      );

      const targets = [
        ...(listed.Versions ?? []),
        ...(listed.DeleteMarkers ?? []),
      ].filter((v) => v.Key === cleanKey && v.VersionId);

      if (targets.length > 0) {
        for (const item of targets) {
          await b2.client.send(
            new DeleteObjectCommand({
              Bucket: b2.bucket,
              Key: cleanKey,
              VersionId: item.VersionId,
            }),
          );
        }
        return;
      }
    } catch {
      // Fall back to standard DeleteObject
    }

    await b2.client.send(
      new DeleteObjectCommand({
        Bucket: b2.bucket,
        Key: cleanKey,
      }),
    );
    return;
  }

  const normalizedPath = normalizeMaterialKey(filePath);
  await serviceSupabase.storage.from(SUPABASE_BUCKET).remove([normalizedPath]);
}

export async function checkMaterialObjectExists(
  serviceSupabase: SupabaseClient,
  filePath: string,
): Promise<boolean> {
  if (!filePath) return false;

  if (isR2Path(filePath)) {
    const r2 = getR2Client();
    if (!r2) return false;

    try {
      const cleanKey = normalizeMaterialKey(filePath);
      await r2.client.send(
        new HeadObjectCommand({
          Bucket: r2.bucket,
          Key: cleanKey,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  if (isB2Path(filePath)) {
    const b2 = getB2Client();
    if (!b2) return false;

    try {
      const cleanKey = normalizeMaterialKey(filePath);
      await b2.client.send(
        new HeadObjectCommand({
          Bucket: b2.bucket,
          Key: cleanKey,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  const cleanPath = normalizeMaterialKey(filePath);
  const folder = cleanPath.includes("/")
    ? cleanPath.slice(0, cleanPath.lastIndexOf("/"))
    : "";
  const fileName = cleanPath.includes("/")
    ? cleanPath.slice(cleanPath.lastIndexOf("/") + 1)
    : cleanPath;
  const { data: listed } = await serviceSupabase.storage
    .from(SUPABASE_BUCKET)
    .list(folder, { search: fileName, limit: 5 });

  return Boolean(listed && listed.some((f) => f.name === fileName));
}