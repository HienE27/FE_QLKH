'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallback?: React.ReactNode;
  sizes?: string;
  priority?: boolean;
}

const DEFAULT_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23ddd" width="40" height="40"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="10"%3ENo%3C/text%3E%3C/svg%3E';

export default function OptimizedImage({
  src,
  alt,
  width = 40,
  height = 40,
  className = '',
  fallback,
  sizes,
  priority = false,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(src);
  const [hasError, setHasError] = useState(false);

  if (!imgSrc || hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div
        className={`bg-blue-gray-200 rounded flex items-center justify-center text-blue-gray-600 text-xs ${className}`}
        style={{ width, height }}
      >
        N/A
      </div>
    );
  }

  // Check if it's an external URL or data URL
  const isExternal = imgSrc.startsWith('http://') || imgSrc.startsWith('https://');
  const isDataUrl = imgSrc.startsWith('data:');

  // For external images or data URLs, we need to use unoptimized
  const needsUnoptimized = isExternal || isDataUrl;

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className="object-cover rounded"
        onError={() => {
          setHasError(true);
          setImgSrc(null);
        }}
        unoptimized={needsUnoptimized}
        sizes={sizes || `${width}px`}
        priority={priority}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
      />
    </div>
  );
}

