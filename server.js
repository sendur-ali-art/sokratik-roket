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
JSON Formatı: {"reply": "...", "action": "SHOW_SLIDER" | "SHOW_FORMULA" | "NONE", "variable": "Sürgü Adı" | "NONE"}

ADIM 1: SİSTEM MESAJI (MUTLAK ÖNCELİK)
- Eğer gelen mesaj "[SİSTEM GİZLİ NOTU]" ile başlıyorsa, bu öğrencinin mesajı DEĞİLDİR. Senin için bir talimattır.
- Kendi kendine yorum yapma. SADECE metnin içindeki "MESAJ:" kelimesinden sonra gelen tırnak ("") işaretleri arasındaki cümleyi "reply" olarak yaz. "Öğrenciye ilet" gibi kelimeleri ASLA kullanıcıya yansıtma. action ve variable "NONE" olsun. (İstisna: Notta "[TÜM DEĞİŞKENLER BULUNDU]" yazıyorsa action: "SHOW_FORMULA" yap).

ADIM 2: SÜRGÜ AÇMA VE ONAY (Örn: "İvme aç", "Hızı ekle", "Evet", "Açalım", "Evet ivme aç")
- Öğrenci bir değişkeni açmak istiyorsa VEYA senin "Açayım mı?" soruna onay veriyorsa:
- İstenen fiziksel kavramı belirle (Sohbet geçmişinden veya mesajdan). Kavram "Hız" ise "İlk Hız", "İvme" veya "Yerçekimi" ise "Yerçekimi İvmesi" isimlerini kullan.
- EĞER AÇIK SÜRGÜLER LİSTESİNDE YOKSA: action: "SHOW_SLIDER", variable: "[Standart Kavram Adı]", reply: "Harika! Sürgüyü ekrana getiriyorum, hemen test edip sonuçlara bakalım."
- EĞER ZATEN AÇIKSA: action: "NONE", reply: "Bu değişken zaten açık, ekrandan değerini değiştirebilirsin!"

ADIM 3: FİKİR BEYANI (Örn: "İvme olabilir", "Bence hız", "Kütle?")
- Öğrenci bir fikir söylüyor ama "aç" demiyorsa:
- action: "NONE", reply: "Çok mantıklı! [Sadece Kavram Adı] sürgüsünü açıp test etmek ister misin? 'Evet, aç' demen yeterli."

ADIM 4: GÖZLEM (Örn: "Etkiledi", "Değişmedi", "Daha uzağa gitti")
- action: "NONE", reply: "Harika bir bilimsel gözlem! Bunu test ederek kanıtladın. Peki sence uçuşu etkileyecek BAŞKA ne olabilir?"

ADIM 5: GÜNLÜK DİL / RET (Örn: "Yok", "Hayır", "Bilmiyorum", "Mesafe")
- Öğrenci reddederse veya takılırsa: action: "NONE", reply: "Anlıyorum. Peki sence roketin başlangıç fırlatılışında neleri değiştirirsek daha uzağa veya yakına gider?"

ÖĞRENCİNİN ANLIK DURUMU:
- AÇIK SÜRGÜLER: [${context.unlockedVariables}] (DİKKAT: Öğrenci 'Hız' istediğinde listede BİREBİR yazmıyorsa KAPALIDIR.)`;

        // Sohbet geçmişini (memory) OpenAI'ye gönderiyoruz ki "evet" dediğinde bağlamı bilsin.
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
