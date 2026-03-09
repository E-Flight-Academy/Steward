import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { logger } from "@/lib/logger";

const REGION = process.env.SCW_REGION || "nl-ams";
const BUCKET = process.env.SCW_BUCKET_NAME || "steward-images";
const ENDPOINT = `https://s3.${REGION}.scw.cloud`;

let s3: S3Client | null = null;

function getS3(): S3Client | null {
  if (s3) return s3;
  const accessKey = process.env.SCW_ACCESS_KEY;
  const secretKey = process.env.SCW_SECRET_KEY;
  if (!accessKey || !secretKey) return null;
  s3 = new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: false,
  });
  return s3;
}

/** Check if an object already exists in the bucket */
export async function imageExists(key: string): Promise<boolean> {
  try {
    const client = getS3();
    if (!client) return false;
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Upload an image buffer and return its public URL */
export async function uploadImage(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const client = getS3();
  if (!client) throw new Error("Scaleway S3 not configured");
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    }),
  );
  const url = `https://${BUCKET}.s3.${REGION}.scw.cloud/${key}`;
  logger.info("Uploaded image to Scaleway", { key, url });
  return url;
}

/** Download an image from a URL, upload to Scaleway, return permanent URL */
export async function mirrorImage(
  sourceUrl: string,
  key: string,
): Promise<string | null> {
  try {
    // Check if already uploaded
    if (await imageExists(key)) {
      return `https://${BUCKET}.s3.${REGION}.scw.cloud/${key}`;
    }
    // Download from source
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      logger.warn("Failed to download image", { sourceUrl, status: res.status });
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/png";
    return await uploadImage(key, buffer, contentType);
  } catch (err) {
    logger.warn("mirrorImage failed", { sourceUrl, key, error: String(err) });
    return null;
  }
}
