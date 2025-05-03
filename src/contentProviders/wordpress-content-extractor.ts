import { Page } from "playwright";
import { BaseContentExtractor } from "./base-content-extractor";

/**
 * WordPress content extractor
 */
export class WordPressContentExtractor extends BaseContentExtractor {
  name = 'wordpress';
  
  async detect(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      // Check for WordPress-specific elements
      return !!(
        document.querySelector('meta[name="generator"][content*="WordPress"]') ||
        document.querySelector('#wpadminbar') ||
        document.body.classList.contains('wp-') ||
        document.querySelector('.wp-block-') ||
        document.querySelector('link[rel="https://api.w.org/"]')
      );
    });
  }
  
  async extract(page: Page): Promise<PageContent> {
    return await page.evaluate(() => {
      // Get the page title
      const pageTitle = document.querySelector('.entry-title, .post-title')?.textContent?.trim() || 
                       document.title.trim();
      
      // Find main content container
      let contentElement = document.querySelector('.entry-content, .post-content, article');
      
      if (!contentElement || !contentElement.textContent || contentElement.textContent.trim().length < 20) {
        // Fallback to common WordPress content selectors
        const selectors = [
          '.entry-content',
          '.post-content',
          'article',
          '#content',
          '.content',
          '.post',
          '.page',
          '.type-post',
          '.type-page'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent && element.textContent.trim().length >= 20) {
            contentElement = element;
            break;
          }
        }
      }
      
      // Fallback to body if still not found
      if (!contentElement) {
        contentElement = document.body;
      }
      
      // Extract paragraphs and headings
      const contentNodes = Array.from(
        contentElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote')
      );
      
      const processedTexts = new Set<string>();
      const contentParts: string[] = [];
      
      contentNodes.forEach(node => {
        const text = node.textContent?.trim() || '';
        
        // Skip very short or already processed text
        if (text.length < 20 || processedTexts.has(text)) {
          return;
        }
        
        processedTexts.add(text);
        contentParts.push(text);
      });
      
      // Join with newlines
      let finalContent = contentParts.join('\n\n');
      
      // Final cleanup
      finalContent = finalContent
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&lt;/g, '<') // Replace &lt; with 
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .replace(/\s{3,}/g, '\n\n') // Replace multiple spaces with newlines
        .trim();
      
      return {
        title: pageTitle,
        content: finalContent
      };
    });
  }
}