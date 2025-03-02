"use client";

import { Leaf } from "lucide-react";
import { signInWithGoogle } from "@/lib/supabase/auth-google";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");
  // const [error, setError] = useState("");
  // const [isLoading, setIsLoading] = useState(false);
  // const router = useRouter();
  // const { signIn } = useUser();

  // const supabase = createClient();

  const handleLogin = async () => {
    await signInWithGoogle();
    // const { data, error } = await supabase.auth.signInWithOAuth({
    //   provider: "google",
    //   options: {
    //     // redirectTo: `${process.env.SUPABASE_AUTH_URL}/auth/callback`,
    //     redirectTo: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/auth/callback`,
    //     queryParams: {
    //       access_type: "offline",
    //       prompt: "consent",
    //     },
    //   },
    // });
    // if (error) {
    //   console.error("Error logging in:", error);
    // } else {
    //   console.log("User logged in:", data);
    // }
  };

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setError("");
  //   setIsLoading(true);

  //   try {
  //     await signIn(email, password);
  //     router.push("/");
  //   } catch (error) {
  //     const code = (error as AuthApiError).code;
  //     switch (code) {
  //       case "invalid_credentials":
  //         setError("メールアドレスまたはパスワードが正しくありません");
  //         break;
  //       case "email_not_confirmed":
  //         setError(
  //           "電子メール アドレスが確認されていないため、このユーザーのサインインは許可されません。"
  //         );
  //         break;
  //       default:
  //         setError("エラーが発生しました。再度お試しください。");
  //         break;
  //     }
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <Leaf className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ログイン</h1>
          <p className="text-gray-600">
            アカウントにログインして、植物の安全性を共有しましょう
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* <form onSubmit={handleSubmit} className="space-y-6"> */}
          {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              ログイン
            </button> */}

          {/* google */}
          <button
            type="button"
            onClick={handleLogin}
            className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors border border-gray-300"
          >
            <FcGoogle className="w-4 h-4" />
            <span className="ml-2">Googleでログイン</span>
          </button>

          {/* <div className="text-center text-sm text-gray-600">
            <Link href="/signup">アカウントを作成する</Link>
          </div> */}
          {/* </form> */}
        </div>
      </div>
    </div>
  );
}
