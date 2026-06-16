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
        const { message, context, history = [] } = req.body;
        
        const systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrenciyle 'Sen' dilini kullanarak konuş.

GÖREVİN: Öğrencinin mesajını analiz et ve AŞAĞIDAKİ ADIMLARI sırasıyla kontrol ederek SADECE JSON formatında yanıt ver. 
JSON Formatı: {"reply": "...", "action": "SHOW_SLIDER" | "NONE", "variable": "Sürgü Adı" | "NONE"}

ADIM 1: SÜRGÜ AÇMA VE ONAY (Örn: "İvme aç", "Hızı ekle", "Evet", "Açalım", "Evet ivme aç")
- Öğrenci bir değişkeni açmak istiyorsa VEYA senin "Açayım mı?" soruna onay veriyorsa:
- İstenen kavramı belirle ("İlk Hız", "Yerçekimi İvmesi" veya "Kütle" olarak adlandır).
- EĞER BU KAVRAM AÇIK SÜRGÜLER LİSTESİNDE YOKSA: action: "SHOW_SLIDER", variable: "[Standart Kavram Adı]", reply: "Harika! Sürgüyü ekrana getiriyorum, hemen test edip sonuçlara bakalım."
- EĞER ZATEN AÇIKSA: action: "NONE", reply: "Bu değişken zaten açık, ekrandan değerini değiştirebilirsin!"

ADIM 2: FİKİR BEYANI (Örn: "İvme olabilir", "Bence hız", "Kütle?")
- Öğrenci bir fikir söylüyor ama açıkça "aç", "ekle" veya "evet" demiyorsa:
- EĞER AÇIK SÜRGÜLER LİSTESİNDE YOKSA: action: "NONE", reply: "Çok mantıklı! [Standart Kavram Adı] sürgüsünü açıp test etmek ister misin? 'Evet, aç' demen yeterli."
- EĞER ZATEN AÇIKSA: action: "NONE", reply: "Bu değişken zaten açık, ekrandan değerini değiştirebilirsin!"

ADIM 3: GÖZLEM (Örn: "Etkiledi", "Değişmedi", "Daha uzağa gitti")
- Öğrenci bir deney sonucu paylaşıyorsa:
- action: "NONE", reply: "Harika bir bilimsel gözlem! Bunu test ederek kanıtladın. Peki sence uçuşu etkileyecek BAŞKA ne olabilir?"

ADIM 4: GÜNLÜK DİL / RET (Örn: "Yok", "Hayır", "Bilmiyorum", "Mesafe", "Saçma")
- Öğrenci reddederse veya konudan saparsa: action: "NONE", reply: "Anlıyorum. Peki sence roketin fırlatılışında neleri değiştirirsek daha uzağa gider?"

ÖĞRENCİNİN ANLIK DURUMU:
- AÇIK SÜRGÜLER: [${context.unlockedVariables}] (Bilgi: Eğer bu listede 'İlk Hız' yazıyorsa 'Hız' zaten açıktır. 'Yerçekimi İvmesi' yazıyorsa 'İvme' zaten açıktır. Tekrar açmaya çalışma!)`;

        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message }
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: messages
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
