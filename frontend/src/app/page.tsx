'use client';
import { AppShell } from '@/components/layout/AppShell';
import { ChatPanel } from '@/components/ChatPanel';
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel';
import { useUIStore } from '@/store/chatStore';

export default function Home() {
  const artifactOpen = useUIStore((s) => s.artifactPanelOpen);

  return (
    <AppShell>
      <ChatPanel />
      {artifactOpen && <ArtifactPanel />}
    </AppShell>
  );
}
