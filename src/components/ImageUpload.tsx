import { useState } from "react";
import Image from "next/image";
import { getImageData } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";

export default function ImageUpload({
  onImageChange,
  maxCount = 1,
}: {
  onImageChange: (file: File[]) => void;
  maxCount?: number;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files, displayUrls } = getImageData(e);
    if (files && files.length > 0) {
      if (selectedFiles.length >= maxCount) {
        alert(`最大${maxCount}枚までしかアップロードできません。`);
        return;
      }
      const newFiles = [...selectedFiles, ...files];
      setSelectedFiles(newFiles);
      setPreview([...preview, ...displayUrls]);
      onImageChange(newFiles);
    }
  };

  return (
    <>
      <div>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors flex items-center justify-center hover:cursor-pointer"
          onClick={() => {
            document.getElementById("image")?.click();
          }}
        >
          <ImageIcon className="w-4 h-4" />
          写真を追加する +
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            multiple={maxCount > 1}
          />
        </div>
      </div>

      {preview && selectedFiles.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {preview.map((url) => (
            <Image
              key={url}
              src={url}
              alt="画像プレビュー"
              width={200}
              height={200}
              className="mx-auto"
            />
          ))}
        </div>
      )}
    </>
  );
}
