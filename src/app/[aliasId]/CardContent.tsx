"use client";

import Image from "next/image";
import { Cat } from "lucide-react";
import { Pet } from "../../types/neko";

interface PetCardProp {
  pet: Pet;
  authFlg: boolean;
}

export function PetCard({ pet, authFlg }: PetCardProp) {
  return (
    <div
      className={`min-w-full bg-gray-50 rounded-lg p-4 border-2 border-solid border-gray-50 ${
        authFlg ? "hover:border-green-500" : ""
      }`}
    >
      <div className="flex items-start space-x-4">
        {pet.imageSrc ? (
          <Image
            src={pet.imageSrc}
            alt={pet.name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-lg object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
            <Cat className="w-10 h-10 text-gray-400" />
          </div>
        )}
        <div>
          <h3 className="font-medium">{pet.name}</h3>
          <p className="text-sm text-gray-600">{pet.neko.name}</p>
        </div>
      </div>
    </div>
  );
}
