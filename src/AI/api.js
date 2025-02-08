const API_BASE_URL = "http://localhost:8000/api"

export const API = {
    async generateCurriculum(){
        const response = await fetch(`${API_BASE_URL}/curriculum/generate`, {
            method:'POST',
            headers: {'Content-Type' : 'application/json'},
            body:JSON.stringify({ subject}),
        });
        return response.json();

    },
    async getUserProgress(){
        const response = await fetch(`${API_BASE_URL}/users/${userId}/progress`);
        return response.json();
    },
    async updateProgress(){
        const response = await fetch(`${API_BASE_URL}/users/${userId}/progress`, {
            method:'PUT',
            headers: {'Content-Type': 'application/json'},
            body:JSON.stringify(progress)
        });
        return response.json()
    },
    async sendMessage(message) {
      const response = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      return response.json();
    },
    async getChatHistory(userId){
        const response = await fetch (`${API_BASE_URL}/chat/history/${userId}`);
        return response.json();
    },
    async detectContext(message, currentTopicId){
        const response = await fetch(`${API_BASE_URL}/context/detect`, {
            method:'POST',
            headers: { 'Content-Type' : 'application/json'},
            body: JSON.stringify({ message, currentTopicId})
        });
        return response.json();
    }

}