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
let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    // Se a chave não estiver configurada no painel ou for a chave placeholder do .env.example
    const isMock = !apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("MY_KEY");
    if (isMock) {
      console.warn("Aviso: GEMINI_API_KEY não foi configurada ou é um placeholder. Ativando o gerador afetuoso de Vovó IA local.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Gerador de contingência local que imita perfeitamente o estilo afetuoso e caipira de uma avó do interior do Brasil
function generateLocalVovoFallback(title: string, ingredients: any, category: string): string {
  const salutations = [
    "Sabe aquela delícia que abraça a alma logo na primeira garfada? Este prato é exatamente assim!",
    "Aquele perfuminho maravilhoso que se espelha de fininho e toma conta de toda a casa.",
    "Basta colocar essa lindeza no centro da mesa para ver os olhos de toda a família brilharem.",
    "Um preparo abençoado que traz de volta as melhores lembranças das nossas tardes de domingo."
  ];
  
  const midSec = [
    "Uma joia preciosa do nosso caderno de família, feito com o ingrediente mais importante: amor.",
    "Com todo o afeto do mundo e segredos que só quem cozinha com o coração consegue revelar.",
    "Uma gostosura autêntica que conforta o estômago e esquenta o peito de quem a gente mais ama.",
    "Uma combinação simples, mas com aquele toque mágico de aconchego que faz a rotina parar."
  ];

  const randomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  const sentence1 = randomItem(salutations);
  let sentence2 = randomItem(midSec);

  const ingredientsArray = Array.isArray(ingredients) ? ingredients : [];
  if (ingredientsArray.length > 0) {
    const sliceCount = Math.min(3, ingredientsArray.length);
    const listStr = ingredientsArray.slice(0, sliceCount).map(i => String(i).trim().toLowerCase()).join(", ");
    sentence2 = `Preparado com carinho especial usando ingredientes como ${listStr}, que dão um sabor de fazenda inconfundível!`;
  }

  return `${sentence1} ${sentence2}`;
}

// Endpoint para gerar a descrição / legenda automática usando Inteligência Artificial (Gemini)
app.post("/api/generate-description", async (req, res) => {
  try {
    const { title, ingredients, category } = req.body;
    if (!title) {
      return res.status(400).json({ error: "O título da receita é obrigatório" });
    }

    const ingredientsArray = Array.isArray(ingredients) ? ingredients : [];
    const ingredientsText = ingredientsArray.length > 0
      ? `Ingredientes: ${ingredientsArray.join(", ")}`
      : "";

    const categoryText = category ? `Categoria: ${category}` : "";

    const userPrompt = `Gere uma descrição/legenda curta, calorosa e afetiva (estilo "comida de vó" do interior do Brasil) para uma receita chamada "${title}".
${categoryText}
${ingredientsText}

A descrição deve ser aconchegante, apetitosa, e ter no máximo duas frases curtas (cerca de 25-45 palavras). Evite usar aspas ou formatações markdown. Comece indo direto à legenda.`;

    const ai = getGeminiClient();
    if (!ai) {
      // Retorna a geração local em perfeitas condições para uma excelente experiência de usuário offline/keyless
      const fallback = generateLocalVovoFallback(title, ingredientsArray, category || "");
      return res.json({ description: fallback, isFallback: true });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
    });

    const description = response.text?.trim() || "";
    if (!description) {
      throw new Error("Resposta vazia retornada pelo modelo Gemini");
    }

    res.json({ description, isFallback: false });
  } catch (error: any) {
    console.error("Erro na rota Gemini, usando fallback de Vovó IA local:", error);
    // Em caso de falhas na chamada da API real (por exemplo, problemas de cota ou rede),
    // devolvemos a geração afetuosa local de forma transparente ao invés de quebrar
    const fallback = generateLocalVovoFallback(req.body.title || "receita caseira", req.body.ingredients, req.body.category || "");
    res.json({ description: fallback, isFallback: true });
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
