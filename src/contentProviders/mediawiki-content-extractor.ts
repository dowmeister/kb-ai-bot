import { Page } from "playwright";
import { BaseContentExtractor } from "./base-content-extractor";

/**
 * MediaWiki content extractor
 */
export class MediaWikiContentExtractor extends BaseContentExtractor {
  name = 'mediawiki';
  
  async detect(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      // Check for MediaWiki-specific elements
      return !!(
        document.querySelector('meta[name="generator"][content*="MediaWiki"]') ||
        document.querySelector('#mw-content-text') ||
        document.querySelector('.mw-parser-output') ||
        document.querySelector('body.mediawiki') ||
        document.querySelector('.vector-menu-content')
      );
    });
  }
  
  async extract(page: Page): Promise<PageContent> {
    return await page.evaluate(() => {
      // Get the page title
      const pageTitle = document.querySelector('h1#firstHeading')?.textContent?.trim() || 
                       document.title.trim().replace(/ - .* Wiki$/, '');
      
      // Remove unwanted elements
      const elementsToRemove = [
        '.mw-navigation',
        '#mw-panel',
        '#mw-head',
        '#mw-footer',
        '.printfooter',
        '.mw-editsection',
        '.mw-jump-link',
        '.catlinks',
        'script',
        'style',
        '.mw-indicators',
        '.noprint',
        '#p-search',
        '.mw-jumptotop',
        '.mw-redirectedfrom',
        '#privacy-policy-link',
        '#footer',
        '.navigation-not-searchable'
      ];
      
      elementsToRemove.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });
      
      // Get the main content element
      const contentElement = document.querySelector('#mw-content-text') || 
                            document.querySelector('.mw-parser-output') || 
                            document.body;
      
      // Extract tables separately
      const tables = Array.from(contentElement.querySelectorAll('table.wikitable, table.sortable'));
      let tableContent = '';
      
      tables.forEach(table => {
        const caption = table.querySelector('caption');
        if (caption) {
          tableContent += caption.textContent?.trim() + '\n\n';
        }
        
        const rows = Array.from(table.querySelectorAll('tr'));
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          const rowText = cells
            .map(cell => cell.textContent?.trim())
            .filter(Boolean)
            .join(' | ');
            
          if (rowText) {
            tableContent += rowText + '\n';
          }
        });
        
        tableContent += '\n';
      });
      
      // Get paragraphs and headings
      const contentNodes = Array.from(
        contentElement.querySelectorAll('p, h2, h3, h4, h5, h6, li, .mw-headline')
      );
      
      const processedTexts = new Set<string>();
      const contentParts: string[] = [];
      
      contentNodes.forEach(node => {
        const text = node.textContent?.trim() || '';
        
        // Skip very short or already processed text
        if (text.length < 20 || processedTexts.has(text)) {
          return;
        }
        
        // Format headings
        if (node.tagName.match(/^H[2-6]$/) || node.classList.contains('mw-headline')) {
          contentParts.push('== ' + text + ' ==');
        } else {
          contentParts.push(text);
        }
        
        processedTexts.add(text);
      });
      
      // Combine all content
      let finalContent = contentParts.join('\n\n');
      
      // Add table content if available
      if (tableContent) {
        finalContent += '\n\n' + tableContent;
      }
      
      // Final cleanup
      finalContent = finalContent
        .replace(/\[\d+\]/g, '') // Remove citation numbers [1], [2], etc.
        .replace(/\(edit\)/gi, '') // Remove edit links
        .replace(/Retrieved from.*$/gm, '') // Remove "Retrieved from" footer
        .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
        .replace(/\s{3,}/g, '\n\n') // Replace triple+ spaces with double newline
        .replace(/\n{3,}/g, '\n\n') // Replace triple+ newlines with double newline
        .replace(/\n==\s+/g, '\n\n== ') // Ensure headings have space before
        .replace(/\s+==\n/g, ' ==\n\n') // Ensure headings have space after
        .trim();
      
      return {
        title: pageTitle,
        content: finalContent
      };
    });
  }
}