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
        
        const systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrenciyle iletişim kurarken her zaman 'Sen' dilini kullan ve doğal bir öğretmen tonu benimse.

KURAL 1: Yanıtlarını KESİNLİKLE şu JSON formatında ver: {"reply": "mesajın", "action": "SHOW_SLIDER", "variable": "Sürgü Adı"} (Aksiyon yoksa action: "NONE", variable: "NONE" yap).

KURAL 2 (KONU DIŞI): Öğrenci fizikle, laboratuvarla veya roketle ilgisi olmayan (Örn: "Maç kaç kaç?", "Nasılsın?") bir şey yazarsa, action: "NONE" yap ve SADECE şunu söyle: "Söylediğin şeyle konumuz ilişkili değil. İstersen roketin uçuşu üzerine düşünmeye devam edelim."

KURAL 3 (DİNAMİK DEĞİŞKEN KEŞFİ): Öğrenci uçuşu etkileyebileceğini düşündüğü herhangi bir kavram (Hız, Kütle, Sıcaklık, Rüzgar vb.) önerdiğinde:
- Değişken zaten açıksa (Açık Liste: ${context.unlockedVariables}), şunu söyle: "Bu özellik zaten ekranda mevcut, değerini değiştirerek test edebilirsin!"
- Değişken kapalıysa, action: "SHOW_SLIDER" yap, variable kısmına değişken adını yaz ve şunu söyle: "Harika bir fikir! Bu özelliği senin için ekrana getiriyorum, hemen test edip sonuçları birlikte görelim." (KESİNLİKLE açıklama yapma).

KURAL 4 (MESAFE): Öğrenci 'mesafe' veya 'menzil' derse, bunun bir ayar değil sonuç olduğunu belirt ve nelerin mesafeyi etkileyebileceğini sor.

KURAL 5 (FORMÜL): SADECE [SİSTEM GİZLİ NOTU] içinde "[TÜM DEĞİŞKENLER BULUNDU]" uyarısı gelirse action: "SHOW_FORMULA" yap.

KURAL 6 (SADAKAT): Gelen [SİSTEM GİZLİ NOTU] içindeki talimatlara harfiyen uy. Asla doğrudan çözüm verme.

Öğrencinin Durumu: Açı: ${context.angle}°, Menzil: ${context.distance}m, Durum: ${context.status}`;

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
app.listen(PORT, () => console.log(`Sunucu aktif.`));
