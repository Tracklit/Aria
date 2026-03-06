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
  'stkvnx2h6p44qw4';
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
      await containerClient.create({ access: 'blob' });
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
  } catch (e) {
    // Fallback: try connection string shared key
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (connectionString) {
      // Extract account name and key from connection string
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
            protocol: SASProtocol.Https,
          },
          sharedKey
        );
        return `${blobUrl}?${sas.toString()}`;
      }
    }
    console.warn('Failed to generate SAS URL, returning raw blob URL:', e);
    return blobUrl;
  }
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
