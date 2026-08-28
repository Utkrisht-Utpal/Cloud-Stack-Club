/**
 * File Security & Magic Byte Signature Validation
 * Prevents Stored XSS & malicious file upload attacks.
 */

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * Checks file header magic bytes against legitimate image/PDF signatures.
 */
export const validateFileSignature = async (
  file: File
): Promise<{ isValid: boolean; error?: string }> => {
  // 1. Size Check
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: 'File size exceeds the 1 MB limit. Please upload a file under 1 MB.',
    };
  }

  // 2. MIME Type Check
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      error: 'Invalid file format. Only JPG, PNG, WebP, or PDF files are allowed.',
    };
  }

  // 3. Magic Bytes / Header Validation
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // JPEG: FF D8 FF
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

    // PNG: 89 50 4E 47 (0x89 'PNG')
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;

    // PDF: 25 50 44 46 ('%PDF')
    const isPdf =
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46;

    // WebP: 'RIFF' .... 'WEBP' (Bytes 0-3 = RIFF, Bytes 8-11 = WEBP)
    const isWebP =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;

    if (!isJpeg && !isPng && !isPdf && !isWebP) {
      return {
        isValid: false,
        error:
          'Security verification failed: File content does not match a valid image or PDF.',
      };
    }

    return { isValid: true };
  } catch (err) {
    return {
      isValid: false,
      error: 'Failed to inspect file integrity. Please try another file.',
    };
  }
};
