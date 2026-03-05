import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { v4 as uuidv4 } from 'uuid';

const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT || 'stkvnx2h6p44qw4';
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'program-files';

function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }
  const url = `https://${storageAccountName}.blob.core.windows.net`;
  return new BlobServiceClient(url, new DefaultAzureCredential());
}

export async function uploadFileToBlob(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  container?: string
): Promise<{ url: string; blobName: string }> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(container || containerName);
  await containerClient.createIfNotExists({ access: 'blob' });

  const ext = originalName.split('.').pop() || 'bin';
  const blobName = `${uuidv4()}.${ext}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  return { url: blockBlobClient.url, blobName };
}

export async function deleteBlob(blobName: string): Promise<void> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}
