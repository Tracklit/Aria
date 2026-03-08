import { Directory, File, Paths } from 'expo-file-system';

const PROFILE_IMAGE_DIRECTORY_NAME = 'profile-cache';
const PROFILE_IMAGE_FILE_NAME = 'profile-image.jpg';
const PROFILE_IMAGE_TEMP_FILE_NAME = 'profile-image.next';

function getProfileImageDirectory(): Directory {
  return new Directory(Paths.document, PROFILE_IMAGE_DIRECTORY_NAME);
}

function getProfileImageFile(): File {
  return new File(getProfileImageDirectory(), PROFILE_IMAGE_FILE_NAME);
}

function getProfileImageTempFile(): File {
  return new File(getProfileImageDirectory(), PROFILE_IMAGE_TEMP_FILE_NAME);
}

function ensureProfileImageDirectory(): void {
  getProfileImageDirectory().create({ idempotent: true, intermediates: true });
}

function isRemoteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

/**
 * Returns true if the URL points to the backend blob-proxy endpoint,
 * which requires an Authorization header (unlike direct SAS URLs).
 */
function isProxyUri(uri: string): boolean {
  return uri.includes('/api/blob-proxy');
}

function normalizeLocalUri(uri: string): string {
  return uri.split(/[?#]/, 1)[0];
}

/**
 * Download a remote profile image and persist it locally.
 *
 * @param sourceUri  Remote or local URI of the image.
 * @param authToken  Optional JWT token. Required when the URI points at the
 *                   backend blob-proxy endpoint (which needs Authorization).
 */
export async function saveProfileImageLocally(
  sourceUri: string,
  authToken?: string | null,
): Promise<string> {
  if (!sourceUri) {
    throw new Error('Profile image source URI is required');
  }

  const targetFile = getProfileImageFile();
  if (normalizeLocalUri(sourceUri) === targetFile.uri) {
    return targetFile.uri;
  }

  ensureProfileImageDirectory();

  const tempFile = getProfileImageTempFile();
  if (tempFile.exists) {
    tempFile.delete();
  }

  if (isRemoteUri(sourceUri)) {
    // Proxy URLs require an auth token; SAS URLs do not.
    const headers: Record<string, string> = {};
    if (isProxyUri(sourceUri) && authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    await File.downloadFileAsync(sourceUri, tempFile, {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      idempotent: true,
    });
  } else {
    const sourceFile = new File(normalizeLocalUri(sourceUri));
    if (!sourceFile.exists) {
      throw new Error(`Local profile image not found: ${sourceUri}`);
    }
    sourceFile.copy(tempFile);
  }

  if (targetFile.exists) {
    targetFile.delete();
  }
  tempFile.move(targetFile);

  return targetFile.uri;
}

export async function getLocalProfileImageUri(): Promise<string | null> {
  try {
    const profileImageFile = getProfileImageFile();
    return profileImageFile.exists ? profileImageFile.uri : null;
  } catch (error) {
    console.error('[ProfileImageCache] Failed to read cached profile image:', error);
    return null;
  }
}

export async function clearLocalProfileImage(): Promise<void> {
  try {
    const profileImageFile = getProfileImageFile();
    const tempFile = getProfileImageTempFile();

    if (profileImageFile.exists) {
      profileImageFile.delete();
    }
    if (tempFile.exists) {
      tempFile.delete();
    }
  } catch (error) {
    console.error('[ProfileImageCache] Failed to clear cached profile image:', error);
  }
}
