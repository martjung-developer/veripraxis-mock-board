// lib/utils/study-materials/youtube.ts

/**
 * Extracts the 11-character YouTube video ID from any supported URL format:
 *   - https://www.youtube.com/watch?v=XXXXXXXXXXX
 *   - https://youtu.be/XXXXXXXXXXX
 *   - https://www.youtube.com/embed/XXXXXXXXXXX
 *   - https://www.youtube.com/shorts/XXXXXXXXXXX
 *
 * Returns null if no valid ID is found.
 */
export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  )
  return match ? match[1] : null
}

/**
 * Returns a YouTube embed URL for use inside an <iframe>.
 * Returns null if the source URL is invalid.
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url)
  return id ? `https://www.youtube.com/embed/${id}` : null
}