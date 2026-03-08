import {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
  SASProtocol,
} from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { v4 as uuidv4 } from 'uuid';

const storageAccountName =
  process.env.AZURE_STORAGE_ACCOUNT ||
  process.env.AZURE_STORAGE_ACCOUNT_NAME ||
  'stariaprodhw63c3';
const containerName =
  process.env.AZURE_STORAGE_CONTAINER ||
  process.env.AZURE_STORAGE_CONTAINER_NAME ||
  'program-files';

function getManagedIdentityBlobServiceClient(): BlobServiceClient {
  const url = `https://${storageAccountName}.blob.core.windows.net`;
  return new BlobServiceClient(url, new DefaultAzureCredential());
}

function getConnectionStringBlobServiceClient(): BlobServiceClient | null {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  return connectionString ? BlobServiceClient.fromConnectionString(connectionString) : null;
}

function isLocalStorageConnectionString(connectionString: string): boolean {
  const normalized = connectionString.toLowerCase();
  return (
    normalized.includes('usedevelopmentstorage=true') ||
    normalized.includes('blobendpoint=http://127.0.0.1') ||
    normalized.includes('blobendpoint=http://localhost')
  );
}

function getBlobServiceClientCandidates(): BlobServiceClient[] {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const connectionClient = getConnectionStringBlobServiceClient();
  const managedClient = getManagedIdentityBlobServiceClient();

  if (connectionString && isLocalStorageConnectionString(connectionString) && connectionClient) {
    // Local emulators (e.g. Azurite) require key/connection-string auth.
    return [connectionClient, managedClient];
  }

  // Default in cloud: identity first, connection string as fallback.
  return connectionClient ? [managedClient, connectionClient] : [managedClient];
}

function getErrorCode(error: any): string | undefined {
  return error?.code || error?.details?.errorCode;
}

function isAuthFailure(error: any): boolean {
  const code = getErrorCode(error);
  const message = String(error?.message || '').toLowerCase();
  return (
    code === 'AuthorizationFailure' ||
    code === 'AuthenticationFailed' ||
    code === 'KeyBasedAuthenticationNotPermitted' ||
    message.includes('credential') ||
    message.includes('managed identity') ||
    message.includes('defaultazurecredential')
  );
}

export async function uploadFileToBlob(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  container?: string
): Promise<{ url: string; blobName: string }> {
  const resolvedContainerName = container || containerName;
  const ext = originalName.split('.').pop() || 'bin';
  const blobName = `${uuidv4()}.${ext}`;

  const attemptUpload = async (blobServiceClient: BlobServiceClient): Promise<{ url: string; blobName: string }> => {
    const containerClient = blobServiceClient.getContainerClient(resolvedContainerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    try {
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: mimeType },
      });
    } catch (error: any) {
      const errorCode = error?.code || error?.details?.errorCode;
      if (errorCode !== 'ContainerNotFound') {
        throw error;
      }

      // Some identities can upload blobs but cannot manage containers.
      // Only attempt container creation when Azure explicitly reports it missing.
      await containerClient.create();
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: mimeType },
      });
    }

    return { url: blockBlobClient.url, blobName };
  };

  const clients = getBlobServiceClientCandidates();
  let lastError: any;

  for (let i = 0; i < clients.length; i += 1) {
    try {
      return await attemptUpload(clients[i]);
    } catch (error: any) {
      lastError = error;
      const hasRetryCandidate = i < clients.length - 1;
      if (!hasRetryCandidate || !isAuthFailure(error)) {
        throw error;
      }
      console.warn(`Storage auth failed (${getErrorCode(error) || error?.name || 'unknown'}). Retrying with fallback credentials.`);
    }
  }

  throw lastError;
}

/**
 * Generate a read-only SAS URL for a blob. Uses user delegation key (managed identity).
 * Falls back to connection string shared key if delegation fails.
 * SAS is valid for 168 hours (7 days).
 */
export async function generateBlobSasUrl(
  blobUrl: string,
  expiresInHours = 168
): Promise<string> {
  // Parse the blob URL to extract container and blob name
  // Format: https://<account>.blob.core.windows.net/<container>/<blobName>
  const url = new URL(blobUrl);
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length < 2) return blobUrl;

  const container = pathParts[0];
  const blobName = pathParts.slice(1).join('/');
  const account = url.hostname.split('.')[0];

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + expiresInHours * 60 * 60 * 1000);

  // Try user delegation key first (managed identity)
  try {
    const blobServiceClient = getManagedIdentityBlobServiceClient();
    const delegationKey = await blobServiceClient.getUserDelegationKey(startsOn, expiresOn);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        startsOn,
        expiresOn,
        protocol: SASProtocol.Https,
      },
      delegationKey,
      account
    );
    return `${blobUrl}?${sas.toString()}`;
  } catch (delegationError: any) {
    console.warn('User delegation key SAS failed:', {
      code: delegationError?.code,
      message: delegationError?.message?.substring(0, 200),
    });

    // Fallback: use connection string shared key for SAS generation
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (connectionString) {
      const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
      const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);
      if (accountNameMatch && accountKeyMatch) {
        const sharedKey = new StorageSharedKeyCredential(accountNameMatch[1], accountKeyMatch[1]);
        const sas = generateBlobSASQueryParameters(
          {
            containerName: container,
            blobName,
            permissions: BlobSASPermissions.parse('r'),
            startsOn,
            expiresOn,
            protocol: SASProtocol.HttpsAndHttp,
          },
          sharedKey
        );
        return `${blobUrl}?${sas.toString()}`;
      }
    }

    // Fallback: return a proxy URL that serves the blob through the backend
    const backendBaseUrl = process.env.BACKEND_BASE_URL || '';
    if (backendBaseUrl) {
      return `${backendBaseUrl}/api/blob-proxy?url=${encodeURIComponent(blobUrl)}`;
    }
    console.warn('Cannot generate SAS URL and no BACKEND_BASE_URL set, returning raw blob URL for:', blobName);
    return blobUrl;
  }
}

/**
 * Read a blob's content using managed identity (data plane).
 * Returns the buffer and content type for proxying through the backend.
 */
export async function readBlobAsBuffer(
  blobUrl: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const url = new URL(blobUrl);
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length < 2) return null;

  const container = pathParts[0];
  const blob = pathParts.slice(1).join('/');

  const clients = getBlobServiceClientCandidates();
  let lastError: any;

  for (let i = 0; i < clients.length; i += 1) {
    try {
      const containerClient = clients[i].getContainerClient(container);
      const blobClient = containerClient.getBlobClient(blob);
      const downloadResponse = await blobClient.download(0);
      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody as NodeJS.ReadableStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return {
        buffer: Buffer.concat(chunks),
        contentType: downloadResponse.contentType || 'application/octet-stream',
      };
    } catch (error: any) {
      lastError = error;
      const hasRetryCandidate = i < clients.length - 1;
      if (!hasRetryCandidate || !isAuthFailure(error)) {
        console.warn('readBlobAsBuffer failed:', error?.message?.substring(0, 200));
        return null;
      }
    }
  }

  console.warn('readBlobAsBuffer all candidates failed:', lastError?.message?.substring(0, 200));
  return null;
}

export async function deleteBlob(blobName: string): Promise<void> {
  const tryDelete = async (blobServiceClient: BlobServiceClient): Promise<void> => {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
  };

  const clients = getBlobServiceClientCandidates();
  let lastError: any;

  for (let i = 0; i < clients.length; i += 1) {
    try {
      await tryDelete(clients[i]);
      return;
    } catch (error: any) {
      lastError = error;
      const hasRetryCandidate = i < clients.length - 1;
      if (!hasRetryCandidate || !isAuthFailure(error)) {
        throw error;
      }
      console.warn(`Storage auth failed (${getErrorCode(error) || error?.name || 'unknown'}). Retrying delete with fallback credentials.`);
    }
  }

  throw lastError;
}
