export const sendResponseChunks = async (chunks) =>{
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await typeChunk(chunk)
        setMessages(prev =>[
            ...prev,{
                type: "bot",
                content:chunk, 
                id: `bot-${Date.now()}-${i}`,
                showControls: i === chunks.length - 1
            }
        ]);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

};
export const typeChunk = async (chunk, delay = typingSpeed) => {
    setIsTyping(true);
    let currentText = "";
    for (let i = 0; i < chunk.length; i++) {
        currentText += chunk[i];
        setCurrentChunk(currentText);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    setIsTyping(false);
    setCurrentChunk("");
    return currentText;
};

export const chunkResponse = async (text) => {
    let chunks = text.split(/\n\n+/);

    chunks = chunks.flatMap(chunk => {
        if (chunk.length > 500) {
          // Split on sentences, trying to keep natural breaks
          return chunk
            .split(/(?<=[.!?])\s+/)
            .reduce((acc, sentence) => {
              if (!acc.length) return [sentence];
              let lastChunk = acc[acc.length - 1];
              if (lastChunk.length + sentence.length < 500) {
                acc[acc.length - 1] = lastChunk + " " + sentence;
              } else {
                acc.push(sentence);
              }
              return acc;
            }, []);
        }
        return [chunk]
    });
    return chunks.filter(chunk => chunk.trim().length > 0);
};