import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Configurar o cliente Gemini utilizando a recomendação da Skill (process.env.GEMINI_API_KEY)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Endpoint para gerar a descrição / legenda automática usando Inteligência Artificial (Gemini)
app.post("/api/generate-description", async (req, res) => {
  try {
    const { title, ingredients, category } = req.body;
    if (!title) {
      return res.status(400).json({ error: "O título da receita é obrigatório" });
    }

    const ingredientsText = Array.isArray(ingredients) && ingredients.length > 0
      ? `Ingredientes: ${ingredients.join(", ")}`
      : "";

    const categoryText = category ? `Categoria: ${category}` : "";

    const userPrompt = `Gere uma descrição/legenda curta, calorosa e afetiva (estilo "comida de vó" do interior do Brasil) para uma receita chamada "${title}".
${categoryText}
${ingredientsText}

A descrição deve ser aconchegante, apetitosa, e ter no máximo duas frases curtas (cerca de 25-45 palavras). Evite usar aspas ou formatações markdown. Comece indo direto à legenda.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
    });

    const description = response.text?.trim() || "";
    res.json({ description });
  } catch (error: any) {
    console.error("Erro na rota Gemini:", error);
    res.status(500).json({ error: "Erro ao gerar legenda com Inteligência Artificial: " + (error?.message || "Indisponível") });
  }
});

// Vite middleware para desenvolvimento, fallback em produção
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
