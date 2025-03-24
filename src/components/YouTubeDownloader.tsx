import { useState, useEffect } from "react";
import { Download, Loader, Check, ArrowDown } from "lucide-react";
import { cn, isValidYouTubeUrl, getVideoId, getThumbnailUrl, delay } from "@/lib/utils";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

type VideoQuality = string;

interface VideoFormat {
  quality: string;
  label: string;
  format_id: string;
}

interface DownloadOptions {
  quality: string;
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
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string | null>(null);
  const [downloadFileSize, setDownloadFileSize] = useState<number | null>(null);
  const [downloadStage, setDownloadStage] = useState<"idle" | "fetching" | "processing" | "ready">("idle");
  const [availableQualities, setAvailableQualities] = useState<VideoFormat[]>([]);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  
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
        fetchVideoInfo(id);
      }
    } else {
      setVideoId(null);
      setThumbnailUrl("");
      setAvailableQualities([]);
      setVideoTitle(null);
    }
    
    // Reset download state when URL changes
    setDownloadUrl(null);
    setDownloadStage("idle");
    setDownloadProgress(0);
  };
  
  const fetchVideoInfo = async (videoId: string) => {
    try {
      // In a real app, this would be an API call to get video formats
      // For now, we'll simulate it with a delay and more realistic qualities
      setIsLoading(true);
      await delay(700);
      
      // Simulate getting video title and formats
      const mockVideoTitle = `Video ${videoId}`;
      setVideoTitle(mockVideoTitle);
      
      // Generate more comprehensive quality options to match YouTube
      // This is a simulation - in a real app this would come from an API
      const formats = [
        { quality: "144p", label: "144p", format_id: "160+139" },
        { quality: "240p", label: "240p", format_id: "133+139" },
        { quality: "360p", label: "360p", format_id: "18" },
        { quality: "480p", label: "480p", format_id: "135+139" },
        { quality: "720p", label: "720p (HD)", format_id: "22" },
        { quality: "1080p", label: "1080p (Full HD)", format_id: "137+140" },
        { quality: "1440p", label: "1440p (2K)", format_id: "271+140" },
        { quality: "2160p", label: "2160p (4K)", format_id: "313+140" }
      ];
      
      // Simulate that some videos don't have all formats
      // We'll randomly exclude some formats, but always keep at least 360p and 720p
      const randomExcludeCount = Math.floor(Math.random() * 3); // Exclude 0-2 formats
      const excludeIndices = new Set<number>();
      
      // Don't exclude 360p (index 2) or 720p (index 4)
      while (excludeIndices.size < randomExcludeCount) {
        const index = Math.floor(Math.random() * formats.length);
        if (index !== 2 && index !== 4) {
          excludeIndices.add(index);
        }
      }
      
      const availableFormats = formats.filter((_, index) => !excludeIndices.has(index));
      setAvailableQualities(availableFormats);
      
      // Select the highest quality available by default
      if (availableFormats.length > 0) {
        setOptions(prev => ({
          ...prev,
          quality: availableFormats[availableFormats.length - 1].quality
        }));
      }
      
    } catch (error) {
      console.error("Error fetching video info:", error);
      toast.error("Failed to fetch video information");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOptions({
      ...options,
      quality: e.target.value,
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
  
  const handleFetchVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isUrlValid || !videoId) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    
    setIsLoading(true);
    setIsDownloading(true);
    setDownloadStage("fetching");
    setDownloadProgress(10);
    
    try {
      // First stage - fetching
      toast.info("Fetching video...", {
        description: `Getting video in ${options.quality} quality`,
      });
      
      await delay(500);
      setDownloadProgress(30);
      setDownloadStage("processing");
      
      // Second stage - processing
      toast.info("Processing video...", {
        description: "Converting format and preparing download",
      });
      
      await delay(500);
      setDownloadProgress(60);
      
      // Mock successful download
      await delay(700);
      setDownloadProgress(100);
      setDownloadStage("ready");
      setDownloadUrl("https://example.com/download/video.mp4");
      setDownloadFilename(`youtube_${videoId}_${options.quality}.mp4`);
      setDownloadFileSize(Math.floor(Math.random() * 100000000) + 10000000);
      
      toast.success("Video ready to download", {
        description: `File: ${downloadFilename || "video.mp4"}`,
      });
      
    } catch (error) {
      toast.error("Failed to fetch video", {
        description: error instanceof Error ? error.message : "Please try again later",
      });
      setDownloadStage("idle");
      setDownloadProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    
    // Create an invisible anchor element to trigger the download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', downloadFilename || `youtube_video.mp4`);
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Trigger the download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    
    toast.success("Download started", {
      description: "Your video download has started",
    });
  };
  
  const resetDownload = () => {
    setDownloadUrl(null);
    setDownloadStage("idle");
    setDownloadProgress(0);
    setIsDownloading(false);
  };
  
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
          checked ? "bg-red-600 border-red-600" : "border-input",
          "flex items-center justify-center"
        )}>
          {checked && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>
      <span className="text-sm font-medium">{label}</span>
    </label>
  );

  const StageProgressIndicator = () => {
    let statusText = "";
    let statusColor = "";
    
    switch (downloadStage) {
      case "fetching":
        statusText = "Fetching video...";
        statusColor = "text-blue-500";
        break;
      case "processing":
        statusText = "Processing video...";
        statusColor = "text-amber-500";
        break;
      case "ready":
        statusText = "Ready to download";
        statusColor = "text-green-500";
        break;
      default:
        return null;
    }
    
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex justify-between items-center text-sm">
          <span className={cn("font-medium", statusColor)}>{statusText}</span>
          <span>{downloadProgress}%</span>
        </div>
        <Progress value={downloadProgress} className="h-2" indicatorClassName="bg-red-600" />
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight animate-fade-in">
          YouTube Downloader
        </h1>
        <p className="mt-2 text-muted-foreground animate-fade-in delay-75">
          Download YouTube videos in your favorite format
        </p>
      </div>
      
      <form onSubmit={handleFetchVideo} className="space-y-6 animate-slide-in">
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
              "focus:outline-none focus:ring-2 focus:ring-red-500/50",
              "transition-all duration-200",
              isUrlValid && url 
                ? "border-green-500 focus:border-green-500" 
                : "border-input focus:border-red-500"
            )}
            required
          />
        </div>
        
        {videoTitle && (
          <div className="text-sm font-medium animate-fade-in">
            {videoTitle}
          </div>
        )}
        
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
        
        {downloadStage !== "idle" && <StageProgressIndicator />}
        
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
              "focus:outline-none focus:ring-2 focus:ring-red-500/50",
              "transition-all duration-200"
            )}
            disabled={downloadStage !== "idle" || availableQualities.length === 0}
          >
            {availableQualities.map((format) => (
              <option key={format.quality} value={format.quality}>
                {format.label}
              </option>
            ))}
          </select>
          {isLoading && availableQualities.length === 0 && (
            <p className="text-xs text-muted-foreground animate-pulse">Loading available formats...</p>
          )}
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
        
        {downloadStage === "ready" ? (
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="default"
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleDownload}
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              Download Video
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetDownload}
            >
              Try Another
            </Button>
          </div>
        ) : (
          <Button
            type="submit"
            disabled={!isUrlValid || isLoading || downloadStage !== "idle"}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin-slow" />
                Processing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Fetch Video
              </>
            )}
          </Button>
        )}
      </form>
    </div>
  );
}
