"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageViewerProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  quality?: number;
}

export function ImageViewer({
  src,
  alt,
  width = 1200,
  height = 800,
  className = "",
  thumbnailWidth = 300,
  thumbnailHeight = 200,
  quality = 90,
}: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="relative cursor-pointer hover:opacity-90 transition-opacity">
          <Image
            src={src}
            alt={alt}
            width={thumbnailWidth}
            height={thumbnailHeight}
            className={`object-cover ${className}`}
            quality={quality}
          />
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className="object-contain max-h-[85vh] max-w-[95%] mx-auto"
            quality={quality}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
