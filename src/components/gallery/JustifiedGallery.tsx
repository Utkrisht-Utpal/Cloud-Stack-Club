import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Maximize2 } from 'lucide-react';
import type { GalleryPhoto } from '../../types/database';

interface JustifiedGalleryProps {
  photos: GalleryPhoto[];
  eventTitle: string;
  onPhotoClick: (index: number) => void;
}

interface PhotoWithDimensions {
  photo: GalleryPhoto;
  originalIndex: number;
  aspectRatio: number;
}

interface LayoutItem {
  photo: GalleryPhoto;
  originalIndex: number;
  width: number;
  height: number;
}

interface LayoutRow {
  items: LayoutItem[];
  height: number;
}

// Global cache for aspect ratios across component mounts
const globalAspectCache = new Map<string, number>();

export const JustifiedGallery: React.FC<JustifiedGalleryProps> = ({
  photos,
  eventTitle,
  onPhotoClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [aspectRatios, setAspectRatios] = useState<Map<string, number>>(() => new Map(globalAspectCache));
  const batchRef = useRef<Map<string, number>>(new Map());
  const batchTimeoutRef = useRef<number | null>(null);

  // Measure container width with debounced ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number;
    const updateWidth = (w: number) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setContainerWidth((prev) => (Math.abs(prev - w) > 2 ? Math.floor(w) : prev));
      });
    };

    updateWidth(el.getBoundingClientRect().width);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          updateWidth(w);
        }
      }
    });

    resizeObserver.observe(el);
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, []);

  // Helper to batch aspect ratio updates to avoid render cascades
  const scheduleBatchUpdate = useCallback(() => {
    if (batchTimeoutRef.current !== null) return;
    batchTimeoutRef.current = window.setTimeout(() => {
      batchTimeoutRef.current = null;
      if (batchRef.current.size > 0) {
        setAspectRatios((prev) => {
          const next = new Map(prev);
          batchRef.current.forEach((ratio, url) => {
            next.set(url, ratio);
          });
          batchRef.current.clear();
          return next;
        });
      }
    }, 40);
  }, []);

  // Preload unmeasured photos in background
  useEffect(() => {
    photos.forEach((photo) => {
      if (globalAspectCache.has(photo.image_url)) return;

      const img = new Image();
      img.src = photo.image_url;
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const ratio = img.naturalWidth / img.naturalHeight;
          globalAspectCache.set(photo.image_url, ratio);
          batchRef.current.set(photo.image_url, ratio);
          scheduleBatchUpdate();
        }
      };
    });

    return () => {
      if (batchTimeoutRef.current !== null) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
    };
  }, [photos, scheduleBatchUpdate]);

  // Handle direct image load in DOM as fallback
  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>, url: string) => {
      const img = e.currentTarget;
      if (img.naturalWidth && img.naturalHeight && !globalAspectCache.has(url)) {
        const ratio = img.naturalWidth / img.naturalHeight;
        globalAspectCache.set(url, ratio);
        batchRef.current.set(url, ratio);
        scheduleBatchUpdate();
      }
    },
    [scheduleBatchUpdate]
  );

  // Compute Justified Layout Rows (Google Photos Algorithm)
  const rows: LayoutRow[] = useMemo(() => {
    if (!containerWidth || photos.length === 0) return [];

    // Base target row height based on container width
    let baseTargetHeight = 360;
    let gap = 12;

    if (containerWidth < 500) {
      baseTargetHeight = 220;
      gap = 8;
    } else if (containerWidth < 768) {
      baseTargetHeight = 280;
      gap = 10;
    } else if (containerWidth < 1100) {
      baseTargetHeight = 330;
      gap = 12;
    } else {
      baseTargetHeight = 370;
      gap = 14;
    }

    const itemsWithAspect: PhotoWithDimensions[] = photos.map((photo, idx) => ({
      photo,
      originalIndex: idx,
      aspectRatio: aspectRatios.get(photo.image_url) || globalAspectCache.get(photo.image_url) || 1.33,
    }));

    const resultRows: LayoutRow[] = [];
    let currentRow: PhotoWithDimensions[] = [];
    let currentAspectRatioSum = 0;

    for (let i = 0; i < itemsWithAspect.length; i++) {
      const item = itemsWithAspect[i];
      currentRow.push(item);
      currentAspectRatioSum += item.aspectRatio;

      // Adjust target height for this row: if row has portrait images, give it slightly more height
      const hasPortrait = currentRow.some((r) => r.aspectRatio < 0.95);
      const targetRowHeight = hasPortrait ? Math.round(baseTargetHeight * 1.1) : baseTargetHeight;

      const availableWidth = containerWidth - (currentRow.length - 1) * gap;
      const calculatedHeight = availableWidth / currentAspectRatioSum;

      if (calculatedHeight <= targetRowHeight) {
        if (currentRow.length > 1) {
          const prevSum = currentAspectRatioSum - item.aspectRatio;
          const prevAvail = containerWidth - (currentRow.length - 2) * gap;
          const prevHeight = prevAvail / prevSum;

          if (
            Math.abs(prevHeight - targetRowHeight) < Math.abs(calculatedHeight - targetRowHeight) &&
            prevHeight <= targetRowHeight * 1.3
          ) {
            currentRow.pop();
            const finalizedRowHeight = prevAvail / prevSum;

            let allocatedWidth = 0;
            const rowItems: LayoutItem[] = currentRow.map((rItem, rIdx) => {
              const isLastInRow = rIdx === currentRow.length - 1;
              const w = isLastInRow
                ? Math.round(prevAvail - allocatedWidth)
                : Math.round(rItem.aspectRatio * finalizedRowHeight);
              allocatedWidth += w;
              return {
                photo: rItem.photo,
                originalIndex: rItem.originalIndex,
                width: w,
                height: Math.round(finalizedRowHeight),
              };
            });

            resultRows.push({ items: rowItems, height: Math.round(finalizedRowHeight) });

            currentRow = [item];
            currentAspectRatioSum = item.aspectRatio;
            continue;
          }
        }

        let allocatedWidth = 0;
        const rowItems: LayoutItem[] = currentRow.map((rItem, rIdx) => {
          const isLastInRow = rIdx === currentRow.length - 1;
          const w = isLastInRow
            ? Math.round(availableWidth - allocatedWidth)
            : Math.round(rItem.aspectRatio * calculatedHeight);
          allocatedWidth += w;
          return {
            photo: rItem.photo,
            originalIndex: rItem.originalIndex,
            width: w,
            height: Math.round(calculatedHeight),
          };
        });

        resultRows.push({ items: rowItems, height: Math.round(calculatedHeight) });
        currentRow = [];
        currentAspectRatioSum = 0;
      }
    }

    if (currentRow.length > 0) {
      const hasPortrait = currentRow.some((r) => r.aspectRatio < 0.95);
      const targetRowHeight = hasPortrait ? Math.round(baseTargetHeight * 1.1) : baseTargetHeight;

      const availableWidth = containerWidth - (currentRow.length - 1) * gap;
      const calculatedHeight = availableWidth / currentAspectRatioSum;

      if (calculatedHeight > targetRowHeight * 1.3) {
        const rowItems: LayoutItem[] = currentRow.map((rItem) => {
          const w = Math.min(
            Math.round(rItem.aspectRatio * targetRowHeight),
            containerWidth
          );
          return {
            photo: rItem.photo,
            originalIndex: rItem.originalIndex,
            width: w,
            height: targetRowHeight,
          };
        });
        resultRows.push({ items: rowItems, height: targetRowHeight });
      } else {
        let allocatedWidth = 0;
        const rowItems: LayoutItem[] = currentRow.map((rItem, rIdx) => {
          const isLastInRow = rIdx === currentRow.length - 1;
          const w = isLastInRow
            ? Math.round(availableWidth - allocatedWidth)
            : Math.round(rItem.aspectRatio * calculatedHeight);
          allocatedWidth += w;
          return {
            photo: rItem.photo,
            originalIndex: rItem.originalIndex,
            width: w,
            height: Math.round(calculatedHeight),
          };
        });
        resultRows.push({ items: rowItems, height: Math.round(calculatedHeight) });
      }
    }

    return resultRows;
  }, [containerWidth, photos, aspectRatios]);

  const gap = containerWidth < 500 ? 8 : containerWidth < 768 ? 10 : containerWidth < 1100 ? 12 : 14;

  return (
    <div ref={containerRef} className="w-full [contain-intrinsic-size:250px]">
      {rows.length === 0 ? (
        <div className="flex flex-wrap gap-3">
          {photos.map((photo, idx) => (
            <div
              key={photo.id || idx}
              className="h-56 flex-1 min-w-[200px] rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200/80 dark:border-slate-800"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: `${gap}px` }}>
          {rows.map((row, rowIndex) => (
            <div
              key={`row_${rowIndex}`}
              className="flex flex-wrap items-center"
              style={{ gap: `${gap}px` }}
            >
              {row.items.map((item) => (
                <div
                  key={item.photo.id}
                  style={{
                    width: `${item.width}px`,
                    height: `${item.height}px`,
                  }}
                  onClick={() => onPhotoClick(item.originalIndex)}
                  className="group/photo relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-500/40 transition-all duration-200 cursor-pointer shrink-0 select-none will-change-transform"
                >
                  <img
                    src={item.photo.image_url}
                    alt={item.photo.caption || eventTitle}
                    loading="lazy"
                    decoding="async"
                    onLoad={(e) => handleImageLoad(e, item.photo.image_url)}
                    className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300 ease-out"
                  />

                  {/* Bottom Caption Overlay - Only shown if caption is present */}
                  {item.photo.caption && item.photo.caption.trim() && (
                    <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent flex items-end justify-between gap-2 pointer-events-none">
                      <span className="text-xs sm:text-sm font-semibold text-white/95 truncate drop-shadow-md">
                        {item.photo.caption}
                      </span>
                      <div className="p-1 rounded-lg bg-white/20 backdrop-blur-sm opacity-0 group-hover/photo:opacity-100 transition-opacity text-white shrink-0 shadow-sm">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
