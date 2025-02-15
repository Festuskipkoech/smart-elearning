import React from 'react';

export const FormattedMessage = ({ content }) => {
  const formatInlineText = (text) => {
    // If the text already contains HTML tags like <span> or <code>, skip re-formatting
    if (text.includes('<span') || text.includes('<code>')) {
      return text;
    }

    return text
      // Bold + Italic: ***text***
      .replace(/\*\*\*(.*?)\*\*\*/g, '<span class="font-bold italic">$1</span>')
      // Bold: **text**
      .replace(/\*\*(.*?)\*\*/g, '<span class="font-bold">$1</span>')
      // Italic: *text*
      .replace(/\*((?!\*)[^*]+)\*/g, '<span class="italic">$1</span>')
      // Inline code: `text`
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded font-mono text-sm">$1</code>');
  };

  const formatContent = (text) => {
    // Split on actual newline characters
    const sections = text.split('\n').map(line => line.replace(/\r$/, ''));
    
    const formattedSections = [];
    let currentSection = null;
    let listLevel = 0;
    let inCodeBlock = false;
    let codeLanguage = '';

    const closeCurrentSection = (index) => {
      if (!currentSection) return;

      // Close out paragraph sections
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
      }
      // Close out code blocks
      else if (currentSection.type === 'code') {
        formattedSections.push(
          <pre
            key={`code-${index}`}
            className="bg-gray-50 p-4 rounded-lg my-3 font-mono text-sm overflow-x-auto border border-gray-200"
          >
            <code className={codeLanguage ? `language-${codeLanguage}` : ''}>
              {currentSection.content.join('\n')}
            </code>
          </pre>
        );
      }
      currentSection = null;
    };

    sections.forEach((line, index) => {
      const trimmedLine = line.replace(/\s+$/, '');
      const indentMatch = line.match(/^(\s*)/);
      const indentSize = indentMatch ? indentMatch[1].length : 0;

      // ------------------------------------------------
      // 1) CODE BLOCK HANDLING (```lang ... ```)
      // ------------------------------------------------
      if (trimmedLine.match(/^```(\w*)$/)) {
        // Opening code block
        if (!inCodeBlock) {
          closeCurrentSection(index);
          inCodeBlock = true;
          codeLanguage = trimmedLine.match(/^```(\w*)$/)[1];
          currentSection = { type: 'code', content: [] };
        } 
        // Closing code block
        else {
          inCodeBlock = false;
          closeCurrentSection(index);
          codeLanguage = '';
        }
        return;
      }

      // If we are in a code block, just keep pushing lines to currentSection
      if (inCodeBlock && currentSection?.type === 'code') {
        currentSection.content.push(line);
        return;
      }

      // ------------------------------------------------
      // 2) HEADINGS (#, ##, ###)
      // ------------------------------------------------
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

      // ------------------------------------------------
      // 3) UNORDERED LISTS (*, -, •)
      // ------------------------------------------------
      else if (trimmedLine.match(/^\s*[\*\-•]\s/)) {
        const nestLevel = Math.floor(indentSize / 2);

        // If we aren't currently building an unordered list (or the nesting level changed), close out the old section
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
            className={`mb-2 text-gray-700 leading-relaxed flex items-start ${
              nestLevel > 0 ? `ml-${nestLevel * 4}` : ''
            }`}
          >
            <span className="mr-2">•</span>
            <span
              dangerouslySetInnerHTML={{
                __html: formatInlineText(listItemContent)
              }}
            />
          </li>
        );
      }

      // ------------------------------------------------
      // 4) ORDERED LISTS (digits or letters followed by a period)
      //    Matches lines like "1. Something" or "a. Something"
      // ------------------------------------------------
      else if (trimmedLine.match(/^\s*([0-9]+|[a-zA-Z])\.\s/)) {
        const nestLevel = Math.floor(indentSize / 2);

        // If we aren't currently building an ordered list (or the nesting level changed), close out the old section
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

        // Capture the bullet prefix ("1", "2", "a", "b", etc.)
        const match = trimmedLine.match(/^\s*([0-9]+|[a-zA-Z])\.\s/);
        const bullet = match ? match[1] : '?';

        // Remove the leading "1. " or "a. "
        const listItemContent = trimmedLine.replace(/^\s*([0-9]+|[a-zA-Z])\.\s/, '');

        currentSection.items.push(
          <li
            key={`ol-${index}`}
            className={`mb-2 text-gray-700 flex items-start ${
              nestLevel > 0 ? `ml-${nestLevel * 4}` : ''
            }`}
          >
            {/* Display the bullet exactly as found */}
            <span className="mr-2">{bullet}.</span>
            <span
              dangerouslySetInnerHTML={{
                __html: formatInlineText(listItemContent)
              }}
            />
          </li>
        );
      }

      // ------------------------------------------------
      // 5) PARAGRAPHS
      // ------------------------------------------------
      else if (trimmedLine.trim()) {
        if (!currentSection || currentSection.type !== 'paragraph') {
          closeCurrentSection(index);
          currentSection = { type: 'paragraph', content: [] };
        }
        currentSection.content.push(trimmedLine);
      }

      // ------------------------------------------------
      // 6) EMPTY LINES
      // ------------------------------------------------
      else if (trimmedLine === '') {
        closeCurrentSection(index);
        listLevel = 0;
      }
    });

    // Close any remaining open section after the loop
    closeCurrentSection(sections.length);

    // Now, build the final React elements from the sections
    return formattedSections.map((section, index) => {
      if (React.isValidElement(section)) {
        // This is already a heading or similar
        return section;
      }
      if (section?.type === 'unordered-list') {
        return (
          <ul
            key={`ul-${index}`}
            className="my-4 pl-6 list-none space-y-2"
          >
            {section.items}
          </ul>
        );
      }
      if (section?.type === 'ordered-list') {
        return (
          <ol
            key={`ol-${index}`}
            className="my-4 pl-6 list-none space-y-2"
          >
            {section.items}
          </ol>
        );
      }
      return null;
    });
  };

  return (
    <div className="formatted-message prose prose-gray max-w-none">
      {formatContent(content)}
    </div>
  );
};
