
// Follow this setup guide to integrate the Deno standard library:
// https://deno.land/manual/examples/standard_library

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { download } from "https://deno.land/x/download@v2.0.2/mod.ts";
import { ensureDir } from "https://deno.land/std@0.190.0/fs/ensure_dir.ts";
import { exists } from "https://deno.land/std@0.190.0/fs/exists.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Set up the temp directory
const TEMP_DIR = "/tmp/quicktube";
const TOOLS_DIR = `${TEMP_DIR}/tools`;
const DOWNLOAD_DIR = `${TEMP_DIR}/downloads`;
const BINARY_VERSION = "latest";

// Helper function to ensure all directories exist
async function setupDirectories() {
  await ensureDir(TEMP_DIR);
  await ensureDir(TOOLS_DIR);
  await ensureDir(DOWNLOAD_DIR);
}

// Function to download and set up the binaries if they don't exist
async function setupBinaries() {
  console.log("Setting up binaries...");
  
  // Check if binaries already exist
  const ytDlpExists = await exists(`${TOOLS_DIR}/yt-dlp`);
  const ffmpegExists = await exists(`${TOOLS_DIR}/ffmpeg`);
  const ffprobeExists = await exists(`${TOOLS_DIR}/ffprobe`);
  
  if (ytDlpExists && ffmpegExists && ffprobeExists) {
    console.log("All binaries already exist, skipping download");
    return;
  }
  
  // Determine platform (Linux for Deno Deploy)
  const platform = "linux";
  
  // Download yt-dlp
  if (!ytDlpExists) {
    console.log("Downloading yt-dlp...");
    const ytDlpUrl = `https://github.com/yt-dlp/yt-dlp/releases/${BINARY_VERSION}/download/yt-dlp`;
    await download(ytDlpUrl, { file: "yt-dlp", dir: TOOLS_DIR });
    await Deno.chmod(`${TOOLS_DIR}/yt-dlp`, 0o755);
  }
  
  // Download FFmpeg tools 
  if (!ffmpegExists || !ffprobeExists) {
    console.log("Downloading FFmpeg...");
    const ffmpegUrl = `https://github.com/aster-king/quicktube-grab/raw/main/ffmpeg.tar.gz`;
    const ffmpegArchive = `${TEMP_DIR}/ffmpeg.tar.gz`;
    
    await download(ffmpegUrl, { file: "ffmpeg.tar.gz", dir: TEMP_DIR });
    
    // Extract archive using manual extraction since we removed the extract import
    console.log("Extracting FFmpeg archive...");
    
    // Create a process to extract the archive using tar
    const extractProcess = new Deno.Command("tar", {
      args: ["-xzf", ffmpegArchive, "-C", TOOLS_DIR],
    });
    
    const { code, stdout, stderr } = await extractProcess.output();
    
    if (code !== 0) {
      const errorOutput = new TextDecoder().decode(stderr);
      console.error("Error extracting archive:", errorOutput);
      throw new Error(`Failed to extract FFmpeg archive: ${errorOutput}`);
    }
    
    // Set permissions
    await Deno.chmod(`${TOOLS_DIR}/ffmpeg`, 0o755);
    await Deno.chmod(`${TOOLS_DIR}/ffprobe`, 0o755);
    
    // Clean up archive
    await Deno.remove(ffmpegArchive);
  }
  
  console.log("Binaries set up successfully");
}

// Function to download video using yt-dlp
async function downloadVideo(videoId: string, quality: string, includeSubtitles: boolean, includeThumbnail: boolean): Promise<any> {
  console.log(`Downloading video ${videoId} with quality ${quality}`);
  
  // Create a unique download directory for this request
  const uniqueId = crypto.randomUUID();
  const outputDir = `${DOWNLOAD_DIR}/${uniqueId}`;
  await ensureDir(outputDir);
  
  // Base yt-dlp options
  const ytdlpPath = `${TOOLS_DIR}/yt-dlp`;
  const ffmpegPath = `${TOOLS_DIR}/ffmpeg`;
  
  let formatCode;
  switch (quality) {
    case "360p":
      formatCode = "bestvideo[height<=360]+bestaudio/best[height<=360]";
      break;
    case "720p":
      formatCode = "bestvideo[height<=720]+bestaudio/best[height<=720]";
      break;
    case "1080p":
      formatCode = "bestvideo[height<=1080]+bestaudio/best[height<=1080]";
      break;
    case "4K":
      formatCode = "bestvideo[height<=2160]+bestaudio/best[height<=2160]";
      break;
    default:
      formatCode = "bestvideo[height<=720]+bestaudio/best[height<=720]";
  }
  
  // Build the yt-dlp command
  const args = [
    "--no-warnings",
    "--format", formatCode,
    "--ffmpeg-location", ffmpegPath,
    "--output", `${outputDir}/%(title)s.%(ext)s`,
  ];
  
  if (includeSubtitles) {
    args.push("--write-subs");
    args.push("--write-auto-subs");
  }
  
  if (includeThumbnail) {
    args.push("--write-thumbnail");
  }
  
  // Add the video URL
  args.push(`https://www.youtube.com/watch?v=${videoId}`);
  
  // Execute yt-dlp command
  const command = new Deno.Command(ytdlpPath, {
    args: args,
  });
  
  console.log("Running command:", ytdlpPath, args.join(" "));
  const { code, stdout, stderr } = await command.output();
  
  const stdoutText = new TextDecoder().decode(stdout);
  const stderrText = new TextDecoder().decode(stderr);
  
  console.log("Command output:", stdoutText);
  
  if (code !== 0) {
    console.error("Error executing yt-dlp:", stderrText);
    throw new Error(`yt-dlp exited with code ${code}: ${stderrText}`);
  }
  
  // Find the downloaded file
  const entries = [];
  for await (const entry of Deno.readDir(outputDir)) {
    entries.push(entry);
  }
  
  // Find the video file
  const videoFile = entries.find(e => !e.name.endsWith(".jpg") && !e.name.endsWith(".srt") && !e.name.endsWith(".json"));
  
  if (!videoFile) {
    throw new Error("No video file found in the output directory");
  }
  
  console.log("Video file:", videoFile.name);
  
  // Read the file as bytes to encode as base64
  const fileContent = await Deno.readFile(`${outputDir}/${videoFile.name}`);
  const fileSize = fileContent.length;
  
  // Collect additional files if requested
  const additionalFiles: { type: string, name: string, content: string }[] = [];
  
  if (includeSubtitles) {
    const subFile = entries.find(e => e.name.endsWith(".srt") || e.name.endsWith(".vtt"));
    if (subFile) {
      const subContent = await Deno.readFile(`${outputDir}/${subFile.name}`);
      additionalFiles.push({
        type: "subtitle",
        name: subFile.name,
        content: btoa(new TextDecoder().decode(subContent))
      });
    }
  }
  
  if (includeThumbnail) {
    const thumbFile = entries.find(e => e.name.endsWith(".jpg") || e.name.endsWith(".png") || e.name.endsWith(".webp"));
    if (thumbFile) {
      const thumbContent = await Deno.readFile(`${outputDir}/${thumbFile.name}`);
      additionalFiles.push({
        type: "thumbnail",
        name: thumbFile.name,
        content: btoa(String.fromCharCode(...new Uint8Array(thumbContent)))
      });
    }
  }
  
  // Create a download URL (this would be a pre-signed URL in a real implementation)
  // For demo purposes, we're returning the file content encoded as base64
  return {
    filename: videoFile.name,
    fileSize: fileSize,
    fileType: videoFile.name.split('.').pop(),
    downloadUrl: `data:video/${videoFile.name.split('.').pop()};base64,${btoa(String.fromCharCode(...new Uint8Array(fileContent)))}`,
    additionalFiles: additionalFiles
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Set up directories and binaries
    await setupDirectories();
    await setupBinaries();
    
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
      
      // Download the video
      const result = await downloadVideo(
        videoId, 
        quality || "720p", 
        includeSubtitles || false, 
        includeThumbnail || false
      );
      
      // Return successful response
      return new Response(
        JSON.stringify({ 
          success: true,
          downloadUrl: result.downloadUrl,
          filename: result.filename,
          fileSize: result.fileSize,
          fileType: result.fileType,
          additionalFiles: result.additionalFiles
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
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
