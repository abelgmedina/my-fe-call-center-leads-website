export const COMMAND_VIEWS = [
  'home',
  'quoter',
  'recruiting',
  'leads',
  'messaging',
  'dialer',
  'power-dialer',
  'messaging-setup',
  'leaderboard',
  'announcements',
  'resources',
  'inbound-calls',
  'ai-upline',
  'book-of-business',
  'agency-control',
  'agent-approvals',
  'agents',
  'lead-catalog',
  'call-queue',
  'system-health',
  'settings',
  'log-a-sale',
] as const;

export type CommandView = (typeof COMMAND_VIEWS)[number];

export type CommandNavItem = {
  label: string;
  href: string;
  view: CommandView;
  icon: string;
};
export const FRONT_NAV: CommandNavItem[] = [
  { label: 'Home', href: '/dashboard', view: 'home', icon: '⌂' },
  { label: 'Smart Quoter', href: '/quoter', view: 'quoter', icon: '◈' },
  { label: 'Recruiting', href: '/recruiting', view: 'recruiting', icon: '♙' },
  { label: 'Leads', href: '/leads', view: 'leads', icon: '◎' },
  { label: 'Messaging', href: '/messaging', view: 'messaging', icon: '◌' },
  { label: 'Dialer', href: '/dialer', view: 'dialer', icon: '◒' },
  { label: 'Power Dialer', href: '/power-dialer', view: 'power-dialer', icon: 'Ⅲ' },
  { label: 'Messaging Setup', href: '/messaging-setup', view: 'messaging-setup', icon: '⚙' },
  { label: 'Leaderboard', href: '/leaderboard', view: 'leaderboard', icon: '⌁' },
  { label: 'Announcements', href: '/announcements', view: 'announcements', icon: '◆' },
  { label: 'Resources', href: '/resources', view: 'resources', icon: '▤' },
  { label: 'Inbound Calls', href: '/inbound-calls', view: 'inbound-calls', icon: '↙' },
  { label: 'AI Upline', href: '/ai', view: 'ai-upline', icon: '✦' },
];

export const BACK_NAV: CommandNavItem[] = [
  { label: 'Book of Business', href: '/book-of-business', view: 'book-of-business', icon: '▣' },
  { label: 'Agency Control', href: '/agency-control', view: 'agency-control', icon: '◉' },
  { label: 'Agent Approvals', href: '/agent-approvals', view: 'agent-approvals', icon: '✓' },
  { label: 'Agents', href: '/agents', view: 'agents', icon: '♟' },
  { label: 'Lead Catalog', href: '/lead-catalog', view: 'lead-catalog', icon: '▦' },
  { label: 'Call Queue', href: '/call-queue', view: 'call-queue', icon: '≡' },
  { label: 'System Health', href: '/system-health', view: 'system-health', icon: '♥' },
  { label: 'Settings', href: '/settings', view: 'settings', icon: '⚙' },
];

export const VIEW_TITLES: Record<CommandView, string> = {
  home: 'Command Center', quoter: 'Smart Quoter', recruiting: 'Recruiting', leads: 'Leads', messaging: 'Messaging', dialer: 'Dialer', 'power-dialer': 'Power Dialer', 'messaging-setup': 'Messaging Setup', leaderboard: 'Leaderboard', announcements: 'Announcements', resources: 'Resources', 'inbound-calls': 'Inbound Calls', 'ai-upline': 'AI Upline', 'book-of-business': 'Book of Business', 'agency-control': 'Agency Control', 'agent-approvals': 'Agent Approvals', agents: 'Agents', 'lead-catalog': 'Lead Catalog', 'call-queue': 'Call Queue', 'system-health': 'System Health', settings: 'Settings', 'log-a-sale': 'Log a Sale',
};
