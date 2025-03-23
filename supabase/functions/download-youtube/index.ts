
// Follow this setup guide to integrate the Deno standard library:
// https://deno.land/manual/examples/standard_library

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configure YouTube-dl path - this will be pointing to the executable
// This assumes the binary is available in the server environment
const YOUTUBE_DL_PATH = Deno.env.get("YOUTUBE_DL_PATH") || "/usr/local/bin/yt-dlp";

const downloadVideo = async (videoId: string, quality: string): Promise<{ 
  filePath: string;
  fileSize: number;
  downloadUrl: string;
  filename: string;
}> => {
  try {
    console.log(`Starting download for video ${videoId} with quality ${quality}`);
    
    // Since we can't directly download within the Edge Function environment,
    // we'll use mock data for demonstration
    // In a real server setup, you would run a command like:
    // await Deno.run({
    //   cmd: [YOUTUBE_DL_PATH, `https://www.youtube.com/watch?v=${videoId}`, 
    //         "-f", quality, "-o", outputPath],
    // });
    
    // Mock successful download
    return {
      filePath: `/tmp/videos/youtube-${videoId}.mp4`,
      fileSize: 1024 * 1024 * 25, // Mock 25MB file size
      downloadUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // Using thumbnail as mock
      filename: `youtube-${videoId}.mp4`
    };
  } catch (error) {
    console.error("Download error:", error);
    throw new Error(`Failed to download video: ${error.message}`);
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    if (req.method === "POST") {
      const { videoId, quality, includeSubtitles, includeThumbnail } = await req.json();
      
      if (!videoId) {
        return new Response(
          JSON.stringify({ error: "Video ID is required" }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      console.log("Received download request:", { videoId, quality, includeSubtitles, includeThumbnail });
      
      try {
        // Download the video (mock in edge function environment)
        const downloadResult = await downloadVideo(videoId, quality);
        
        // Create response object
        const response = {
          success: true,
          downloadUrl: downloadResult.downloadUrl, // In a real setup, this would be a signed URL
          filename: downloadResult.filename,
          fileSize: downloadResult.fileSize,
          fileType: "video/mp4",
          additionalFiles: []
        };
        
        // Add thumbnail if requested
        if (includeThumbnail) {
          response.additionalFiles.push({
            type: "thumbnail",
            name: `thumbnail-${videoId}.jpg`,
            content: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          });
        }
        
        // Add subtitles if requested
        if (includeSubtitles) {
          response.additionalFiles.push({
            type: "subtitles",
            name: `subtitles-${videoId}.vtt`,
            content: `https://mock-subtitles-url/${videoId}.vtt` // Mock subtitles URL
          });
        }
        
        // Return successful response
        return new Response(
          JSON.stringify(response),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      } catch (downloadError) {
        console.error("Error downloading video:", downloadError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to download video", 
            details: downloadError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { 
          status: 405, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error("Error handling request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unknown error occurred",
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
