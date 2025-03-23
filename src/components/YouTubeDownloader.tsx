
import { useState } from "react";
import { Download, Loader, Check, Server } from "lucide-react";
import { cn, isValidYouTubeUrl, getVideoId, getThumbnailUrl, delay } from "@/lib/utils";
import { toast } from "sonner";
import { downloadYouTubeVideo } from "@/services/youtubeService";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type VideoQuality = "360p" | "720p" | "1080p" | "4K";

interface DownloadOptions {
  quality: VideoQuality;
  includeSubtitles: boolean;
  includeThumbnail: boolean;
}

export function YouTubeDownloader() {
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isUrlValid, setIsUrlValid] = useState(false);
  const [options, setOptions] = useState<DownloadOptions>({
    quality: "720p",
    includeSubtitles: false,
    includeThumbnail: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    const valid = isValidYouTubeUrl(value);
    setIsUrlValid(valid);
    
    if (valid) {
      const id = getVideoId(value);
      setVideoId(id);
      if (id) {
        setThumbnailUrl(getThumbnailUrl(id));
      }
    } else {
      setVideoId(null);
      setThumbnailUrl("");
    }
  };
  
  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOptions({
      ...options,
      quality: e.target.value as VideoQuality,
    });
  };
  
  const toggleSubtitles = () => {
    setOptions({
      ...options,
      includeSubtitles: !options.includeSubtitles,
    });
  };
  
  const toggleThumbnail = () => {
    setOptions({
      ...options,
      includeThumbnail: !options.includeThumbnail,
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isUrlValid || !videoId) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    
    setIsLoading(true);
    setIsDownloading(true);
    setDownloadProgress(10);
    
    try {
      toast.info("Preparing download...", {
        description: `Preparing video in ${options.quality} quality using yt-dlp`,
      });
      
      // Brief delay to show preparing toast
      await delay(500);
      setDownloadProgress(30);
      
      // Call the actual download service
      const result = await downloadYouTubeVideo({
        videoId,
        quality: options.quality,
        includeSubtitles: options.includeSubtitles,
        includeThumbnail: options.includeThumbnail
      });
      
      if (result.success) {
        setDownloadProgress(100);
        toast.success("Download successful", {
          description: `File: ${result.filename || "video.mp4"} (${result.fileSize ? formatFileSize(result.fileSize) : "Unknown size"})`,
        });
      } else {
        throw new Error(result.error || "Download failed");
      }
      
    } catch (error) {
      toast.error("Failed to download video", {
        description: error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      // Brief delay before resetting UI
      await delay(1000);
      setIsLoading(false);
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };
  
  // Checkbox component for better reusability
  const Checkbox = ({ 
    id, 
    label, 
    checked, 
    onChange 
  }: { 
    id: string; 
    label: string; 
    checked: boolean; 
    onChange: () => void;
  }) => (
    <label 
      htmlFor={id} 
      className="checkbox-container flex items-center space-x-2 cursor-pointer"
    >
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div className={cn(
          "checkmark w-5 h-5 rounded border transition-all duration-200",
          checked ? "border-primary" : "border-input",
          "flex items-center justify-center"
        )}>
          {checked && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>
      <span className="text-sm font-medium">{label}</span>
    </label>
  );

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight animate-fade-in">
          QuickTube Downloader
        </h1>
        <p className="mt-2 text-muted-foreground animate-fade-in delay-75">
          Download YouTube videos with yt-dlp & ffmpeg
        </p>
      </div>
      
      <Alert className="mb-6">
        <Server className="h-4 w-4" />
        <AlertTitle>Supabase Integration</AlertTitle>
        <AlertDescription>
          This app uses a Supabase Edge Function with yt-dlp and ffmpeg to download videos.
        </AlertDescription>
      </Alert>
      
      <form onSubmit={handleSubmit} className="space-y-6 animate-slide-in">
        <div className="space-y-2">
          <label htmlFor="youtube-url" className="text-sm font-medium">
            YouTube URL
          </label>
          <input
            id="youtube-url"
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://www.youtube.com/watch?v=..."
            className={cn(
              "youtube-input w-full px-3 py-2 rounded-md border bg-background",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              "transition-all duration-200",
              isUrlValid && url 
                ? "border-green-500 focus:border-green-500" 
                : "border-input focus:border-primary"
            )}
            required
          />
        </div>
        
        {thumbnailUrl && options.includeThumbnail && (
          <div className="relative overflow-hidden rounded-md aspect-video animate-scale-in">
            <div className="absolute inset-0 bg-black/20 animate-pulse-slow"></div>
            <img 
              src={thumbnailUrl} 
              alt="Video thumbnail" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // If high quality thumbnail fails, try default
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
              }}
            />
          </div>
        )}
        
        {isDownloading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Downloading...</span>
              <span>{downloadProgress}%</span>
            </div>
            <Progress value={downloadProgress} className="h-2" />
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="quality" className="text-sm font-medium">
            Video Quality
          </label>
          <select
            id="quality"
            value={options.quality}
            onChange={handleQualityChange}
            className={cn(
              "w-full px-3 py-2 rounded-md border border-input bg-background",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              "transition-all duration-200"
            )}
          >
            <option value="360p">360p</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
            <option value="4K">4K</option>
          </select>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <Checkbox
            id="subtitles"
            label="Include subtitles"
            checked={options.includeSubtitles}
            onChange={toggleSubtitles}
          />
          
          <Checkbox
            id="thumbnail"
            label="Include thumbnail"
            checked={options.includeThumbnail}
            onChange={toggleThumbnail}
          />
        </div>
        
        <button
          type="submit"
          disabled={!isUrlValid || isLoading}
          className={cn(
            "w-full py-2.5 px-4 rounded-md font-medium flex items-center justify-center",
            "transition-all duration-200 transform active:scale-[0.98]",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            isUrlValid && !isLoading
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin-slow" />
              Processing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download Video
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
