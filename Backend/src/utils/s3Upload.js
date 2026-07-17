import { GetObjectCommand, S3Client, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Read an env var and strip any accidental whitespace */
const getEnv = (key) => (process.env[key] || '').trim();

// ─── MinIO Configuration Check ───────────────────────────────────────────────
const requiredEnvVars = [
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET_NAME',
];

const isStorageConfigured = requiredEnvVars.every((envVar) => {
  const val = getEnv(envVar);
  return val.length > 0;
});

// ─── MinIO Client (S3-compatible) ────────────────────────────────────────────
let minioClient;

const getMinioClient = () => {
  if (!isStorageConfigured) {
    throw new Error('MinIO is not configured. Set MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY and MINIO_BUCKET_NAME in .env');
  }

  if (!minioClient) {
    const endpoint = getEnv('MINIO_ENDPOINT'); // e.g. http://localhost:9000
    const useSSL   = endpoint.startsWith('https');
    const port     = parseInt(getEnv('MINIO_PORT') || (useSSL ? '443' : '9000'), 10);

    minioClient = new S3Client({
      endpoint,
      region: getEnv('MINIO_REGION') || 'us-east-1', // MinIO ignores region, but SDK requires it
      credentials: {
        accessKeyId:     getEnv('MINIO_ACCESS_KEY'),
        secretAccessKey: getEnv('MINIO_SECRET_KEY'),
      },
      // REQUIRED for MinIO — use path-style URLs: http://host:9000/bucket/key
      // instead of virtual-hosted style: http://bucket.host:9000/key
      forcePathStyle: true,
      tls: useSSL,
    });
  }

  return minioClient;
};

/** Ensure the bucket exists and is configured for public read */
export const initializeStorage = async () => {
  if (!isStorageConfigured) {
    console.warn('[Storage] Skipping initialization: MinIO not configured.');
    return;
  }
  
  const client = getMinioClient();
  const bucketName = getEnv('MINIO_BUCKET_NAME');

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`[Storage] Bucket "${bucketName}" verified.`);
  } catch (err) {
    // If bucket doesn't exist, create it
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      console.log(`[Storage] Bucket "${bucketName}" not found. Creating...`);
      try {
        await client.send(new CreateBucketCommand({ Bucket: bucketName }));
        
        // Apply public read policy so browser can access files directly
        const policy = {
          Version: "2012-10-17",
          Statement: [{
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
          }]
        };

        await client.send(new PutBucketPolicyCommand({
          Bucket: bucketName,
          Policy: JSON.stringify(policy)
        }));
        
        console.log(`[Storage] Bucket "${bucketName}" initialized with public policy.`);
      } catch (createErr) {
        console.error(`[Storage] Failed to create bucket "${bucketName}":`, createErr.message);
      }
    } else {
      console.error(`[Storage] Unexpected error checking bucket:`, err.message);
    }
  }
};

// ─── Key Builder ─────────────────────────────────────────────────────────────

const buildS3Key = ({ folder, originalName }) => {
  const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
  const ext = path.extname(originalName);
  const normalizedFolder = folder
    ? `${String(folder).replace(/^\/+|\/+$/g, '')}/`
    : 'uploads/';
  return `${normalizedFolder}${uniqueSuffix}${ext}`;
};

// ─── Public URL Builder ───────────────────────────────────────────────────────

/**
 * Build the public URL for a stored object.
 * Format: http(s)://<endpoint>/<bucket>/<key>
 */
const getS3PublicUrl = (key) => {
  const endpoint = getEnv('MINIO_ENDPOINT').replace(/\/$/, '');
  const bucket   = getEnv('MINIO_BUCKET_NAME');
  const encodedKey = encodeURI(key);
  return `${endpoint}/${bucket}/${encodedKey}`;
};

// ─── Read Object as Text (used by LegalAgreement) ────────────────────────────

const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end',   () => resolve(Buffer.concat(chunks).toString('utf8')));
  });

const getS3ObjectText = async (key) => {
  const client  = getMinioClient();
  const command = new GetObjectCommand({
    Bucket: getEnv('MINIO_BUCKET_NAME'),
    Key:    key,
  });
  const response = await client.send(command);
  if (!response.Body) return '';
  return streamToString(response.Body);
};

// ─── File Filter ─────────────────────────────────────────────────────────────

const fileFilter = (req, file, cb) => {
  if (!isStorageConfigured) {
    cb(new Error('MinIO storage is not configured. Check your .env file.'), false);
    return;
  }

  const allowedMimeTypes = [
    'image/', 'video/', 'audio/',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'application/vnd.ms-excel',
    'application/zip',
    'application/x-rar-compressed',
    'text/plain',
    'text/markdown',
    'text/csv',
  ];

  const isAllowed = allowedMimeTypes.some((type) => file.mimetype.startsWith(type));

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type (${file.mimetype}). This format is not supported.`), false);
  }
};

// ─── Multer Storage ───────────────────────────────────────────────────────────

// Ensure local uploads directory exists
const localUploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

const storage = isStorageConfigured
  ? multerS3({
    s3:     getMinioClient(),
    bucket: getEnv('MINIO_BUCKET_NAME'),
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const folder = req.s3Folder || req.query.folder;
      cb(null, buildS3Key({ folder, originalName: file.originalname }));
    },
  })
  : multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, localUploadsDir);
    },
    filename: (req, file, cb) => {
      const folder = req.s3Folder || req.query.folder || 'general';
      const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
      const ext = path.extname(file.originalname);
      // We'll store the relative path in the filename so the route can build the URL
      cb(null, `${folder}-${uniqueSuffix}${ext}`);
    },
  });

const s3Upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
});

// ─── Exports (kept backward-compatible with existing route files) ─────────────

export {
  s3Upload,
  isStorageConfigured as isS3Configured, // alias so existing imports don't break
  getS3ObjectText,
  getS3PublicUrl,
  buildS3Key,
};
