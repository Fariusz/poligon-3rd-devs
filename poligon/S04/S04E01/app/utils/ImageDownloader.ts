import axios from 'axios';

export class ImageDownloader {
    static async downloadAsBase64(imageUrl: string): Promise<string> {
        try {
            console.log(`Downloading image: ${imageUrl}`);
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const base64 = Buffer.from(response.data).toString('base64');
            return `data:image/png;base64,${base64}`;
        } catch (error) {
            console.error(`Error downloading image ${imageUrl}:`, error);
            throw new Error(`Failed to download image: ${imageUrl}`);
        }
    }

    static extractFilenameFromUrl(url: string): string {
        const parts = url.split('/');
        return parts[parts.length - 1] || '';
    }

    static buildImageUrl(filename: string): string {
        return `https://centrala.ag3nts.org/dane/barbara/${filename}`;
    }
}