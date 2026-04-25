import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs';
import path from 'path';
import { ArtifactKind } from '@preview-qa/domain';

export interface UploadedArtifact {
  kind: ArtifactKind;
  blobUrl: string;
  filename: string;
  sizeBytes: number;
}

export interface UploaderConfig {
  connectionString: string;
  containerName: string;
  runId: string;
}

export async function uploadArtifact(
  config: UploaderConfig,
  localPath: string,
  kind: ArtifactKind,
): Promise<UploadedArtifact> {
  const client = BlobServiceClient.fromConnectionString(config.connectionString);
  const container = client.getContainerClient(config.containerName);

  const filename = path.basename(localPath);
  const blobName = `runs/${config.runId}/${filename}`;
  const blockBlob = container.getBlockBlobClient(blobName);

  const stat = fs.statSync(localPath);
  await blockBlob.uploadFile(localPath, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(filename) },
  });

  return {
    kind,
    blobUrl: blockBlob.url,
    filename,
    sizeBytes: stat.size,
  };
}

export async function uploadArtifacts(
  config: UploaderConfig,
  artifacts: Array<{ localPath: string; kind: ArtifactKind }>,
): Promise<UploadedArtifact[]> {
  return Promise.all(
    artifacts.map(({ localPath, kind }) => uploadArtifact(config, localPath, kind)),
  );
}

function contentTypeFor(filename: string): string {
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.zip')) return 'application/zip';
  return 'application/octet-stream';
}
