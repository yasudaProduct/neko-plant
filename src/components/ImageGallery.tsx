"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageGalleryProps {
  images: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }[];
  quality?: number;
  className?: string;
}

export function ImageGallery({
  images,
  quality = 90,
  className = "",
}: ImageGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  return (
    <div>
      <div
        className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 ${className}`}
      >
        {images.map((image, index) => (
          <div
            key={`${image.src}-${index}`}
            className="relative cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => handleThumbnailClick(index)}
          >
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width || 200}
              height={image.height || 200}
              className="object-cover rounded-md w-full h-[100px]"
              quality={quality}
            />
          </div>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none overflow-hidden">
          <DialogTitle className="sr-only">
            {images[currentIndex].alt}画像ギャラリー（{currentIndex + 1}/
            {images.length}）
          </DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center">
            <DialogClose className="absolute right-4 top-4 z-50 bg-black/50 p-1 rounded-full">
              <X className="h-6 w-6 text-white" />
            </DialogClose>

            <button
              onClick={handlePrevious}
              className="absolute left-4 z-10 bg-black/50 p-2 rounded-full hover:bg-black/70"
              aria-label="前の画像"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>

            <Image
              src={images[currentIndex].src}
              alt={images[currentIndex].alt}
              width={1200}
              height={800}
              className="object-contain max-h-[85vh] max-w-[95%] mx-auto"
              quality={quality}
            />

            <button
              onClick={handleNext}
              className="absolute right-4 z-10 bg-black/50 p-2 rounded-full hover:bg-black/70"
              aria-label="次の画像"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full ${
                    index === currentIndex ? "bg-white" : "bg-white/50"
                  }`}
                  aria-label={`画像 ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
