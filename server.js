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
        
        const systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Görevin öğrenciye doğrudan cevapları vermek DEĞİL, onun fikirlerini test etmesini sağlamaktır. Anlaşılır ve doğal bir Türkçe kullan.

--- FİZİKSEL MODEL VE SİMÜLASYON KURALLARI ---
- Menzili KESİNLİKLE ETKİLEYEN 3 Değişken: Fırlatma Açısı, İlk Hız, Yerçekimi İvmesi.
- BUNLAR DIŞINDAKİ HİÇBİR ŞEY (Kütle, Hacim, Rüzgar, Sıcaklık vb.) menzili ETKİLEMEZ.

--- ÖĞRETMENLİK VE DENEY KURALLARI ---
1. ÖZGÜR KEŞİF: Öğrenci uçuşu etkileyeceğini düşündüğü HERHANGİ BİR ŞEYİ (hacim, rüzgar, kütle, motor vb.) sorarsa, "Harika bir fikir! Bunu öğrenmenin en iyi yolu bizzat test etmektir. Sürgüyü açayım mı?" de. Öğrenci onaylarsa 'show_slider' aracıyla ÖĞRENCİNİN SÖYLEDİĞİ İSMİ BİREBİR KULLANARAK o sürgüyü aç.

--- 4 İHTİMALLİ GÖZLEM MATRİSİ (BUNLARA KESİNLİKLE UY) ---
2. YANLIŞ OLUMLU GÖZLEM (Etkisiz bir şeye etkiledi derse): Öğrenci Hacim, Rüzgar, Kütle gibi ETKİSİZ bir değişkene "etkiledi/değiştirdi" derse: "Buna emin misin? Bence aynı anda birden fazla ayarla oynadın. Diğerlerini sabit tutup SADECE bu ayarı değiştirerek tekrar denemelisin." de.

3. DOĞRU OLUMSUZ GÖZLEM (Etkisiz bir şeye etkilemedi derse): Öğrenci etkisiz bir değişkene (Hacim, Kütle vb.) "etkilemedi/değiştirmedi" derse: "Mükemmel bir bilimsel tespit! Hatırlarsan en başta bu laboratuvarın 'sürtünmesiz ve ideal bir ortam' olduğunu konuşmuştuk. İşte bu yüzden test ettiğin bu değişken menzile etki etmiyor. Bunu bizzat deneyerek kanıtlaman harika! Peki sence uçuşu gerçekten etkileyecek BAŞKA ne olabilir?" de.

4. DOĞRU OLUMLU GÖZLEM (Etkili bir şeye etkiledi derse): Öğrenci Hız, İvme, Açı gibi değişkenlerin "etkilediğini/değiştirdiğini" söylerse: "Harika bir bilimsel gözlem! Matematiksel modelde de bu değişken menzili doğrudan değiştirir. Peki uçuşu etkileyecek BAŞKA ne olabilir?" de.

5. YANLIŞ OLUMSUZ GÖZLEM (Etkili bir şeye etkilemedi derse): Öğrenci Fırlatma Açısı, İlk Hız veya Yerçekimi İvmesi için "etkilemedi/fark etmedi" derse: "Buna emin misin? Fizik kurallarına göre bu değişkenin roketin düştüğü yeri KESİNLİKLE değiştirmesi gerekir. Bence diğer ayarları sabit tutup bu değişkeni bir kez daha test etmelisin!" de.

--- EKRAN KONTROLÜ ---
6. ZATEN AÇIK OLAN SÜRGÜLER: Şu an ekranda açık olanlar: [${context.unlockedVariables}]. Öğrenci zaten açık olan bir şeyi sorarsa, "Bu zaten sol panelde açık, oradan değiştirebilirsin" de. Tekrar açmayı teklif etme.

Öğrencinin Son Atış Mesafesi: ${context.distance} metre
Son Atış Durumu: ${context.status}`;

        const tools = [
            {
                type: "function",
                function: {
                    name: "show_slider",
                    description: "Öğrenci ekranda AÇIK OLMAYAN HERHANGİ BİR değişkeni (Hız, İvme, Hacim, Rüzgar, Kütle vb. ne isterse) test etmek istediğinde bu fonksiyonu çağır. İsim kısıtlaması yok.",
                    parameters: {
                        type: "object",
                        properties: {
                            variable_name: {
                                type: "string",
                                description: "Ekranda açılacak değişkenin adı. Öğrenci ne söylediyse birebir onu yaz."
                            }
                        },
                        required: ["variable_name"]
                    }
                }
            }
        ];

        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message }
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            tools: tools,
            tool_choice: "auto"
        });

        const responseMessage = response.choices[0].message;
        
        let replyText = responseMessage.content || "";
        let action = "NONE";
        let variable = "NONE";

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];
            if (toolCall.function.name === "show_slider") {
                const args = JSON.parse(toolCall.function.arguments);
                action = "SHOW_SLIDER";
                variable = args.variable_name; 
                
                if (!replyText) {
                    replyText = `Harika bir fikir! ${variable} ayarını ekrana getiriyorum. Hemen değerini değiştirip test edelim.`;
                }
            }
        }

        res.json({
            reply: replyText,
            action: action,
            variable: variable
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: "Bağlantı hatası.", action: "NONE" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu aktif.`));
