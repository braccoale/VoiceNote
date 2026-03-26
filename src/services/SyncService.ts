import { supabase } from '../lib/supabase';
import { Project, SiteReport } from '../types';

/**
 * Sincronizza dati locali con Supabase.
 * Strategia: "last write wins" — il record con updated_at più recente prevale.
 */
export class SyncService {
  // ─── PROJECTS ───────────────────────────────────────────────

  async upsertProject(project: Project, userId: string): Promise<void> {
    const { error } = await supabase.from('projects').upsert({
      id: project.id,
      user_id: userId,
      name: project.name,
      address: project.address,
      created_at: project.createdAt,
    }, { onConflict: 'id' });
    if (error) throw new Error(`Sync project failed: ${error.message}`);
  }

  async fetchProjects(userId: string): Promise<Omit<Project, 'reports'>[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, address, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Fetch projects failed: ${error.message}`);
    return (data ?? []).map(r => ({
      id: r.id,
      name: r.name,
      address: r.address,
      createdAt: r.created_at,
      reports: [],
    }));
  }

  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw new Error(`Delete project failed: ${error.message}`);
  }

  // ─── REPORTS ────────────────────────────────────────────────

  async upsertReport(report: SiteReport, userId: string): Promise<void> {
    const { error } = await supabase.from('reports').upsert({
      id: report.id,
      project_id: report.projectId,
      user_id: userId,
      date: report.date,
      template_type: report.template ?? 'cantiere',
      raw_transcription: report.rawTranscription ?? null,
      title: report.data.title ?? null,
      weather: report.data.weather,
      personnel: report.data.personnel,
      activities: report.data.activities,
      issues: report.data.issues,
      directives: report.data.directives,
      signature: report.signature ?? null,
      photos: JSON.stringify(report.photos ?? []),
      synced_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) throw new Error(`Sync report failed: ${error.message}`);
  }

  async fetchReports(projectId: string): Promise<SiteReport[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false });
    if (error) throw new Error(`Fetch reports failed: ${error.message}`);
    return (data ?? []).map(this._mapRow);
  }

  async deleteReport(reportId: string): Promise<void> {
    const { error } = await supabase.from('reports').delete().eq('id', reportId);
    if (error) throw new Error(`Delete report failed: ${error.message}`);
  }

  async searchReports(userId: string, query: string): Promise<SiteReport[]> {
    if (!query.trim()) return [];
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .textSearch('activities', query, { type: 'plain', config: 'italian' })
      .order('date', { ascending: false })
      .limit(50);
    if (error) {
      // Fallback: ILIKE semplice
      const { data: d2 } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .ilike('activities', `%${query}%`)
        .order('date', { ascending: false })
        .limit(50);
      return (d2 ?? []).map(this._mapRow);
    }
    return (data ?? []).map(this._mapRow);
  }

  // ─── FULL SYNC (pull + push) ─────────────────────────────────

  async syncAll(localProjects: Project[], userId: string): Promise<Project[]> {
    // 1. Push tutti i progetti locali
    for (const p of localProjects) {
      await this.upsertProject(p, userId).catch(console.warn);
      for (const r of p.reports) {
        await this.upsertReport(r, userId).catch(console.warn);
      }
    }

    // 2. Pull dal server
    const serverProjects = await this.fetchProjects(userId);
    const merged: Project[] = [];
    for (const sp of serverProjects) {
      const serverReports = await this.fetchReports(sp.id);
      merged.push({ ...sp, reports: serverReports });
    }
    return merged;
  }

  private _mapRow(r: any): SiteReport {
    return {
      id: r.id,
      projectId: r.project_id,
      date: r.date,
      template: r.template_type,
      rawTranscription: r.raw_transcription ?? undefined,
      data: {
        title: r.title ?? undefined,
        weather: r.weather ?? '',
        personnel: r.personnel ?? '',
        activities: r.activities ?? '',
        issues: r.issues ?? '',
        directives: r.directives ?? '',
      },
      signature: r.signature ?? undefined,
      photos: typeof r.photos === 'string' ? JSON.parse(r.photos) : (r.photos ?? []),
      syncedAt: r.synced_at ?? undefined,
    };
  }
}

export const syncService = new SyncService();
