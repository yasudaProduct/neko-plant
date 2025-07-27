import E2EDevLoginForm from './E2EDevLoginForm';

export default function DevSignInPage() {
  // 開発環境でのみアクセス可能
  if (process.env.NODE_ENV !== 'development') {
    return <div>このページは開発環境でのみ利用可能です</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            E2Eテスト用ログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            開発環境専用のemail認証
          </p>
        </div>
        <E2EDevLoginForm />
      </div>
    </div>
  );
}