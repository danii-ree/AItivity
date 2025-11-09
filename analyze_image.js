import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
const upload = multer({ dest: "uploads/" }); // temp folder for uploads

// Simple HTML page for uploading
app.get("/", (req, res) => {
  res.send(`
    <h2>Upload an image to analyze</h2>
    <form method="POST" action="/analyze" enctype="multipart/form-data">
      <input type="file" name="image" accept="image/*" required />
      <button type="submit">Analyze</button>
    </form>
  `);
});

// Handle file upload
app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    const filePath = req.file.path;

    // In a real deployed app, you would upload this file to a **public URL**
    // For demonstration, let's assume you host it publicly at some URL
    // Replace this with your public URL of the uploaded file:
    const publicImageUrl = `https://your-public-bucket-url/${req.file.filename}`;

    // Ask OpenAI to analyze the image
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: `Here is an image URL: ${publicImageUrl}\nPlease describe the image and summarize any schedule information.`
        }
      ]
    });

    // Delete the temp uploaded file
    fs.unlinkSync(filePath);

    res.send(`
      <h3>GPT Analysis:</h3>
      <pre>${response.choices[0].message.content}</pre>
      <a href="/">Upload another image</a>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error analyzing image: " + err.message);
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
