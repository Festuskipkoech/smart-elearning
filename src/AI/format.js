import React from 'react';

export const FormattedMessage = ({ content }) => {
  // Enhanced helper function to process inline formatting
  const formatInlineText = (text) => {
    // Skip processing if the text already contains HTML tags
    if (text.includes('<span') || text.includes('<code>')) {
      return text;
    }

    return text
      // Handle bold with double asterisks
      .replace(/\*\*\*(.*?)\*\*\*/g, '<span class="font-bold italic">$1</span>')
      .replace(/\*\*(.*?)\*\*/g, '<span class="font-bold">$1</span>')
      // Handle italic with single asterisk
      .replace(/\*((?!\*)[^*]+)\*/g, '<span class="italic">$1</span>')
      // Handle code blocks
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded font-mono text-sm">$1</code>');
  };

  const formatContent = (text) => {
    // Normalize line endings and split into sections
    const sections = text.split('\n').map(line => line.replace(/\r$/, ''));
    const formattedSections = [];
    let currentSection = null;
    let listLevel = 0;

    const closeCurrentSection = (index) => {
      if (!currentSection) return;

      if (currentSection.type === 'paragraph') {
        formattedSections.push(
          <p
            key={`p-${index}`}
            className="text-gray-700 mb-4 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: formatInlineText(currentSection.content.join(' '))
            }}
          />
        );
      } else if (currentSection.type === 'code') {
        formattedSections.push(
          <pre
            key={`code-${index}`}
            className="bg-gray-50 p-4 rounded-lg my-3 font-mono text-sm overflow-x-auto border border-gray-200"
          >
            <code>{currentSection.content.join('\n')}</code>
          </pre>
        );
      }
      currentSection = null;
    };

    sections.forEach((line, index) => {
      const trimmedLine = line.replace(/\s+$/, '');

      // Handle different section types
      if (trimmedLine.match(/^#\s+[^#]/)) {
        closeCurrentSection(index);
        formattedSections.push(
          <h1
            key={`h1-${index}`}
            className="text-2xl font-bold text-gray-900 mt-6 mb-4"
            dangerouslySetInnerHTML={{
              __html: formatInlineText(trimmedLine.replace(/^#\s+/, ''))
            }}
          />
        );
      }
      else if (trimmedLine.match(/^##\s+/)) {
        closeCurrentSection(index);
        formattedSections.push(
          <h2
            key={`h2-${index}`}
            className="text-xl font-bold text-gray-800 mt-5 mb-3"
            dangerouslySetInnerHTML={{
              __html: formatInlineText(trimmedLine.replace(/^##\s+/, ''))
            }}
          />
        );
      }
      else if (trimmedLine.match(/^###\s+/)) {
        closeCurrentSection(index);
        formattedSections.push(
          <h3
            key={`h3-${index}`}
            className="text-lg font-semibold text-gray-700 mt-4 mb-2"
            dangerouslySetInnerHTML={{
              __html: formatInlineText(trimmedLine.replace(/^###\s+/, ''))
            }}
          />
        );
      }
      // Enhanced unordered list handling
      else if (trimmedLine.match(/^\s*[\*\-•]\s/)) {
        const nestLevel = (trimmedLine.match(/^\s*/) || [''])[0].length / 2;
        
        if (!currentSection || currentSection.type !== 'unordered-list' || listLevel !== nestLevel) {
          closeCurrentSection(index);
          currentSection = {
            type: 'unordered-list',
            items: [],
            level: nestLevel
          };
          formattedSections.push(currentSection);
          listLevel = nestLevel;
        }

        const listItemContent = trimmedLine.replace(/^\s*[\*\-•]\s/, '');
        currentSection.items.push(
          <li
            key={`ul-${index}`}
            className={`mb-2 text-gray-700 leading-relaxed ${
              nestLevel > 0 ? `ml-${nestLevel * 4}` : ''
            }`}
            dangerouslySetInnerHTML={{
              __html: formatInlineText(listItemContent)
            }}
          />
        );
      }
      // Ordered list items (preserved from original)
      else if (trimmedLine.match(/^\s*\d+\.\s/)) {
        const nestLevel = (trimmedLine.match(/^\s*/) || [''])[0].length / 2;
        
        if (!currentSection || currentSection.type !== 'ordered-list' || listLevel !== nestLevel) {
          closeCurrentSection(index);
          currentSection = {
            type: 'ordered-list',
            items: [],
            level: nestLevel
          };
          formattedSections.push(currentSection);
          listLevel = nestLevel;
        }

        currentSection.items.push(
          <li
            key={`ol-${index}`}
            className={`mb-2 text-gray-700 ${
              nestLevel > 0 ? `ml-${nestLevel * 4}` : ''
            }`}
            dangerouslySetInnerHTML={{
              __html: formatInlineText(trimmedLine.replace(/^\s*\d+\.\s/, ''))
            }}
          />
        );
      }
      // Code blocks
      else if (trimmedLine.startsWith('```')) {
        if (!currentSection || currentSection.type !== 'code') {
          closeCurrentSection(index);
          currentSection = { type: 'code', content: [] };
        } else {
          closeCurrentSection(index);
        }
      }
      else if (currentSection?.type === 'code') {
        currentSection.content.push(trimmedLine);
      }
      // Regular paragraphs
      else if (trimmedLine.trim()) {
        if (!currentSection || currentSection.type !== 'paragraph') {
          closeCurrentSection(index);
          currentSection = { type: 'paragraph', content: [] };
          formattedSections.push(currentSection);
        }
        currentSection.content.push(trimmedLine);
      }
      // Empty lines
      else if (trimmedLine === '') {
        closeCurrentSection(index);
        listLevel = 0;
      }
    });

    // Close any remaining section
    closeCurrentSection(sections.length);

    // Process all sections and convert them to proper React elements
    return formattedSections.map((section, index) => {
      if (React.isValidElement(section)) {
        return section;
      }

      if (section?.type === 'unordered-list') {
        return (
          <ul
            key={`ul-${index}`}
            className="my-4 pl-6 list-disc list-outside space-y-2"
          >
            {section.items}
          </ul>
        );
      }
      if (section?.type === 'ordered-list') {
        return (
          <ol
            key={`ol-${index}`}
            className="my-4 pl-6 list-decimal list-outside space-y-2"
          >
            {section.items}
          </ol>
        );
      }
      return null; // Handle any unexpected section types
    });
  };

  return (
    <div className="formatted-message prose prose-gray max-w-none">
      {formatContent(content)}
    </div>
  );
};