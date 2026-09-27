
export type ImageQuality = 'low' | 'high';

export function optimizeSceneUrl(url: string, quality: ImageQuality = 'low'): string {
  if (!url) return url;

  /* Cloudinary */
  if (url.includes('res.cloudinary.com')) {
    // Remove existing transformation block kung meron
    const cleaned = url.replace(/\/upload\/[^/]*?\//, '/upload/');
    const transform =
      quality === 'low'
        ? 'q_auto:low,w_1920,f_auto,dpr_auto'
        : 'q_auto:good,w_4096,f_auto';
    return cleaned.replace('/upload/', `/upload/${transform}/`);
  }

  /* Imgix */
  if (url.includes('imgix.net')) {
    const base = url.split('?')[0];
    const params =
      quality === 'low'
        ? 'w=1920&q=50&auto=format,compress'
        : 'w=4096&q=80&auto=format,compress';
    return `${base}?${params}`;
  }

  /* Bunny CDN (bunnycdn.com or *.b-cdn.net) */
  if (url.includes('b-cdn.net') || url.includes('bunnycdn.com')) {
    const sep = url.includes('?') ? '&' : '?';
    const params =
      quality === 'low'
        ? 'width=1920&quality=55&format=webp'
        : 'width=4096&quality=80&format=webp';
    return `${url}${sep}${params}`;
  }

  /* Cloudflare Images (imagedelivery.net) — variant approach */
  if (url.includes('imagedelivery.net')) {
    // Variant names: 'public' / 'thumbnail' / 'public-low'
    const variant = quality === 'low' ? 'public-low' : 'public';
    return url.replace(/\/[^/]+$/, `/${variant}`);
  }

  /* Fallback — hindi supported ang URL transform */
  return url;
}