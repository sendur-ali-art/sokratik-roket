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
        
        const systemPrompt = `Sen Sokratik bir fizik öğretmenisin. 
        KURAL 1: Cevaplarını KESİNLİKLE sadece geçerli bir JSON formatında ver. Örnek: {"reply": "mesajın", "action": "NONE"}
        KURAL 2: Öğrenci eğer 'ağırlık', 'kütle', 'roket ağır', 'hafifletsek' gibi kelimeler kullanırsa, action kısmını "SHOW_MASS" yap. "Ekrana Kütle sürgüsünü ekliyorum, test edip kendi gözlerinle gör!" de.
        KURAL 3: Öğrenci roketi hedefe ulaştırdıysa (Durum: Başarılı) veya açıkça 'formül, matematik, hesaplama' görmek isterse, onu tebrik et/yönlendir ve action kısmını "SHOW_FORMULA" yap.
        KURAL 4: Diğer tüm durumlarda action "NONE" kalsın. Doğrudan formül veya sonuç verme, her zaman bir Sokratik soruyla veya yönlendirmeyle bitir.
        
        Öğrencinin Anlık Durumu: Açı: ${context.angle}°, Hız: ${context.thrust} m/s, Ulaşılan Menzil: ${context.distance}m, Durum: ${context.status}`;

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
        res.status(500).json({ reply: "Yapay zeka ile bağlantı kurulamadı. Lütfen API anahtarını kontrol et.", action: "NONE" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));
