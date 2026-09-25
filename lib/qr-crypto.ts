const STORAGE_PREFIX = "sibantu_qr_key_";
function uint8ArrayToBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToUint8Array(base64: string) {
  const normalized = base64
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    normalized +
    "=".repeat((4 - (normalized.length % 4)) % 4);

  const binary = atob(padded);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/**
 * =========================
 * Event QR key
 * =========================
 */

function getStorageKey(eventId: string) {
  return `${STORAGE_PREFIX}${eventId}`;
}

export async function importEventQRKey(
  eventId: string,
  base64Key: string
) {
  localStorage.setItem(
    getStorageKey(eventId),
    base64Key
  );

  const normalized = base64Key
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    normalized +
    "=".repeat((4 - (normalized.length % 4)) % 4);

  const binary = atob(padded);

  const rawKey = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    rawKey[i] = binary.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    "raw",
    rawKey,
    {
      name: "AES-GCM",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function getEventQRKey(
  eventId: string
) {
  let storedKey = typeof window !== "undefined"
    ? localStorage.getItem(getStorageKey(eventId))
    : null;

  if (!storedKey && typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/events/${eventId}/qr-key`);
      if (res.ok) {
        const data = (await res.json()) as { success?: boolean; key?: string };
        if (data.success && typeof data.key === "string") {
          storedKey = data.key;
          localStorage.setItem(getStorageKey(eventId), data.key);
        }
      }
    } catch {
      // Offline fallback
    }
  }

  if (!storedKey) {
    throw new Error(
      "QR key untuk event ini belum tersedia di perangkat. Hubungkan ke jaringan untuk sinkronisasi pertama kali."
    );
  }

  const normalized = storedKey
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    normalized +
    "=".repeat((4 - (normalized.length % 4)) % 4);

  const binary = atob(padded);

  const rawKey = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    rawKey[i] = binary.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    "raw",
    rawKey,
    {
      name: "AES-GCM",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * =========================
 * Compression
 * =========================
 */

async function compressData(data: Uint8Array) {
  if (typeof CompressionStream === "undefined") {
    throw new Error(
      "Browser tidak mendukung kompresi QR."
    );
  }

  const buffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  ) as ArrayBuffer;

  const stream = new Blob([buffer])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));

  const result =
    await new Response(stream).arrayBuffer();

  return new Uint8Array(result);
}

async function decompressData(data: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error(
      "Browser tidak mendukung dekompresi QR."
    );
  }

  const buffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  ) as ArrayBuffer;

  const stream = new Blob([buffer])
    .stream()
    .pipeThrough(
      new DecompressionStream("gzip")
    );

  const result =
    await new Response(stream).arrayBuffer();

  return new Uint8Array(result);
}

/**
 * =========================
 * Encrypt QR payload
 *
 * Format:
 *
 * SIB1.<event_id>.<iv+ciphertext>
 *
 * Manifest dikompresi terlebih dahulu.
 * =========================
 */

export async function encryptQRPayload(
  eventId: string,
  payload: unknown
) {
  const key = await getEventQRKey(eventId);

  /**
   * JSON manifest
   */
  const json = JSON.stringify(payload);

  const encoded = new TextEncoder().encode(json);

  /**
   * Compress manifest sebelum encryption.
   */
  const compressed = await compressData(encoded);

  /**
   * AES-GCM IV
   */
  const iv = crypto.getRandomValues(
    new Uint8Array(12)
  );

  /**
   * Encrypt compressed payload.
   */
  const encryptedBuffer =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      compressed
    );

  const encrypted = new Uint8Array(
    encryptedBuffer
  );

  /**
   * Gabungkan:
   *
   * IV (12 bytes)
   * +
   * encrypted data
   *
   * sehingga tidak perlu JSON wrapper.
   */
  const combined = new Uint8Array(
    iv.length + encrypted.length
  );

  combined.set(iv, 0);
  combined.set(encrypted, iv.length);

  /**
   * Format QR:
   *
   * SIB1.EVENT_ID.BASE64URL
   */
  return [
    "SIB1",
    String(eventId),
    uint8ArrayToBase64Url(combined),
  ].join(".");
}

/**
 * =========================
 * Decrypt QR payload
 * =========================
 */

export async function decryptQRPayload(
  encryptedPayload: string
) {
  /**
   * Split:
   *
   * SIB1
   * event_id
   * encrypted data
   */
  const parts = encryptedPayload.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Format QR tidak valid."
    );
  }

  const [version, eventId, encodedData] =
    parts;

  if (version !== "SIB1") {
    throw new Error(
      "Versi QR tidak didukung."
    );
  }

  if (!eventId) {
    throw new Error(
      "QR tidak memiliki event_id."
    );
  }

  if (!encodedData) {
    throw new Error(
      "QR tidak memiliki data terenkripsi."
    );
  }

  /**
   * Ambil event key.
   */
  const key = await getEventQRKey(
    String(eventId)
  );

  /**
   * Decode Base64URL.
   */
  const combined =
    base64UrlToUint8Array(encodedData);

  /**
   * Minimal:
   *
   * 12 bytes IV
   * +
   * encrypted data
   */
  if (combined.length <= 12) {
    throw new Error(
      "Data QR terlalu pendek."
    );
  }

  /**
   * Pisahkan IV dan ciphertext.
   */
  const iv = combined.slice(0, 12);

  const encrypted = combined.slice(12);

  /**
   * Decrypt.
   */
  const decryptedBuffer =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encrypted
    );

  const decrypted = new Uint8Array(
    decryptedBuffer
  );

  /**
   * Decompress.
   */
  const decompressed =
    await decompressData(decrypted);

  /**
   * JSON kembali.
   */
  const decoded = new TextDecoder().decode(
    decompressed
  );

  const payload = JSON.parse(decoded);

  /**
   * Validasi tambahan.
   *
   * Pastikan manifest memiliki event
   * yang sama dengan event di QR.
   */
  const payloadEventId = String(
    payload?.shipment?.event_id ??
    payload?.event_id ??
    ""
  );

  if (
    payloadEventId &&
    payloadEventId !== String(eventId)
  ) {
    throw new Error(
      "Event pada QR tidak sesuai dengan manifest."
    );
  }

  return payload;
}