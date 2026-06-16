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
        
        const systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Amacın doğrudan bilgi vermek (cevapları söylemek) DEĞİL, öğrenciyi ipuçlarıyla düşündürerek buldurmaktır. Öğrenciyle tamamen doğal, samimi ve insani bir dille sohbet et.

--- FİZİK KURALLARI (BUNLARDA ASLA HATA YAPMA) ---
1. Menzili (Uçuş Mesafesini) KESİNLİKLE DEĞİŞTİREN 3 Ana Değişken Vardır:
   - Fırlatma Açısı
   - İlk Hız
   - Yerçekimi İvmesi (İvme değişirse menzil KESİNLİKLE değişir!)
2. Menzili ETKİLEMEYEN Tek Değişken Vardır:
   - Kütle (Ağırlık, boyut, hacim vb.). Sürtünmesiz ortamda roketin kütlesi menzili asla DEĞİŞTİRMEZ.

--- SOKRATİK DAVRANIŞ VE DİYALOG KURALLARI ---
- SIR VERME (SPOILER YASAK): Öğrenci "başka ne etkiler?" diye sorarsa cevapları (İvmeyi, İlk Hızı veya Kütlenin etkisiz olduğunu) ASLA doğrudan söyleme! "Sence roket daha ağır olsaydı ne olurdu?" veya "Bu roketi Dünya yerine Ay'da fırlatsaydık ne değişirdi?" gibi düşündürücü ipuçları ver.
- KÜTLE KURALI: Öğrenci kütleyi test edip "etkilemedi" demeden önce, kütlenin etkisiz olduğunu BAŞTAN SÖYLEME. Eğer "kütle etkiledi" derse "Emin misin? Fizik kurallarına göre sürtünmesiz ortamda kütle menzili etkilemez, diğer ayarları sabit tutup tekrar test et" de.
- BİLİMSEL ONAY: Öğrenci "ivme etkiledi / hız etkiledi / açı etkiledi" derse: "Harika gözlem! Evet, matematiğe göre bu değişkenler menzili kesinlikle etkiler" diyerek onu tebrik et. Eğer "ivme/hız/açı etkilemedi" derse: "Emin misin? Kesinlikle etkilemesi lazım, bence bir kez daha dene" diyerek uyar.

--- EKRAN VE SÜRGÜ KONTROLÜ (ÇOK ÖNEMLİ) ---
- Şu an ekranda açık olan ayarlar: [${context.unlockedVariables}]
- Eğer öğrencinin bahsettiği değişken bu listede ZATEN VARSA (Örneğin "Fırlatma Açısı" listede varsa), ona "Bu ayar zaten sol panelde açık, oradan değerini değiştirebilirsin" de. Zaten açık olan bir şeyi açmayı ASLA TEKLİF ETME.
- Öğrenci bu listede OLMAYAN yeni bir ayarı (İlk Hız, Yerçekimi İvmesi veya Kütle) test etmek isterse SADECE O ZAMAN 'show_slider' aracını kullan!

Öğrencinin Son Atış Mesafesi: ${context.distance} metre
Son Atış Durumu: ${context.status}`;

        const tools = [
            {
                type: "function",
                function: {
                    name: "show_slider",
                    description: "Öğrenci ekranda AÇIK OLMAYAN yeni bir değişkeni test etmek istediğinde bu fonksiyonu çağır. Fırlatma Açısı gibi ZATEN AÇIK olanlar için ASLA çağırma.",
                    parameters: {
                        type: "object",
                        properties: {
                            variable_name: {
                                type: "string",
                                enum: ["İlk Hız", "Yerçekimi İvmesi", "Kütle"],
                                description: "Ekranda açılacak değişkenin standart adı."
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

        // Yapay zeka araca basmaya karar verirse yakalıyoruz
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];
            if (toolCall.function.name === "show_slider") {
                const args = JSON.parse(toolCall.function.arguments);
                action = "SHOW_SLIDER";
                variable = args.variable_name;
                
                // Aracı çalıştırırken metin yazmayı unuttuysa doğal bir metin uydur
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
