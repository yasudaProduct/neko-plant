import { clsx, type ClassValue } from "clsx"
import { ChangeEvent } from "react";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImageData(event: ChangeEvent<HTMLInputElement>): {
  files: File[];
  displayUrls: string[];
} {
  const dataTransfer = new DataTransfer();
  const displayUrls: string[] = [];

  Array.from(event.target.files!).forEach((image) =>
    dataTransfer.items.add(image)
  );

  const files = Array.from(dataTransfer.files);

  for (let i = 0; i < event.target.files!.length; i++) {
    const displayUrl = URL.createObjectURL(event.target.files![i]);
    displayUrls.push(displayUrl);
  }

  return { files, displayUrls };
}

export const formatDateyyyymmdd = (dateString: string): string | undefined => {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (`0${date.getMonth() + 1}`).slice(-2);
  const day = (`0${date.getDate()}`).slice(-2);
  return `${year}/${month}/${day}`;
};

export const generateImageName = (prefix?: string): string => {
  const currentDate = new Date().toISOString().replace(/[:.]/g, '');
  return prefix ? `${prefix}_${currentDate}` : currentDate;
};

/** 投稿時刻の相対表示 (たった今 / N分前 / N時間前 / N日前 / YYYY/MM/DD) */
export const formatRelativeTime = (date: Date): string => {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "たった今";
  if (diffMinutes < 60) return `${diffMinutes}分前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}時間前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}日前`;

  const d = new Date(date);
  return `${d.getFullYear()}/${(`0${d.getMonth() + 1}`).slice(-2)}/${(`0${d.getDate()}`).slice(-2)}`;
};