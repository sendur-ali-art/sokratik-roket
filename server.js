const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        
        // Öğrencinin o anki simülasyon verilerini yapay zekaya fısıldıyoruz
        const systemPrompt = `Sen Sokratik bir fizik öğretmenisin. Öğrenciyle doğrudan 'Sen' diye konuş. ASLA cevabı, açıyı veya hızı doğrudan söyleme. Uydurma bilgi verme.
        Öğrencinin anlık durumu:
        - Denediği Açı: ${context.angle} derece
        - Denediği Hız: ${context.thrust} m/s
        - Hedefin Uzaklığı: 150 metre
        - Roketin Düştüğü Yer: ${context.distance} metre
        - Durum: ${context.status}
        
        Menzil (Range) formülü: R = (v0^2 * sin(2*theta)) / g. Yerçekimi (g) = 9.8 m/s^2.
        Öğrenci hedefe ulaşamadıysa, bu formül ve dikey/yatay hız bileşenleri (Vx, Vy) üzerinden onu düşündürecek küçük bir ipucu ver veya soru sor. "Öğrenciye şöyle sorabilirsin" gibi ifadeler KULLANMA.`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ]
        });

        res.json({ reply: response.choices[0].message.content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: "Yapay zeka ile bağlantı kurulamadı. Lütfen tekrar dene." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));
