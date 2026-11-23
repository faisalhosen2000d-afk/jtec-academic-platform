import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { SupabaseClient } from "@supabase/supabase-js";

const B2_PREFIX = "b2://";
const SUPABASE_BUCKET = "academic-materials";

function getB2Config() {
  const rawEndpoint = (process.env.B2_ENDPOINT ?? "").trim();
  const bucket = (process.env.B2_BUCKET_NAME ?? "").trim();
  const keyId = (process.env.B2_KEY_ID ?? "").trim();
  const appKey = (process.env.B2_APPLICATION_KEY ?? "").trim();

  if (!rawEndpoint || !bucket || !keyId || !appKey) {
    return null;
  }

  const endpoint = rawEndpoint.startsWith("http")
    ? rawEndpoint
    : `https://${rawEndpoint}`;
  const regionMatch = endpoint.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i);
  const region = regionMatch?.[1] ?? "us-west-004";

  return { endpoint, region, bucket, keyId, appKey };
}

let cachedClient: S3Client | null = null;
let cachedConfigKey = "";

function getB2Client() {
  const cfg = getB2Config();
  if (!cfg) return null;

  const sig = `${cfg.endpoint}|${cfg.bucket}|${cfg.keyId}`;
  if (!cachedClient || cachedConfigKey !== sig) {
    cachedClient = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.keyId,
        secretAccessKey: cfg.appKey,
      },
      forcePathStyle: true,
    });
    cachedConfigKey = sig;
  }

  return { client: cachedClient, bucket: cfg.bucket };
}

export function isB2Configured(): boolean {
  return getB2Config() !== null;
}

export function isB2Path(filePath: string): boolean {
  return filePath.startsWith(B2_PREFIX);
}

export function normalizeMaterialKey(filePath: string): string {
  return filePath
    .replace(/^b2:\/\//, "")
    .replace(/^\/+/, "")
    .replace(/^academic-materials\//, "");
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

export async function createMaterialSignedUrl(
  serviceSupabase: SupabaseClient,
  filePath: string,
  expiresInSeconds = 300,
  options?: { download?: boolean },
): Promise<string | null> {
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

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function downloadMaterialBuffer(
  serviceSupabase: SupabaseClient,
  filePath: string,
): Promise<Buffer | null> {
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

  if (error || !fileBlob) {
    return null;
  }

  return Buffer.from(await fileBlob.arrayBuffer());
}

export async function removeMaterialObject(
  serviceSupabase: SupabaseClient,
  filePath: string,
): Promise<void> {
  if (!filePath) return;

  if (isB2Path(filePath)) {
    const b2 = getB2Client();
    if (!b2) return;

    const cleanKey = normalizeMaterialKey(filePath);
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
  const folder = cleanPath.includes("/") ? cleanPath.slice(0, cleanPath.lastIndexOf("/")) : "";
  const fileName = cleanPath.includes("/") ? cleanPath.slice(cleanPath.lastIndexOf("/") + 1) : cleanPath;
  const { data: listed } = await serviceSupabase.storage
    .from(SUPABASE_BUCKET)
    .list(folder, { search: fileName, limit: 5 });

  return Boolean(listed && listed.some((f) => f.name === fileName));
}