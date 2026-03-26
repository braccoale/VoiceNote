
import { SiteReportData } from '../types';

export const mockAIService = {
    analyzeText: (text: string): SiteReportData => {
        const lower = text.toLowerCase();
        
        let weather = "Sereno";
        if (lower.includes("pioggia") || lower.includes("piove")) weather = "Pioggia";
        else if (lower.includes("nuvoloso") || lower.includes("coperto")) weather = "Nuvoloso";
        else if (lower.includes("nebbia")) weather = "Nebbia";

        let personnel = "Squadra Standard (3 Operai)";
        if (lower.includes("operaio")) {
           const match = lower.match(/(\d+)\s+opera/);
           if (match) personnel = `${match[1]} Operai presenti`;
        }

        // Generate a slightly more formal version of the text if possible
        const activities = `Rielaborazione attività: ${text}\n\nL'attività principale si è svolta con regolarità secondo il cronoprogramma.`;

        let issues = "-";
        if (lower.includes("problema") || lower.includes("ritardo") || lower.includes("errore")) {
            issues = "Rilevata criticità durante l'esecuzione: verificare le cause del ritardo/problema segnalato.";
        }

        let directives = "-";
        if (lower.includes("ordin") || lower.includes("direttiva") || lower.includes("bisogna")) {
             directives = "Emesso ordine di servizio verbale per la risoluzione immediata.";
        }

        const title = "Sopralluogo Cantiere Alfa"; // Max 3 parole

        return {
            title,
            weather,
            personnel,
            activities,
            issues,
            directives
        };
    }
};
