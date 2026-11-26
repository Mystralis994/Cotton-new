import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isSafeImageUrl } from '../utils/formatters';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  protectedPreview?: boolean;
}

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackTitle,
  protectedPreview = true,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const safeSrc = isSafeImageUrl(src) ? src?.trim() : '';

  if (!safeSrc || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF1F5] via-[#F4F1FC] to-[#EFF7FD] text-[#6D586E] p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Sparkles className="w-6 h-6 text-[#D93D7A] mb-2 opacity-80" aria-hidden="true" />
        <span className="text-xs font-medium text-[#352336] line-clamp-2 max-w-[18ch]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      draggable={protectedPreview ? false : undefined}
      onContextMenu={protectedPreview ? (e) => e.preventDefault() : undefined}
      onDragStart={protectedPreview ? (e) => e.preventDefault() : undefined}
      className={`${protectedPreview ? 'select-none [-webkit-user-drag:none] [-webkit-touch-callout:none]' : ''} ${className}`}
      loading="lazy"
    />
  );
}
