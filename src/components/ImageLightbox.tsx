import React, { useEffect } from "react";
import { X, ZoomIn, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  badge?: string;
}

export function ImageLightbox({ isOpen, onClose, imageUrl, title, badge }: ImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-4xl w-full rounded-2xl bg-card border border-border/80 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/40">
          <div className="flex items-center gap-2">
            {badge ? (
              <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground shadow-2xs">
                {badge}
              </span>
            ) : null}
            <h3 className="font-display text-sm font-bold text-foreground truncate max-w-md">
              {title || "Complaint Photo Evidence"}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Image Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/10 min-h-[300px]">
          <img
            src={imageUrl}
            alt={title || "Enlarged View"}
            className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-md"
          />
        </div>

        {/* Footer */}
        <div className="border-t border-border/80 px-4 py-2.5 bg-card flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ZoomIn className="h-3.5 w-3.5 text-primary" />
            Inspection View · Click anywhere outside to close
          </span>
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
          >
            Open Original <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
