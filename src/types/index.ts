export type TemplateType = 'cantiere' | 'sopralluogo' | 'verbale' | 'manutenzione';

export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  cantiere: 'Giornale di Cantiere',
  sopralluogo: 'Verbale di Sopralluogo',
  verbale: 'Verbale di Riunione',
  manutenzione: 'Rapporto Manutenzione',
};

export const TEMPLATE_ICONS: Record<TemplateType, string> = {
  cantiere: '🏗️',
  sopralluogo: '🔍',
  verbale: '📋',
  manutenzione: '🔧',
};

export interface SiteReportData {
  weather: string;
  personnel: string;
  title?: string;
  activities: string;
  issues: string;
  directives: string;
}

export interface SiteReport {
  id: string;
  projectId: string;
  date: string; // ISO string
  template?: TemplateType;
  rawAudioUri?: string;
  rawTranscription?: string;
  data: SiteReportData;
  photos?: ReportPhoto[];
  signature?: string; // Base64 PNG
  syncedAt?: string;  // ISO — quando è stato sincronizzato nel cloud
}

export interface ReportPhoto {
  uri: string;
  base64?: string;
  caption?: string;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  reports: SiteReport[];
}

export interface OfflineQueueItem {
  id: string;
  projectId: string;
  audioUri: string;
  template: TemplateType;
  createdAt: string;
}
