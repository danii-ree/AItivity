import fs from "fs";
import path from "path";
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
const PORT = 3000;
const IMAGE_NAME = "image.jpg";
const IMAGE_PATH = path.join(process.cwd(), IMAGE_NAME);

// Serve the local image
app.get(`/${IMAGE_NAME}`, (req, res) => {
  res.sendFile(IMAGE_PATH);
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Local image server running at http://localhost:${PORT}/${IMAGE_NAME}`);

  try {
    const localImageUrl = `http://localhost:${PORT}/${IMAGE_NAME}`;

    // Send URL to OpenAI GPT
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini", // or gpt-4o-mini if you have access
      messages: [
        {
          role: "user",
          content: `Describe this image in detail and provide any insights: ${localImageUrl}`
        }
      ]
    });

    const description = response.choices[0].message.content;
    console.log("\n=== GPT Description ===\n", description);
  } catch (err) {
    console.error("Error analyzing image:", err);
  }
});
