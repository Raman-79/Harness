import { ChatPanel } from '@/components/ChatPanel';

export default function Home() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-gray-50">
      <div className="hidden md:flex w-64 flex-col bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold mb-6 tracking-tight">Forge</h1>
        <nav className="flex-1">
          <p className="text-gray-400 text-sm">Conversations</p>
        </nav>
      </div>
      
      <div className="flex-1 flex flex-col h-full">
        <ChatPanel />
      </div>
    </main>
  );
}
