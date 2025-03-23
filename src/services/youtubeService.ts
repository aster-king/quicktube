
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
  message?: string;
}

export const downloadYouTubeVideo = async (options: DownloadOptions): Promise<DownloadResponse> => {
  try {
    console.log("Preparing download with options:", options);
    
    // We'll use a backend API that implements yt-dlp and ffmpeg
    // This API should be hosted on your own server
    const backendUrl = "https://your-backend-api.com/download"; // Replace with your actual backend URL
    
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoId: options.videoId,
        quality: options.quality,
        includeSubtitles: options.includeSubtitles,
        includeThumbnail: options.includeThumbnail,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to download video");
    }
    
    const data = await response.json();
    
    if (data.downloadUrl) {
      // Create an invisible anchor element to trigger the download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.setAttribute('download', `youtube_video_${options.videoId}.mp4`);
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Trigger the download
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      
      return {
        success: true,
        url: data.downloadUrl,
        message: "Download started successfully"
      };
    } else {
      throw new Error("No download URL provided by the server");
    }
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
  const backendUrl = `https://your-backend-api.com/progress/${downloadId}`; // Replace with your actual backend URL
  
  try {
    const response = await fetch(backendUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch progress");
    }
    
    const data = await response.json();
    return data.progress || 0;
  } catch (error) {
    console.error("Error checking download progress:", error);
    return 0;
  }
};

// Create a Python script for the backend that uses yt-dlp and ffmpeg
export const getPythonBackendScript = () => {
  // This function is just for reference - it provides the Python code you would need to implement on your backend
  const pythonScript = `
# Backend implementation using Flask, yt-dlp and ffmpeg
from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
import os
import uuid
import subprocess

app = Flask(__name__)
CORS(app)

# Directory to store downloads
DOWNLOAD_DIR = './downloads'
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

@app.route('/download', methods=['POST'])
def download_video():
    data = request.json
    video_id = data.get('videoId')
    quality = data.get('quality')
    include_subtitles = data.get('includeSubtitles', False)
    include_thumbnail = data.get('includeThumbnail', False)
    
    if not video_id:
        return jsonify({'error': 'Video ID is required'}), 400
    
    # Create a unique download ID
    download_id = str(uuid.uuid4())
    output_path = os.path.join(DOWNLOAD_DIR, f"{download_id}")
    os.makedirs(output_path, exist_ok=True)
    
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    # Set yt-dlp options based on quality requested
    format_code = get_format_code(quality)
    
    ydl_opts = {
        'format': format_code,
        'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
        'writesubtitles': include_subtitles,
        'writeautomaticsub': include_subtitles,
        'writethumbnail': include_thumbnail,
        'progress_hooks': [lambda d: update_progress(download_id, d)],
    }
    
    try:
        # Download the video
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            filename = ydl.prepare_filename(info)
            
            # Convert to MP4 using ffmpeg if needed
            if not filename.endswith('.mp4'):
                mp4_filename = filename.rsplit('.', 1)[0] + '.mp4'
                subprocess.run([
                    'ffmpeg', '-i', filename, '-c:v', 'libx264', '-c:a', 'aac', mp4_filename
                ])
                filename = mp4_filename
            
            # Generate a downloadable URL (this depends on your server setup)
            # For example, you might serve files from a specific route
            download_url = f"/download/{download_id}/{os.path.basename(filename)}"
            
            return jsonify({
                'success': True,
                'downloadId': download_id,
                'downloadUrl': download_url
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/progress/<download_id>', methods=['GET'])
def get_progress(download_id):
    # In a real implementation, store and retrieve progress from a database or cache
    # For this example, we'll return a dummy value
    return jsonify({'progress': 100})

def get_format_code(quality):
    quality_map = {
        '360': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
        '720': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
        '1080': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
        '4k': 'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
    }
    return quality_map.get(quality, 'bestvideo[height<=720]+bestaudio/best[height<=720]')

def update_progress(download_id, d):
    # In a real implementation, store progress in a database or cache
    if d['status'] == 'downloading':
        p = d.get('_percent_str', '0%')
        p = p.replace('%', '')
        try:
            progress = float(p)
            # Store progress for this download_id
            print(f"Download {download_id}: {progress}%")
        except:
            pass

# Serve downloaded files
@app.route('/download/<download_id>/<filename>', methods=['GET'])
def serve_file(download_id, filename):
    directory = os.path.join(DOWNLOAD_DIR, download_id)
    return send_from_directory(directory, filename, as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
`;

  return pythonScript;
};
