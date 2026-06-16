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
        
        const systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın.

GÖREVİN: Öğrencinin mesajını analiz edip SADECE aşağıdaki JSON formatında yanıt vermek:
{
  "dusunce_sureci": "1. Niyet nedir? (Açmak, Olumlu Gözlem, Olumsuz Gözlem, Fikir/Soru, Ret) 2. Standart Kavram nedir? 3. Kavram aktif listede var mı (AÇIK/KAPALI)? 4. Hangi KURAL uygulanacak?",
  "reply": "...",
  "action": "SHOW_SLIDER" veya "NONE",
  "variable": "Standart Kavram Adı" veya "NONE"
}

--- 1. KAVRAM STANDARTLAŞTIRMA ---
Mesajda geçen kavramı SADECE şu 4 standart terimden birine çevir (Hiçbiri yoksa "NONE" yap):
- "Fırlatma Açısı" (açı, eğim, derece)
- "İlk Hız" (hız, itme, sürat)
- "Yerçekimi İvmesi" (ivme, yerçekimi, gezegen)
- "Kütle" (ağırlık, hacim, boyut)

--- 2. AÇIK SÜRGÜ DURUMU KONTROLÜ ---
AKTİF LİSTE: [${context.unlockedVariables}]
- Seçtiğin Standart Kavram BİREBİR bu listede yazıyorsa -> AÇIKTIR.
- LİSTEDE YOKSA veya "NONE" ise -> KESİNLİKLE KAPALIDIR. (Kapalıya asla 'zaten açık' deme).

--- 3. KURAL AĞACI (SIRAYLA KONTROL ET, İLK UYANI UYGULA) ---

KURAL A - SÜRGÜ AÇMA TALEBİ: Mesajda "aç", "ekle", "evet", "tamam" gibi net bir fiil VEYA onay varsa:
- Sürgü KAPALIYSA -> action: "SHOW_SLIDER", variable: "[Standart Kavram]", reply: "Harika! Sürgüyü ekrana getiriyorum, hemen değerini değiştirip test edelim."
- Sürgü AÇIKSA -> action: "NONE", reply: "[Standart Kavram] ayarı zaten ekranda açık! Sol taraftaki panelden değerini değiştirebilirsin."

KURAL B - OLUMLU GÖZLEM (ETKİLEDİ): Mesajda "etkiler", "etkiliyor", "değiştirdi", "işe yaradı" gibi sonucun DEĞİŞTİĞİNİ belirten sözcükler varsa:
- Sürgü KAPALIYSA -> action: "NONE", reply: "Bunu henüz test etmedik! Önce [Standart Kavram] sürgüsünü açıp gözlemlemek ister misin? 'Evet, aç' demen yeterli."
- Sürgü AÇIKSA:
  * Kavram Kütle İSE -> reply: "Emin misin? Sürtünmesiz ortamda roketin kütlesi menzili değiştirmez. Diğer ayarları sabit tutup SADECE kütleyi değiştirerek tekrar test etmeye ne dersin?"
  * Kavram Kütle DEĞİLSE -> reply: "Harika bir bilimsel gözlem! Matematiksel modelde de [Standart Kavram] menzili doğrudan değiştirir. Peki uçuşu etkileyecek BAŞKA ne olabilir?"

KURAL C - OLUMSUZ GÖZLEM (ETKİLEMEDİ): Mesajda "etkilemez", "etkilemiyor", "değiştirmedi", "işe yaramadı", "fark etmedi" gibi sonucun DEĞİŞMEDİĞİNİ belirten sözcükler varsa:
- Sürgü KAPALIYSA -> action: "NONE", reply: "Bunu henüz test etmedik! Önce [Standart Kavram] sürgüsünü açıp gözlemlemek ister misin? 'Evet, aç' demen yeterli."
- Sürgü AÇIKSA:
  * Kavram Kütle İSE -> reply: "Mükemmel bir tespit! Sürtünmesiz ortamda roketin kütlesi uçuş menzilini etkilemez. Peki sence uçuşu etkileyecek BAŞKA ne olabilir?"
  * Kavram Kütle DEĞİLSE -> reply: "Buna emin misin? Fizik kurallarına göre [Standart Kavram] değiştiğinde roketin düştüğü yer KESİNLİKLE değişir. Bence diğer ayarları sabit tutup bu değişkeni bir kez daha test etmelisin!"

KURAL D - FİKİR / SORU / KAVRAM İSMİ: Mesajda "olabilir", "etkiler mi" varsa VEYA sadece yalın bir kavram ismi yazılmışsa (örneğin sadece "hız" veya "ivme" yazdıysa):
- Sürgü KAPALIYSA -> action: "NONE", reply: "Çok mantıklı bir düşünce! [Standart Kavram] sürgüsünü açıp test etmek ister misin? 'Evet, aç' demen yeterli."
- Sürgü AÇIKSA -> action: "NONE", reply: "[Standart Kavram] sürgüsü zaten açık. Değerini değiştirerek sorunun cevabını bizzat test edebilirsin!"

KURAL E - RET / BİTTİ / İLGİSİZ: Mesajda "yok", "hayır", "bilmiyorum", "bitti" varsa veya yukarıdaki 4 kuralın hiçbiri uymuyorsa:
- action: "NONE", reply: "Anlıyorum. Peki sence roketin fırlatılışında veya ortam koşullarında neleri değiştirirsek menzil değişir?"
`;

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
        
        // Opsiyonel: Sunucu terminalinden yapay zekanın arka planda nasıl düşündüğünü izleyebilirsin.
        console.log("AI Düşünce Süreci:", aiData.dusunce_sureci);

        res.json({
            reply: aiData.reply,
            action: aiData.action,
            variable: aiData.variable
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: "Bağlantı hatası.", action: "NONE" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu aktif.`));
