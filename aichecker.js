import OpenAI from "openai";

export class OpenAIChecker {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.client = null;
  }

  initClient() {
    if (!this.apiKey) {
      console.error("OPENAI_API_KEY not found. Please set it in your .env file.");
      return false;
    }
    this.client = new OpenAI({ apiKey: this.apiKey });
    return true;
  }

  async testAPI() {
    if (!this.client) {
      console.error("OpenAI client not initialized.");
      return false;
    }

    try {
      // simple test: ask GPT to return "OK"
      const response = await this.client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "user", content: "Say OK if API key works." }
        ]
      });
      const text = response.choices[0].message.content.trim();
      if (text.toUpperCase() === "OK") {
        console.log("✅ OpenAI API key is valid and working!");
        return true;
      } else {
        console.error("❌ OpenAI API responded, but output unexpected:", text);
        return false;
      }
    } catch (err) {
      console.error("❌ OpenAI API test failed:", err.message);
      return false;
    }
  }
}
