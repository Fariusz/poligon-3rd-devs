import axios from 'axios';
import { JSDOM } from 'jsdom';
import { NodeHtmlMarkdown } from 'node-html-markdown';

interface CachedPage {
    markdown: string;
    links: string[];
    timestamp: number;
}

export class WebService {
    private cache: Map<string, CachedPage>;
    private readonly ttl: number; // Time to live in milliseconds
    private readonly nhm: NodeHtmlMarkdown;
    private readonly baseUrl: string;

    constructor(baseUrl: string = 'https://softo.ag3nts.org', ttl: number = 5 * 60 * 1000) {
        this.cache = new Map();
        this.ttl = ttl;
        this.nhm = new NodeHtmlMarkdown();
        this.baseUrl = baseUrl;
    }

    private resolveUrl(url: string): string {
        try {
            // If the URL is already absolute, return it
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            // Otherwise, resolve it against the base URL
            return new URL(url, this.baseUrl).toString();
        } catch (error) {
            console.error(`Error resolving URL ${url}:`, error);
            throw error;
        }
    }

    private isVisibleLink(element: Element): boolean {
        // Check if element or any of its parents is hidden
        let currentElement: Element | null = element;
        while (currentElement) {
            const style = currentElement.getAttribute('style') || '';
            const classList = currentElement.getAttribute('class') || '';
            
            // Check for common visibility-related styles and classes
            if (
                style.includes('display: none') ||
                style.includes('visibility: hidden') ||
                style.includes('opacity: 0') ||
                classList.includes('hidden') ||
                classList.includes('invisible') ||
                classList.includes('d-none')
            ) {
                return false;
            }
            
            currentElement = currentElement.parentElement;
        }
        return true;
    }

    private isValidUrl(url: string): boolean {
        try {
            // Check if it's an HTTP/HTTPS URL
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return false;
            }

            // Check if it's from the same domain
            if (!url.includes('softo.ag3nts.org')) {
                return false;
            }

            // Check for hidden page patterns
            const hiddenPatterns = [
                '/api/',
                '/admin/',
                '/private/',
                '/internal/',
                '/system/',
                '/dev/',
                '/test/',
                '/debug/',
                '/console/',
                '/log/',
                '/error/',
                '/404',
                '/500',
                '/maintenance',
                '/backup',
                '/temp',
                '/tmp',
                '/cache',
                '/.git',
                '/.env',
                '/config',
                '/settings',
                '/dashboard',
                '/login',
                '/register',
                '/signup',
                '/signin',
                '/logout',
                '/auth',
                '/oauth',
                '/token',
                '/session',
                '/cookie',
                '/tracking',
                '/analytics',
                '/stats',
                '/metrics',
                '/monitoring',
                '/health',
                '/status',
                '/ping',
                '/heartbeat',
                '/robots.txt',
                '/sitemap.xml',
                '/favicon.ico',
                '/.well-known',
                '/.htaccess',
                '/.htpasswd',
                '/.DS_Store',
                '/Thumbs.db'
            ];

            return !hiddenPatterns.some(pattern => url.includes(pattern));
        } catch {
            return false;
        }
    }

    private isCacheValid(timestamp: number): boolean {
        return Date.now() - timestamp < this.ttl;
    }

    private getFromCache(url: string): CachedPage | null {
        const cached = this.cache.get(url);
        if (cached && this.isCacheValid(cached.timestamp)) {
            console.log(`Cache hit for ${url}`);
            return cached;
        }
        return null;
    }

    private addToCache(url: string, markdown: string, links: string[]): void {
        this.cache.set(url, {
            markdown,
            links,
            timestamp: Date.now()
        });
        console.log(`Added ${url} to cache`);
    }

    public clearCache(): void {
        this.cache.clear();
    }

    async getPageContent(url: string): Promise<{ markdown: string; links: string[] }> {
        // Resolve the URL first
        const resolvedUrl = this.resolveUrl(url);
        console.log(`Resolved URL ${url} to ${resolvedUrl}`);

        // Check cache first
        const cached = this.getFromCache(resolvedUrl);
        if (cached) {
            return {
                markdown: cached.markdown,
                links: cached.links
            };
        }

        try {
            const response = await fetch(resolvedUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            
            // Create a virtual DOM
            const dom = new JSDOM(html, {
                url: resolvedUrl,
                runScripts: 'outside-only',
                resources: 'usable'
            });

            // Extract visible links
            const links = Array.from(dom.window.document.querySelectorAll('a[href]'))
                .filter(link => this.isVisibleLink(link))
                .map(link => {
                    const href = link.getAttribute('href');
                    if (!href) return null;
                    
                    try {
                        // Convert relative URLs to absolute
                        const absoluteUrl = new URL(href, resolvedUrl).toString();
                        return this.isValidUrl(absoluteUrl) ? absoluteUrl : null;
                    } catch {
                        return null;
                    }
                })
                .filter((url): url is string => url !== null);

            // Convert HTML to Markdown
            const markdown = this.nhm.translate(html);
            
            // Clean up the markdown
            const cleanedMarkdown = this.cleanMarkdown(markdown);

            // Cache the results
            this.addToCache(resolvedUrl, cleanedMarkdown, links);

            return {
                markdown: cleanedMarkdown,
                links
            };
        } catch (error) {
            console.error(`Error fetching ${resolvedUrl}:`, error);
            throw error;
        }
    }

    private cleanMarkdown(markdown: string): string {
        return markdown
            // Remove excessive newlines
            .replace(/\n{3,}/g, '\n\n')
            // Remove spaces around newlines
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n[ \t]+/g, '\n')
            // Remove leading/trailing whitespace
            .trim();
    }
} 