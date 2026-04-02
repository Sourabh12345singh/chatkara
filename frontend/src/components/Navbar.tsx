import { Link } from "react-router-dom";
import { LogOut, Settings, User } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  return (
    <header className="fixed top-0 z-40 w-full border-b border-base-300 bg-base-100/80 backdrop-blur-lg">
      <div className="container mx-auto h-16 px-4">
        <div className="flex h-full items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 transition-all hover:opacity-80">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <img
                src="/aa.png"
                alt="Chat Icon"
                className="h-8 w-8"
                onError={(e) => {
                  e.currentTarget.src = "/avatar.png";
                }}
              />
            </div>
            <h1 className="text-lg font-bold">Chatkara</h1>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/settings" className="btn btn-sm gap-2 transition-colors">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            {authUser && (
              <>
                <Link to="/profile" className="btn btn-sm gap-2">
                  <User className="size-5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>
                <button type="button" className="flex items-center gap-2" onClick={() => void logout()}>
                  <LogOut className="size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
