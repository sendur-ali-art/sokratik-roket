const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

// "sk-" ile başlayan anahtarını Render'dan otomatik çekecek
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { 
                  role: "system", 
                  content: "Sen Sokratik bir STEM öğretmenisin. Öğrenci bir 3D roket fırlatma simülasyonunda. Doğrudan cevabı verme, ona fırlatma açısı ve fizik kuralları hakkında düşündürücü bir soru sor." 
                },
                { role: "user", content: userMessage }
            ]
        });

        res.json({ reply: response.choices[0].message.content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: "Yapay zeka ile bağlantı kurulamadı. API anahtarını kontrol et." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));