import ChatWidget from "@/components/ChatWidget";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-black">
      <ChatWidget />
    </div>
  );
}
