import Link from "next/link";

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">各種設定</h1>
        <Link href="/settings/account">
          <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Account
          </button>
        </Link>
        <Link href="/settings/profile">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Profile
          </button>
        </Link>
      </div>
      <div className="max-w-4xl mx-auto space-y-8 mt-4 mb-4">
        <div className="bg-white rounded-xl shadow-lg p-6">{children}</div>
      </div>
    </div>
  );
}
