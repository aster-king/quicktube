
// Follow this setup guide to integrate the Deno standard library:
// https://deno.land/manual/examples/standard_library

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Server config - update this with your server's information
const DOWNLOAD_SERVER_URL = Deno.env.get("DOWNLOAD_SERVER_URL") || "https://your-ytdlp-server.example.com";
const SERVER_API_KEY = Deno.env.get("DOWNLOAD_SERVER_API_KEY") || "your_api_key"; 

interface DownloadOptions {
  videoId: string;
  quality: string;
  includeSubtitles: boolean;
  includeThumbnail: boolean;
}

// Function to download video by communicating with an external server
const downloadVideo = async (options: DownloadOptions): Promise<{ 
  downloadUrl: string;
  filename: string;
  fileSize: number;
  fileType: string;
  additionalFiles?: Array<{
    type: string;
    name: string;
    content: string;
  }>;
}> => {
  try {
    console.log(`Requesting download for video ${options.videoId} with quality ${options.quality}`);
    
    // For development testing without the server running, toggle this flag
    const USE_MOCK_DATA = true;
    
    if (USE_MOCK_DATA) {
      // Return mock data for testing
      console.log("Using mock download data");
      
      const mockResponse = {
        downloadUrl: `https://img.youtube.com/vi/${options.videoId}/maxresdefault.jpg`, // Using thumbnail as mock
        filename: `youtube-${options.videoId}.mp4`,
        fileSize: 1024 * 1024 * 25, // Mock 25MB file size
        fileType: "video/mp4",
        additionalFiles: []
      };
      
      // Add mock additional files based on options
      if (options.includeThumbnail) {
        mockResponse.additionalFiles.push({
          type: "thumbnail",
          name: `thumbnail-${options.videoId}.jpg`,
          content: `https://img.youtube.com/vi/${options.videoId}/hqdefault.jpg`
        });
      }
      
      if (options.includeSubtitles) {
        mockResponse.additionalFiles.push({
          type: "subtitles",
          name: `subtitles-${options.videoId}.vtt`,
          content: `https://mock-subtitles-url/${options.videoId}.vtt`
        });
      }
      
      return mockResponse;
    }
    
    // Make a request to the external download server
    // This server would be running the ytdlp-ffmpeg tools from the GitHub repo
    const response = await fetch(`${DOWNLOAD_SERVER_URL}/api/download`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVER_API_KEY}`
      },
      body: JSON.stringify({
        videoId: options.videoId,
        quality: options.quality,
        includeSubtitles: options.includeSubtitles,
        includeThumbnail: options.includeThumbnail
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Server error response:", errorData);
      throw new Error(`Download server error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Download server response:", data);
    
    return {
      downloadUrl: data.downloadUrl,
      filename: data.filename,
      fileSize: data.fileSize,
      fileType: data.fileType,
      additionalFiles: data.additionalFiles
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
      const requestData = await req.json();
      const { videoId, quality, includeSubtitles, includeThumbnail } = requestData;
      
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
        // Call the download function that communicates with the external server
        const downloadResult = await downloadVideo({
          videoId,
          quality,
          includeSubtitles,
          includeThumbnail
        });
        
        // Return successful response
        return new Response(
          JSON.stringify({
            success: true,
            downloadUrl: downloadResult.downloadUrl,
            filename: downloadResult.filename,
            fileSize: downloadResult.fileSize,
            fileType: downloadResult.fileType,
            additionalFiles: downloadResult.additionalFiles || []
          }),
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
