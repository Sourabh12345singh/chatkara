import { Send } from "lucide-react";
import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="container mx-auto h-screen max-w-5xl px-4 pt-20">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-base-content/70">Choose a theme for your chat interface</p>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {THEMES.map((t) => (
            <button key={t} type="button" className={`group flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}`} onClick={() => setTheme(t)}>
              <div className="relative h-8 w-full overflow-hidden rounded-md" data-theme={t}>
                <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                  <div className="rounded bg-primary" />
                  <div className="rounded bg-secondary" />
                  <div className="rounded bg-accent" />
                  <div className="rounded bg-neutral" />
                </div>
              </div>
              <span className="w-full truncate text-center text-[11px] font-medium">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
            </button>
          ))}
        </div>
        <h3 className="mb-3 text-lg font-semibold">Preview</h3>
        <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-lg">
          <div className="bg-base-200 p-4">
            <div className="mx-auto max-w-lg">
              <div className="overflow-hidden rounded-xl bg-base-100 shadow-sm">
                <div className="border-b border-base-300 bg-base-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-medium text-primary-content">S</div>
                    <div>
                      <h3 className="text-sm font-medium">Sourabh Singh</h3>
                      <p className="text-xs text-base-content/70">Online</p>
                    </div>
                  </div>
                </div>
                <div className="min-h-[200px] max-h-[200px] space-y-4 overflow-y-auto bg-base-100 p-4">
                  {PREVIEW_MESSAGES.map((message) => (
                    <div key={message.id} className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl p-3 shadow-sm ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}`}>
                        <p className="text-sm">{message.content}</p>
                        <p className={`mt-1.5 text-[10px] ${message.isSent ? "text-primary-content/70" : "text-base-content/70"}`}>12:00 PM</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-base-300 bg-base-100 p-4">
                  <div className="flex gap-2">
                    <input type="text" className="input input-bordered h-10 flex-1 text-sm" placeholder="Type a message..." value="This is a preview" readOnly />
                    <button type="button" className="btn btn-primary h-10 min-h-0">
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
