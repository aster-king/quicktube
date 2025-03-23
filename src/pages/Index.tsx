
import { ThemeToggle } from "@/components/ThemeToggle";
import { YouTubeDownloader } from "@/components/YouTubeDownloader";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md mx-auto">
        <div className="p-6 sm:p-8 rounded-xl border bg-card text-card-foreground shadow-sm">
          <YouTubeDownloader />
        </div>
        
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} QuickTube Downloader</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
