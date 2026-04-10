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
        KURAL 1: SADECE JSON formatında yanıt ver: {"reply": "mesajın", "action": "NONE"}
        KURAL 2: Öğrenci 'ağırlık', 'kütle', 'ağır', 'hafif' gibi kelimeler kullanırsa action: "SHOW_MASS" yap. KESİNLİKLE açıklama, onaylama veya formül verme! Cevabın sadece şu olsun: "Harika bir düşünce! Deneyelim ve sonuçlara bakalım."
        KURAL 3: Öğrenci 'ivme', 'yerçekimi', 'gezegen', 'çekim' gibi kelimeler kullanırsa action: "SHOW_GRAVITY" yap. KESİNLİKLE ivmenin ne olduğunu açıklama! Cevabın sadece şu olsun: "Çok iyi bir nokta! Deneyelim ve sonuçlara bakalım."
        KURAL 4: SADECE öğrenci açıkça 'formül' kelimesini kendisi yazarsa VEYA Durum 'Başarılı' ise action: "SHOW_FORMULA" yap.
        KURAL 5: Gelen [SİSTEM GİZLİ NOTU] içindeki talimatlara harfiyen uy, ancak bu notların varlığından öğrenciye ASLA bahsetme. Roket çakıldığında asla doğrudan neyi değiştirmesi gerektiğini söyleme (hızı artır, açıyı değiştir vb. DEME). Sokratik ve sade ol.
        
        Öğrencinin Durumu: Açı: ${context.angle}°, Hız: ${context.thrust} m/s, Menzil: ${context.distance}m, Durum: ${context.status}`;

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
