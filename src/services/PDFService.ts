import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { settingsStore } from '../store/SettingsStore';
import { Project, SiteReport } from '../types';

export const generateSiteReportPDF = async (project: Project, report: SiteReport) => {
  // Load Logo
  await settingsStore.load();
  const settings = settingsStore.getSettings();
  const logoBase64 = settings.logoBase64;
  const companyName = settings.companyName || "Studio Tecnico";

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; }
            .header { border-bottom: 3px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #1e293b; }
            .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
            
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .meta-item { background: #f8fafc; padding: 15px; border-left: 4px solid #cbd5e1; }
            .label { font-size: 10px; text-transform: uppercase; font-weight: bold; color: #94a3b8; margin-bottom: 5px; }
            .value { font-size: 14px; font-weight: 500; color: #0f172a; }

            .section { margin-bottom: 30px; }
            .section-header { background: #1e293b; color: white; padding: 8px 15px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 15px; border-radius: 4px; }
            .content-box { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.5; background: white; }
            
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; paddingTop: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .signature-box { width: 200px; text-align: center; }
            .signature-line { border-top: 1px solid #333; margin-top: 5px; font-size: 12px; padding-top: 5px; }
            .logo-container { width: 80px; height: 80px; margin-right: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
            <div style="display: flex; align-items: center;">
                 ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="width: 80px; height: 80px; object-fit: contain; margin-right: 20px;" />` : ''}
                <div>
                    <div class="title">Giornale di Cantiere</div>
                    <div class="subtitle">${companyName} - Report Giornaliero Lavori</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div class="value" style="color: #f59e0b; font-size: 18px;">#${report.id.substring(0, 6)}</div>
            </div>
        </div>

        <div class="meta-grid">
            <div class="meta-item">
                <div class="label">Progetto/Cantiere</div>
                <div class="value">${project.name}</div>
                <div class="value" style="font-size: 12px; color: #666;">${project.address}</div>
            </div>
            <div class="meta-item">
                <div class="label">Data Sopralluogo</div>
                <div class="value">${new Date(report.date).toLocaleDateString()}</div>
                <div class="value" style="font-size: 12px; color: #666;">Alle ore ${new Date(report.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
        </div>

        <div class="meta-grid">
             <div class="meta-item">
                <div class="label">Meteo Rilevato</div>
                <div class="value">${report.data.weather || "-"}</div>
            </div>
             <div class="meta-item">
                <div class="label">Personale Presente</div>
                <div class="value">${report.data.personnel || "-"}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">Attività Svolte</div>
            <div class="content-box">
                ${report.data.activities ? report.data.activities.replace(/\n/g, '<br>') : "-"}
            </div>
        </div>

        <div class="section">
            <div class="section-header" style="background: #ef4444;">Criticità Rilevate</div>
            <div class="content-box" style="border-left: 4px solid #ef4444;">
                ${report.data.issues ? report.data.issues.replace(/\n/g, '<br>') : "Nessuna criticità rilevata."}
            </div>
        </div>

        <div class="section">
            <div class="section-header" style="background: #f59e0b; color: black;">Ordini di Servizio / Direttive</div>
             <div class="content-box">
                ${report.data.directives ? report.data.directives.replace(/\n/g, '<br>') : "Nessuna direttiva specifica."}
            </div>
        </div>

        <div class="footer">
            <div style="font-size: 10px; color: #999;">
                Generato automaticamente da SiteVoice AI<br>
                ID Univoco: ${report.id}
            </div>
            <div class="signature-box">
                ${report.signature ? `<img src="${report.signature}" style="width: 150px; height: auto; margin-bottom: 5px;" />` : '<div style="height: 50px;"></div>'}
                <div class="signature-line">
                    Firma del Direttore dei Lavori
                </div>
            </div>
        </div>

        ${report.photos && report.photos.length > 0 ? `
        <div style="page-break-before: always;">
            <div class="header">
                <div class="title" style="font-size: 18px;">Documentazione Fotografica</div>
                <div class="subtitle">${new Date(report.date).toLocaleDateString()}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                ${report.photos.map(photo => `
                    <div style="break-inside: avoid; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; background: white;">
                        <img src="data:image/jpeg;base64,${photo.base64}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;" />
                        ${photo.caption ? `<p style="margin-top: 8px; font-size: 12px; color: #475569; font-style: italic; text-align: center;">${photo.caption}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    console.log('File has been saved to:', uri);
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};
