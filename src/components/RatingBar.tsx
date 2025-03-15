import { Heart, Skull } from "lucide-react";

export default function RatingBar({
  likes,
  dislikes,
}: {
  likes: number;
  dislikes: number;
}) {
  const total = likes + dislikes;
  const likePercent = (likes / total) * 100;
  const dislikePercent = (dislikes / total) * 100;
  return (
    <div className="flex items-center gap-2 mb-6">
      <div className="flex items-center gap-1">
        <Heart className="w-4 h-4 text-red-500" />
        <span className="text-sm">{likes}</span>
      </div>
      <div className="flex-1 h-2 rounded-full overflow-hidden flex">
        <div
          className="h-full"
          style={{
            width: `${likePercent}%`,
            backgroundColor: "#56c577",
          }}
        />
        <div
          className="h-full"
          style={{
            width: `${dislikePercent}%`,
            backgroundColor: "#ff8b81",
          }}
        />
      </div>
      <div className="flex items-center gap-1">
        <Skull className="w-4 h-4 text-indigo-500" />
        <span className="text-sm">{dislikes}</span>
      </div>
    </div>
  );
}
