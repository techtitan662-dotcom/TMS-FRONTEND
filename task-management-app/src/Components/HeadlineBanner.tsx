import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { headlineService } from '../Services/Headline.service';
import type { Headline } from '../Services/Headline.service';
import { io } from "socket.io-client";

const resolveSocketUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
  const isDev = Boolean(import.meta.env.DEV);

  if (typeof envSocketUrl === 'string' && envSocketUrl.trim().length > 0) {
    return String(envSocketUrl).trim().replace(/\/+$/, '');
  }

  const apiBase =
    typeof envBaseUrl === 'string' && envBaseUrl.trim().length > 0
      ? envBaseUrl
      : isDev
        ? 'http://localhost:8100/api'
        : 'https://tms-backend-sand.vercel.app/api';

  const trimmed = String(apiBase || '').trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

const HeadlineBanner: React.FC = () => {
  const [headline, setHeadline] = useState<Headline | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchHeadline = async () => {
      const res = await headlineService.getActiveHeadline();
      if (res.success) {
        if (res.data) {
          setHeadline(res.data);
          setIsVisible(true);
        } else {
          setHeadline(null);
          setIsVisible(false);
        }
      }
    };
    
    fetchHeadline();
    
    // Set up WebSocket for real-time updates
    const socketUrl = resolveSocketUrl();
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socket.on('headline_update', (data) => {
      console.log('[Socket] Headline update received:', data);
      fetchHeadline();
    });

    // Refresh every 5 minutes as a fallback
    const interval = setInterval(fetchHeadline, 5 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (headline && headline.expiresAt && isVisible) {
      const expirationTime = new Date(headline.expiresAt).getTime();
      const now = new Date().getTime();
      const delay = expirationTime - now;

      if (delay > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, delay);
        return () => clearTimeout(timer);
      } else {
        setIsVisible(false);
      }
    }
  }, [headline, isVisible]);

  if (!headline || !isVisible) return null;


  const getBgStyle = () => {
    if (headline.bgColor) return { backgroundColor: headline.bgColor };
    switch (headline.type) {
      case 'holiday': return { backgroundImage: 'linear-gradient(to right, #16a34a, #059669)' };
      case 'festival': return { backgroundImage: 'linear-gradient(to right, #9333ea, #4f46e5)' };
      case 'meeting': return { backgroundImage: 'linear-gradient(to right, #2563eb, #4f46e5)' };
      case 'update': return { backgroundImage: 'linear-gradient(to right, #f97316, #dc2626)' };
      default: return { backgroundImage: 'linear-gradient(to right, #2563eb, #4f46e5)' };
    }
  };

  const getTextStyle = () => {
    if (headline.textColor) return { color: headline.textColor };
    return { color: 'white' };
  };

  return (
    <div 
      className="relative overflow-hidden shadow-lg animate-in slide-in-from-top duration-500 transition-colors"
      style={getBgStyle()}
    >
      <div className="max-w-[100vw] mx-auto py-2 flex items-center gap-4 pl-2">
        
        {/* Scrolling Text Section */}
        <div className="flex-1 overflow-hidden relative">
          <div className="whitespace-nowrap inline-flex animate-marquee-infinite items-center py-1">
            <span 
              className="flex items-center gap-12 pr-12 text-sm sm:text-lg font-bold tracking-wide"
              style={getTextStyle()}
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <React.Fragment key={i}>
                  <span>{headline.text}</span>
                  <span className="opacity-40 select-none">•</span>
                </React.Fragment>
              ))}
            </span>
            <span 
              className="flex items-center gap-12 pr-12 text-sm sm:text-lg font-bold tracking-wide"
              style={getTextStyle()}
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <React.Fragment key={i}>
                  <span>{headline.text}</span>
                  <span className="opacity-40 select-none">•</span>
                </React.Fragment>
              ))}
            </span>
          </div>
        </div>
        
        {/* Close Button */}
        <button 
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 p-2 mr-4 hover:bg-white/20 rounded-full transition-colors z-10"
          style={getTextStyle()}
          aria-label="Close announcement"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <style>{`
        @keyframes marquee-infinite {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-infinite {
          animation: marquee-infinite 60s linear infinite;
        }
        .animate-marquee-infinite:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-16 w-16 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-16 w-16 bg-black/10 rounded-full blur-2xl"></div>
    </div>
  );
};

export default HeadlineBanner;
