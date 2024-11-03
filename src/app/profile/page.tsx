import ProfileForm from "@/components/ProfileForm";

export default function Profile() {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">プロフィール設定</h1>
          </div>
  
          <ProfileForm />
        </div>
      </div>
    );
  }