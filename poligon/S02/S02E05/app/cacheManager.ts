import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const CACHE_DIR = path.join(__dirname, '../data/cache');

// Create cache directory if it doesn't exist
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Generates a cache key for a file based on its content
 */
function generateCacheKey(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Gets the cache file path for a given file and type
 */
function getCachePath(filePath: string, type: 'image' | 'audio'): string {
    const cacheKey = generateCacheKey(filePath);
    return path.join(CACHE_DIR, `${type}_${cacheKey}.txt`);
}

/**
 * Checks if a cache exists for a file
 */
export function hasCache(filePath: string, type: 'image' | 'audio'): boolean {
    const cachePath = getCachePath(filePath, type);
    return fs.existsSync(cachePath);
}

/**
 * Gets cached content for a file
 */
export function getCache(filePath: string, type: 'image' | 'audio'): string | null {
    const cachePath = getCachePath(filePath, type);
    if (fs.existsSync(cachePath)) {
        return fs.readFileSync(cachePath, 'utf-8');
    }
    return null;
}

/**
 * Saves content to cache
 */
export function saveCache(filePath: string, type: 'image' | 'audio', content: string): void {
    const cachePath = getCachePath(filePath, type);
    fs.writeFileSync(cachePath, content);
}

/**
 * Clears all cache files
 */
export function clearCache(): void {
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
    }
}

/**
 * Gets cache statistics
 */
export function getCacheStats(): { totalFiles: number; totalSize: number } {
    const files = fs.readdirSync(CACHE_DIR);
    let totalSize = 0;
    
    for (const file of files) {
        const stats = fs.statSync(path.join(CACHE_DIR, file));
        totalSize += stats.size;
    }
    
    return {
        totalFiles: files.length,
        totalSize
    };
} 