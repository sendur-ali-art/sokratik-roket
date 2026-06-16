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

GÖREVİN: Öğrencinin mesajını analiz et ve SADECE JSON formatında yanıt ver. 
JSON Formatı: {"reply": "...", "action": "SHOW_SLIDER" | "NONE", "variable": "Sürgü Adı" | "NONE"}

ADIM 1: SÜRGÜ AÇMA VE ONAY (Örn: "İvme aç", "Hızı ekle", "Evet", "Açalım", "Evet ivme aç")
- Öğrenci yeni bir değişken istiyorsa veya senin "Açayım mı?" soruna onay veriyorsa, istenen kavramı "İlk Hız", "Yerçekimi İvmesi" veya "Kütle" olarak standartlaştır.
- ŞİMDİ "AÇIK SÜRGÜLER" LİSTESİNE BAK:
  * Eğer bu standart isim AÇIK SÜRGÜLER listesinde YOKSA -> action: "SHOW_SLIDER", variable: "[Standart İsim]", reply: "Harika! Sürgüyü ekrana getiriyorum, hemen test edip sonuçlara bakalım."
  * Eğer bu standart isim AÇIK SÜRGÜLER listesinde VARSA -> action: "NONE", reply: "Bu değişken zaten açık, ekrandan değerini değiştirebilirsin!"

ADIM 2: FİKİR BEYANI VE SORU (Örn: "İvme olabilir", "Hız etkiler mi?", "Yoğunluk?", "Bence kütle")
- Öğrenci fikir söylüyor veya soru soruyorsa (ama net olarak "aç" demiyorsa), kavramı "İlk Hız", "Yerçekimi İvmesi" veya "Kütle" olarak standartlaştır.
- AÇIK SÜRGÜLER listesinde YOKSA -> action: "NONE", reply: "Çok mantıklı! [Standart İsim] sürgüsünü açıp test etmek ister misin? 'Evet, aç' demen yeterli."
- AÇIK SÜRGÜLER listesinde VARSA -> action: "NONE", reply: "Bu değişken zaten açık, ekrandan değerini değiştirebilirsin!"

ADIM 3: GÖZLEM (Örn: "Etkiledi", "Daha uzağa gitti", "Kütle değiştirmedi")
- Öğrenci bir deney sonucu paylaşıyorsa, cümlede geçen kavramı standartlaştır ("İlk Hız", "Yerçekimi İvmesi", "Kütle").
- EĞER BU KAVRAM AÇIK SÜRGÜLER LİSTESİNDE YOKSA (Yani denemeden sallıyorsa) -> action: "NONE", reply: "Bunu henüz test etmedik! Önce [Standart İsim] sürgüsünü açıp gözlemlemek ister misin? 'Evet, aç' demen yeterli."
- EĞER AÇIK SÜRGÜLER LİSTESİNDE VARSA -> action: "NONE", reply: "Harika bir bilimsel gözlem! Peki sence uçuşu etkileyecek BAŞKA ne olabilir?"

ADIM 4: GÜNLÜK DİL / RET (Örn: "Yok", "Bilmiyorum", "Saçma")
- Öğrenci reddederse veya takılırsa -> action: "NONE", reply: "Anlıyorum. Peki sence roketin fırlatılışında neleri değiştirirsek daha uzağa gider?"

ÖĞRENCİNİN ANLIK DURUMU:
- AÇIK SÜRGÜLER LİSTESİ: [${context.unlockedVariables}]
(DİKKAT KURALI: Bir değişken SADECE yukarıdaki köşeli parantez içindeyse açıktır. Orada yazmıyorsa KESİNLİKLE kapalıdır, 'zaten açık' deme!)`;

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
