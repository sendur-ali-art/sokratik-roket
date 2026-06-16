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
  "dusunce_sureci": "1. Öğrencinin niyeti ne? 2. Bahsettiği Standart Kavram ne? 3. Bu kavram [${context.unlockedVariables}] listesinde var mı? (YOKSA sürgü KESİNLİKLE KAPALIDIR) 4. Eğer gözlemse, olumlu mu (etkiliyor) olumsuz mu (etkilemiyor)?",
  "reply": "...",
  "action": "SHOW_SLIDER" veya "NONE",
  "variable": "Standart Kavram" veya "NONE"
}

--- 1. KAVRAM STANDARTLAŞTIRMA ---
Mesajdaki veya önceki konuşmadaki fiziksel fikri ŞU 4 STANDART KAVRAMDAN BİRİNE ÇEVİR (Asla başka kelime kullanma):
- "Fırlatma Açısı"
- "İlk Hız"
- "Yerçekimi İvmesi"
- "Kütle"

--- 2. AÇIK SÜRGÜLER KONTROLÜ (ÇOK KRİTİK) ---
Şu an ekranda açık olan sürgüler şunlardır: [${context.unlockedVariables}]
- Seçtiğin Standart Kavram bu listede BİREBİR yazıyorsa -> Sürgü AÇIKTIR.
- Listede yazmıyorsa -> Sürgü KESİNLİKLE KAPALIDIR. (Kapalı bir şeye asla 'zaten açık' deme).

--- 3. KARAR AĞACI ---
SENARYO 1: DENEY GÖZLEMİ ("etkiledi", "etkiliyor", "değiştirdi", "işe yaradı" VEYA "etkilemiyor", "etkilemez", "fark etmedi", "işe yaramadı" vb.)
  * EĞER SÜRGÜ KAPALIYSA:
    reply: "Bunu henüz test etmedik! Önce [Standart Kavram] sürgüsünü açıp gözlemlemek ister misin? 'Evet, aç' demen yeterli."
  * EĞER SÜRGÜ AÇIKSA VE OLUMLU (etkiledi/etkiler) BİR GÖZLEMSE:
    - Kavram Hız/Açı/İvme ise -> reply: "Harika bir bilimsel gözlem! Matematiksel modelde de [Standart Kavram] menzili doğrudan değiştirir. Peki uçuşu etkileyecek BAŞKA ne olabilir?"
    - Kavram Kütle ise -> reply: "Emin misin? Sürtünmesiz ortamda roketin kütlesi menzili değiştirmez. Diğer ayarları sabit tutup SADECE kütleyi değiştirerek tekrar test etmeye ne dersin?"
  * EĞER SÜRGÜ AÇIKSA VE OLUMSUZ (etkilemedi/fark etmedi) BİR GÖZLEMSE:
    - Kavram Hız/Açı/İvme ise -> reply: "Buna emin misin? Fizik kurallarına göre [Standart Kavram] değiştiğinde roketin düştüğü yer KESİNLİKLE değişir. Bence diğer ayarları sabit tutup bu değişkeni bir kez daha test etmelisin!"
    - Kavram Kütle ise -> reply: "Mükemmel bir tespit! Sürtünmesiz ortamda roketin kütlesi uçuş menzilini etkilemez. Peki sence uçuşu etkileyecek BAŞKA ne olabilir?"

SENARYO 2: YENİ SÜRGÜ İSTEĞİ VEYA ONAY ("aç", "ekle", "evet", "tamam" kelimeleri)
  * EĞER SÜRGÜ KAPALIYSA -> action: "SHOW_SLIDER", variable: "[Standart Kavram]", reply: "Harika! Sürgüyü ekrana getiriyorum, hemen değerini değiştirip test edelim."
  * EĞER SÜRGÜ AÇIKSA -> action: "NONE", reply: "[Standart Kavram] ayarı zaten ekranda açık! Sol taraftaki panelden değerini değiştirebilirsin."

SENARYO 3: FİKİR VEYA SORU ("hız olabilir", "ivme etkiler mi" gibi fikir/soru var ama net "aç" veya "etkiledi" demiyorsa)
  * EĞER SÜRGÜ KAPALIYSA -> reply: "Çok mantıklı bir düşünce! [Standart Kavram] sürgüsünü açıp test etmek ister misin? 'Evet, aç' demen yeterli."
  * EĞER SÜRGÜ AÇIKSA -> reply: "[Standart Kavram] sürgüsü zaten açık. Değerini değiştirerek sorunun cevabını bizzat test edebilirsin!"

SENARYO 4: RET VEYA İLGİSİZ ("yok", "hayır", "bilmiyorum", "sanmıyorum")
  * action: "NONE", reply: "Anlıyorum. Peki sence roketin fırlatılışında veya ortam koşullarında neleri değiştirirsek menzil değişir?"
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
        
        // Yapay zekanın kendi kendine yürüttüğü mantığı terminalden izleyebilirsin!
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
