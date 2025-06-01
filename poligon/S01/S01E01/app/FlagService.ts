export class FlagService {
    extractFlag(content: string): string | null {
        const flagMatch = content.match(/FLG:([^}]+)}}/);
        return flagMatch ? flagMatch[1] : null;
    }
} 