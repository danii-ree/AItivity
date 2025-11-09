// analyze_image.js
import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const IMAGE_PATH = "image.jpg";

async function analyzeImage() {
  try {
    // Read image and convert to Base64
    const imageBytes = fs.readFileSync(IMAGE_PATH);
    const imageBase64 = imageBytes.toString("base64");

    // Send to OpenAI GPT-4V / GPT-4.1-mini
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini", // or "gpt-4o-mini" if you have access
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Describe this image in detail and include any text you see in it."
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${imageBase64}`
            }
          ]
        }
      ]
    });

    const description = response.choices[0].message.content[0].text;
    console.log("=== GPT Image Analysis ===\n", description);

  } catch (err) {
    console.error("Error analyzing image:", err);
  }
}

// Run the analysis
analyzeImage();
