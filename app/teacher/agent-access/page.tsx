import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResponsivePopover } from '@/components/ui/responsivePopover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { teacherMcpEndpoint } from '@/lib/teacher-mcp-api';
import './agent-access.css';

const assetRoot = '/images/teacher/agent-access';
const clients = [
  { id: 'chatgpt', name: 'ChatGPT', logo: `${assetRoot}/chatgpt.svg`, video: '/videos/teacher/agent-access/chatgpt.mp4', href: 'https://chatgpt.com/plugins', action: 'Open ChatGPT Plugins' },
  { id: 'claude', name: 'Claude', logo: `${assetRoot}/claude.svg`, video: '/videos/teacher/agent-access/claude.mp4', href: 'https://claude.ai/customize/connectors', action: 'Open Claude Connectors' },
  { id: 'gemini', name: 'Gemini', logo: `${assetRoot}/gemini.svg`, video: '/videos/teacher/agent-access/gemini.mp4', href: 'https://gemini.google.com/devmode', action: 'Open Gemini Developer Mode' },
] as const;
type ClientId = (typeof clients)[number]['id'];

export default function TeacherAgentAccessPage() {
  const [open, setOpen] = useState(false);
  const [activeClient, setActiveClient] = useState<ClientId>('chatgpt');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(teacherMcpEndpoint);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Agent access"  />
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-5 pb-12 pt-8 sm:gap-7 sm:pt-10">
        <figure className="aspect-square w-full  max-w-[440px]">
          <img
            src={`${assetRoot}/hero.webp`}
            alt="Friendly AI assistant floating above a tablet with chat bubbles"
            className="h-full mt-10 w-full object-contain"
          />
        </figure>
        <div className="space-y-1.5 text-center">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Connect your AI assistant</h2>
          <p className="text-sm text-muted-foreground">Use ChatGPT, Claude, or Gemini with your teacher tools.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="agent-access-cta inline-flex min-h-16 w-full max-w-[280px] items-center justify-center gap-3 rounded-full bg-white px-7 text-primary-700 shadow-[0_4px_12px_var(--color-primary-100)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_var(--color-primary-150)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4">
          <span aria-hidden="true" className="relative z-10 flex shrink-0 items-center -space-x-2">
            {clients.map((client) => (
              <span key={client.id} className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-white p-1 shadow-sm">
                <img src={client.logo} alt="" className="h-full w-full object-contain" />
              </span>
            ))}
          </span>
          <span className="relative z-10 text-lg font-semibold">Install MCP</span>
        </button>
      </div>

      <ResponsivePopover open={open} onOpenChange={setOpen} title="Install MCP" compact contentClassName="pb-4">
        <Tabs value={activeClient} onValueChange={(value) => setActiveClient(value as ClientId)} className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-gray-100 p-1">
            {clients.map((client) => <TabsTrigger key={client.id} value={client.id} className="gap-1.5 px-1.5 py-2 text-xs sm:text-sm"><img src={client.logo} alt="" aria-hidden="true" className="size-4 object-contain" />{client.name}</TabsTrigger>)}
          </TabsList>
          {clients.map((client) => <TabsContent key={client.id} value={client.id} className="mt-5 space-y-4">
            <video key={client.video} src={client.video} aria-label={`How to install MCP in ${client.name}`} className="aspect-video w-full rounded-xl border border-gray-200 bg-[#f9f6f0] object-cover" autoPlay muted loop playsInline controls preload="metadata" />
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <input aria-label="MCP server URL" readOnly value={teacherMcpEndpoint} onFocus={(event) => event.currentTarget.select()} className="w-full bg-transparent px-1 text-xs text-gray-600 outline-none" />
            </div>
            <a href={client.href} target="_blank" rel="noopener noreferrer" onClick={() => { void copyUrl(); }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{client.action}<ArrowUpRight aria-hidden="true" className="size-4" /></a>
            <p role="status" className="text-center text-xs text-muted-foreground">
              {copyStatus === 'copied' ? 'MCP URL copied. Paste it into the opened page.' : copyStatus === 'failed' ? 'Could not copy the URL. Select it above to copy manually.' : `Opening ${client.name} also copies the MCP URL.`}
            </p>
          </TabsContent>)}
        </Tabs>
      </ResponsivePopover>
    </DashboardLayout>
  );
}
