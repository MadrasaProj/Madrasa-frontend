import { useState } from 'react';
import { ArrowUpRight, Bot, Check, Copy } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResponsivePopover } from '@/components/ui/responsivePopover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { teacherMcpEndpoint } from '@/lib/teacher-mcp-api';

const assetRoot = '/images/teacher/agent-access';
const clients = [
  { id: 'chatgpt', name: 'ChatGPT', logo: `${assetRoot}/chatgpt.svg`, video: '/videos/teacher/agent-access/chatgpt.mp4', href: 'https://chatgpt.com/plugins', action: 'Open ChatGPT Plugins' },
  { id: 'claude', name: 'Claude', logo: `${assetRoot}/claude.svg`, video: '/videos/teacher/agent-access/claude.mp4', href: 'https://claude.ai/customize/connectors', action: 'Open Claude Connectors' },
  { id: 'gemini', name: 'Gemini', logo: `${assetRoot}/gemini.svg`, video: '/videos/teacher/agent-access/gemini.mp4', href: 'https://gemini.google.com/devmode', action: 'Open Gemini Developer Mode' },
] as const;
type ClientId = (typeof clients)[number]['id'];

function ClientLogo({ client, small = false }: { client: (typeof clients)[number]; small?: boolean }) {
  return <span className={`flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm ${small ? 'size-8 p-1.5' : 'size-10 p-2'}`}><img src={client.logo} alt={`${client.name} logo`} className="h-full w-full object-contain" /></span>;
}

export default function TeacherAgentAccessPage() {
  const [open, setOpen] = useState(false);
  const [activeClient, setActiveClient] = useState<ClientId>('chatgpt');
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(teacherMcpEndpoint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Agent access" icon={Bot} />
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-5 pb-12 pt-8 sm:gap-7 sm:pt-10">
        <figure className="relative aspect-square w-full max-w-[410px]" aria-label="A teacher connecting to ChatGPT, Claude, and Gemini">
          <img src={`${assetRoot}/hero.webp`} alt="Teacher using a tablet" className="h-full w-full object-contain" />
          <div className="absolute left-[18%] top-[20%] -translate-x-1/2 -translate-y-1/2"><ClientLogo client={clients[0]} /></div>
          <div className="absolute left-[50%] top-[13%] -translate-x-1/2 -translate-y-1/2"><ClientLogo client={clients[1]} /></div>
          <div className="absolute left-[81%] top-[20%] -translate-x-1/2 -translate-y-1/2"><ClientLogo client={clients[2]} /></div>
        </figure>
        <button type="button" onClick={() => setOpen(true)} className="group flex w-full max-w-[310px] items-center gap-3 rounded-2xl border border-emerald-200/80 bg-white px-4 py-3.5 text-left text-gray-900 shadow-[0_0_0_4px_rgba(121,191,139,0.08),0_10px_32px_rgba(51,112,68,0.13)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_0_0_5px_rgba(121,191,139,0.13),0_14px_38px_rgba(51,112,68,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-4">
          <span className="flex shrink-0 items-center pl-1.5">{clients.map((client, index) => <span key={client.id} className={index === 0 ? '' : '-ml-2.5'}><ClientLogo client={client} small /></span>)}</span>
          <span className="min-w-0 flex-1 text-sm font-semibold">Install MCP</span>
          <ArrowUpRight aria-hidden="true" className="size-4 text-gray-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      <ResponsivePopover open={open} onOpenChange={setOpen} title="Install MCP" compact contentClassName="pb-4">
        <Tabs value={activeClient} onValueChange={(value) => setActiveClient(value as ClientId)} className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-gray-100 p-1">
            {clients.map((client) => <TabsTrigger key={client.id} value={client.id} className="gap-1.5 px-1.5 py-2 text-xs sm:text-sm"><img src={client.logo} alt="" aria-hidden="true" className="size-4 object-contain" />{client.name}</TabsTrigger>)}
          </TabsList>
          {clients.map((client) => <TabsContent key={client.id} value={client.id} className="mt-5 space-y-4">
            <video key={client.video} src={client.video} aria-label={`How to install MCP in ${client.name}`} className="aspect-video w-full rounded-xl border border-gray-200 bg-[#f9f6f0] object-cover" autoPlay muted loop playsInline controls preload="metadata" />
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
              <input aria-label="MCP server URL" readOnly value={teacherMcpEndpoint} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 bg-transparent px-2 text-xs text-gray-600 outline-none" />
              <button type="button" onClick={copyUrl} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy URL'}</button>
            </div>
            <a href={client.href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#527F37] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#41672c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">{client.action}<ArrowUpRight aria-hidden="true" className="size-4" /></a>
          </TabsContent>)}
        </Tabs>
      </ResponsivePopover>
    </DashboardLayout>
  );
}
