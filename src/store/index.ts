import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, SiteReport } from '../types';

class ProjectStore {
  private projects: Project[] = [];
  private STORAGE_KEY = 'voice-order-projects';

  async load() {
    try {
      const json = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (json) this.projects = JSON.parse(json);
    } catch (e) {
      console.error('Failed to load projects', e);
    }
  }

  private async _save() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.projects));
    } catch (e) {
      console.error('Failed to save projects', e);
    }
  }

  getProjects(): Project[] {
    return this.projects;
  }

  getProject(id: string): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }

  addProject(project: Project) {
    this.projects.push(project);
    this._save();
  }

  updateProject(updated: Project) {
    const idx = this.projects.findIndex(p => p.id === updated.id);
    if (idx !== -1) {
      this.projects[idx] = updated;
      this._save();
    }
  }

  getOrCreateDefaultProject(): Project {
    let def = this.projects.find(p => p.id === 'default-main');
    if (!def) {
      def = {
        id: 'default-main',
        name: 'Diario di Lavoro',
        address: 'Generale',
        createdAt: new Date().toISOString(),
        reports: [],
      };
      this.projects.push(def);
      this._save();
    }
    return def;
  }

  addReport(projectId: string, report: SiteReport) {
    const project = this.getProject(projectId);
    if (project) {
      if (!project.reports) project.reports = [];
      project.reports.unshift(report);
      this._save();
    }
  }

  updateReport(projectId: string, updatedReport: SiteReport) {
    const project = this.getProject(projectId);
    if (project?.reports) {
      const index = project.reports.findIndex(r => r.id === updatedReport.id);
      if (index !== -1) {
        project.reports[index] = updatedReport;
        this._save();
      }
    }
  }

  deleteReport(projectId: string, reportId: string) {
    const project = this.getProject(projectId);
    if (project?.reports) {
      project.reports = project.reports.filter(r => r.id !== reportId);
      this._save();
    }
  }

  deleteProject(id: string) {
    this.projects = this.projects.filter(p => p.id !== id);
    this._save();
  }

  /** Sostituisce tutti i progetti con quelli sincronizzati dal server */
  replaceAll(projects: Project[]) {
    this.projects = projects;
    this._save();
  }
}

export const projectStore = new ProjectStore();
