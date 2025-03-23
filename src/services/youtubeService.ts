
import { formatFileSize } from "@/lib/utils";

interface DownloadOptions {
  videoId: string;
  quality: string;
  includeSubtitles: boolean;
  includeThumbnail: boolean;
}

interface DownloadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export const downloadYouTubeVideo = async (options: DownloadOptions): Promise<DownloadResponse> => {
  try {
    console.log("Preparing download with options:", options);
    
    // Create a direct download URL for the video
    // This approach uses a different service that allows direct downloads
    const format = getFormatFromQuality(options.quality);
    
    // Using the y2mate service which provides direct download links
    const videoUrl = `https://www.youtube.com/watch?v=${options.videoId}`;
    const downloadUrl = `https://api.vevioz.com/api/button/mp4/${options.videoId}`;
    
    console.log("Generated download URL:", downloadUrl);
    
    // Create an invisible anchor element to trigger the download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `youtube_video_${options.videoId}.mp4`);
    link.setAttribute('target', '_blank');
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Trigger the download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    
    return {
      success: true,
      url: downloadUrl
    };
  } catch (error) {
    console.error("Error downloading video:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to download video"
    };
  }
};

// Helper function to map our quality options to the format codes
const getFormatFromQuality = (quality: string): string => {
  switch (quality) {
    case "360p":
      return "360";
    case "720p":
      return "720";
    case "1080p":
      return "1080";
    case "4K":
      return "4k";
    default:
      return "720";
  }
};

// This function could be used to check download progress in a real implementation
export const checkDownloadProgress = async (downloadId: string): Promise<number> => {
  // In a real implementation, this would query your backend for progress
  // For demonstration, we'll return a fixed value
  return 100;
};
