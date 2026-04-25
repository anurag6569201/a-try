import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArtifactKind } from '@preview-qa/domain';

const mocks = vi.hoisted(() => {
  const mockUploadFile = vi.fn().mockResolvedValue(undefined);
  const mockBlockBlobClient = {
    uploadFile: mockUploadFile,
    url: 'https://storage.blob.core.windows.net/artifacts/runs/run-1/screenshot.png',
  };
  const mockGetBlockBlobClient = vi.fn().mockReturnValue(mockBlockBlobClient);
  const mockContainerClient = { getBlockBlobClient: mockGetBlockBlobClient };
  const mockGetContainerClient = vi.fn().mockReturnValue(mockContainerClient);
  const mockBlobServiceClient = { getContainerClient: mockGetContainerClient };

  return {
    mockUploadFile,
    mockBlockBlobClient,
    mockGetBlockBlobClient,
    mockContainerClient,
    mockGetContainerClient,
    mockBlobServiceClient,
  };
});

vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn().mockReturnValue(mocks.mockBlobServiceClient),
  },
}));

vi.mock('fs', () => ({
  default: {
    statSync: vi.fn().mockReturnValue({ size: 12345 }),
  },
  statSync: vi.fn().mockReturnValue({ size: 12345 }),
}));

import { uploadArtifact, uploadArtifacts } from '../uploader.js';

const config = {
  connectionString: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key=;EndpointSuffix=core.windows.net',
  containerName: 'artifacts',
  runId: 'run-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockUploadFile.mockResolvedValue(undefined);
  mocks.mockGetBlockBlobClient.mockReturnValue(mocks.mockBlockBlobClient);
  mocks.mockGetContainerClient.mockReturnValue(mocks.mockContainerClient);
});

describe('uploadArtifact', () => {
  it('uploads a file and returns artifact metadata', async () => {
    const result = await uploadArtifact(config, '/tmp/run-1/screenshot.png', ArtifactKind.Screenshot);

    expect(mocks.mockGetBlockBlobClient).toHaveBeenCalledWith('runs/run-1/screenshot.png');
    expect(mocks.mockUploadFile).toHaveBeenCalledWith('/tmp/run-1/screenshot.png', {
      blobHTTPHeaders: { blobContentType: 'image/png' },
    });
    expect(result.kind).toBe(ArtifactKind.Screenshot);
    expect(result.filename).toBe('screenshot.png');
    expect(result.sizeBytes).toBe(12345);
    expect(result.blobUrl).toContain('screenshot.png');
  });

  it('uses application/zip content type for trace files', async () => {
    await uploadArtifact(config, '/tmp/run-1/trace.zip', ArtifactKind.Trace);

    expect(mocks.mockUploadFile).toHaveBeenCalledWith('/tmp/run-1/trace.zip', {
      blobHTTPHeaders: { blobContentType: 'application/zip' },
    });
  });
});

describe('uploadArtifacts', () => {
  it('uploads multiple artifacts concurrently', async () => {
    const results = await uploadArtifacts(config, [
      { localPath: '/tmp/run-1/screenshot.png', kind: ArtifactKind.Screenshot },
      { localPath: '/tmp/run-1/trace.zip', kind: ArtifactKind.Trace },
    ]);

    expect(results).toHaveLength(2);
    expect(mocks.mockUploadFile).toHaveBeenCalledTimes(2);
  });
});
