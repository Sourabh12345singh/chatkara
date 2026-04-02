import { useState } from "react";
import { Camera, Mail, User } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = String(reader.result);
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  if (!authUser) return null;

  return (
    <div className="h-screen pt-20">
      <div className="mx-auto max-w-2xl p-4 py-8">
        <div className="space-y-8 rounded-xl bg-base-300 p-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full border-4 object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/avatar.png";
                }}
              />
              <label htmlFor="avatar-upload" className={`absolute bottom-0 right-0 cursor-pointer rounded-full bg-base-content p-2 transition-all duration-200 hover:scale-105 ${isUpdatingProfile ? "pointer-events-none animate-pulse" : ""}`}>
                <Camera className="h-5 w-5 text-base-200" />
                <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUpdatingProfile} />
              </label>
            </div>
            <p className="text-sm text-zinc-400">{isUpdatingProfile ? "Uploading..." : "Click the camera icon to update your photo"}</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-zinc-400"><User className="h-4 w-4" />Full Name</div>
              <p className="rounded-lg border bg-base-200 px-4 py-2.5">{authUser.fullName}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-zinc-400"><Mail className="h-4 w-4" />Email Address</div>
              <p className="rounded-lg border bg-base-200 px-4 py-2.5">{authUser.email}</p>
            </div>
          </div>
          <div className="mt-6 rounded-xl bg-base-300 p-6">
            <h2 className="mb-4 text-lg font-medium">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-zinc-700 py-2">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
