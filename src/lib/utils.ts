
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
}

export function getVideoId(url: string): string | null {
  if (!url) return null;
  
  // Handle youtu.be URLs
  const shortUrlRegex = /youtu\.be\/([a-zA-Z0-9_-]+)/;
  const shortMatch = url.match(shortUrlRegex);
  if (shortMatch) return shortMatch[1];
  
  // Handle youtube.com URLs
  const standardUrlRegex = /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/;
  const standardMatch = url.match(standardUrlRegex);
  if (standardMatch) return standardMatch[1];
  
  // Handle youtube.com/v/ URLs
  const vUrlRegex = /youtube\.com\/v\/([a-zA-Z0-9_-]+)/;
  const vMatch = url.match(vUrlRegex);
  if (vMatch) return vMatch[1];
  
  // Handle embed URLs
  const embedUrlRegex = /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/;
  const embedMatch = url.match(embedUrlRegex);
  if (embedMatch) return embedMatch[1];
  
  return null;
}

export function getThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
