import 'reflect-metadata';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { AppDataSource } from '../data-source';
import { PrivatizeUploads, UploadMigrationStorage } from './privatize-uploads';

function RequireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function BuildStorage(): UploadMigrationStorage {
  const publicBucket = RequireEnv('STORAGE_BUCKET');
  const privateBucket = RequireEnv('STORAGE_PRIVATE_BUCKET');
  const client = new S3Client({
    endpoint: RequireEnv('STORAGE_ENDPOINT'),
    region: process.env.STORAGE_REGION ?? 'auto',
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== 'false',
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: RequireEnv('STORAGE_ACCESS_KEY'),
      secretAccessKey: RequireEnv('STORAGE_SECRET_KEY'),
    },
  });

  return {
    CopyToPrivate: async (key) => {
      await client.send(
        new CopyObjectCommand({
          Bucket: privateBucket,
          Key: key,
          CopySource: `${publicBucket}/${key}`,
        }),
      );
    },
    DeletePublic: async (key) => {
      await client.send(
        new DeleteObjectCommand({ Bucket: publicBucket, Key: key }),
      );
    },
  };
}

async function Run(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const publicPrefix = `${RequireEnv('STORAGE_PUBLIC_URL')}/`;

  await AppDataSource.initialize();
  const summary = await new PrivatizeUploads(
    AppDataSource,
    BuildStorage(),
    publicPrefix,
    dryRun,
  ).Run();
  await AppDataSource.destroy();

  console.log(dryRun ? 'Dry run, nothing changed.' : 'Migration finished.');
  console.log(`Rows: ${summary.rows}, objects: ${summary.objects}`);
  if (summary.leftInPublicBucket.length > 0) {
    console.error(
      `These objects are STILL in the public bucket, delete them by hand:\n${summary.leftInPublicBucket.join('\n')}`,
    );
    process.exitCode = 1;
  }
}

Run()
  .then(() => {
    process.exit(process.exitCode ?? 0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
