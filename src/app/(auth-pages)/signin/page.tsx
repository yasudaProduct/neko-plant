"use client";

import { signInWithGoogle } from "@/lib/supabase/auth-google";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import LegalConsentNote from "@/components/np/LegalConsentNote";

export default function LoginPage() {
  const handleLogin = async () => {
    await signInWithGoogle();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-4">
            <Image
              src="/images/logo.png"
              alt="logo"
              width={152}
              height={152}
              className="w-24 h-24 rounded-full"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ログイン</h1>
          <p className="text-gray-600">
            アカウントにログインして、猫と植物の暮らしを共有しましょう
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-8 flex flex-col gap-4">
          <button
            type="button"
            onClick={handleLogin}
            className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors border border-gray-300"
          >
            <FcGoogle className="w-4 h-4" />
            <span className="ml-2">Googleでログイン</span>
          </button>
          <LegalConsentNote />
        </div>
      </div>
    </div>
  );
}
