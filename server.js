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
        
        const systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrenciyle 'Sen' diye konuş.

KURAL 1: SADECE geçerli bir JSON formatında yanıt ver: {"reply": "mesajın", "action": "NONE"}
KURAL 2: Öğrenci 'hız', 'itme', 'kuvvet', 'motor' derse action: "SHOW_SPEED" yap. Açıklama yapma, sadece "Harika bir fikir! Sürgüyü açıyorum, deneyelim ve sonuçlara bakalım." de.
KURAL 3: Öğrenci 'ağırlık', 'kütle', 'ağır', 'hafif' derse action: "SHOW_MASS" yap. Açıklama yapma, sadece "Harika bir düşünce! Sürgüyü açıyorum, deneyelim ve sonuçlara bakalım." de.
KURAL 4: Öğrenci 'ivme', 'yerçekimi', 'gezegen', 'çekim' derse action: "SHOW_GRAVITY" yap. Açıklama yapma, sadece "Çok iyi bir nokta! Sürgüyü açıyorum, deneyelim ve sonuçlara bakalım." de.
KURAL 5: Gelen [SİSTEM GİZLİ NOTU] içinde "[TÜM DEĞİŞKENLER BULUNDU]" uyarısı gelirse VEYA öğrenci mesajında açıkça 'formül' veya 'matematik' kelimesini geçirirse action: "SHOW_FORMULA" yap.
KURAL 6: Gelen [SİSTEM GİZLİ NOTU] içindeki talimatlara harfiyen uy. Roket çakıldığında veya hedefe vardığında ekstra fiziksel bilgiçlik taslama, doğrudan cevapları (hızı şöyle yap vb.) verme. Sadece nottaki açık uçlu soru mantığıyla iletişimde kal.

Öğrencinin Anlık Durumu: Açı: ${context.angle}°, Durum: ${context.status}`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ]
        });

        const aiData = JSON.parse(response.choices[0].message.content);
        res.json(aiData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: "Bağlantı hatası.", action: "NONE" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));
