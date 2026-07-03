export const getTransportAdvice = async (query: string): Promise<string> => {
  try {
    const res = await fetch('/api/gemini/advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    return data.text || "عيوني، ما فهمت عليك. ممكن تعيد؟";
  } catch (error) {
    console.error("Client getTransportAdvice Error:", error);
    return "في مشكلة بالاتصال عيوني، جرب كمان شوي.";
  }
};

export const getPlaceSuggestions = async (query: string): Promise<string[]> => {
  if (!query || query.length < 2) return [];
  try {
    const res = await fetch('/api/gemini/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    return data.suggestions || [];
  } catch (error) {
    console.error("Client getPlaceSuggestions Error:", error);
    return [];
  }
};
