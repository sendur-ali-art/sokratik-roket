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
        
        // 1. YAPAY ZEKANIN KİMLİĞİ VE FİZİK BİLGİSİ (Tamamen Doğal Dil)
        const systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Amacın öğrenciye formülleri ezberletmek değil, eğik atış (projectile motion) prensiplerini deney yaparak keşfettirmektir.

Fiziksel Modelin (Sürtünmesiz Ortam):
- Menzil (Uçuş Mesafesi) = (İlk Hız² * sin(2 * Fırlatma Açısı)) / Yerçekimi İvmesi
- Kütlenin (ağırlık, hacim vb.) sürtünmesiz ortamda menzile HİÇBİR ETKİSİ YOKTUR.

Öğrencinin Anlık Durumu:
- Ekranda Açık Olan Ayarlar: [${context.unlockedVariables}]
- Son Atış Mesafesi: ${context.distance} metre
- Son Atış Durumu: ${context.status}

Görevin:
1. Öğrenciyle tamamen doğal, samimi ve insani bir dille sohbet et. JSON veya robotik kurallar düşünme.
2. Öğrenci menzili etkileyen (veya kütle gibi etkilemeyen) bir değişken bulduğunda onu onayla ve test etmesi için cesaretlendir.
3. Öğrenci yanlış bir çıkarım yaparsa (Örn: "açı etkilemiyor" veya "kütle işe yaradı" derse), formülü bildiğin için bu duruma şaşır ve "Emin misin? Fizik kurallarına göre böyle olmamalı, diğer ayarları sabit tutup tekrar dener misin?" diyerek onu doğruya yönlendir.
4. ÖNEMLİ: Eğer öğrenci İlk Hız, Yerçekimi İvmesi veya Kütle değişkenlerinden birini test etmeye karar verirse, konuşmanın akışında SANA VERİLEN 'show_slider' ARACINI (TOOL) KULLANARAK o sürgüyü arayüzde aç!`;

        // 2. YAPAY ZEKAYA VERDİĞİMİZ BUTON (FUNCTION CALLING)
        const tools = [
            {
                type: "function",
                function: {
                    name: "show_slider",
                    description: "Öğrenci İlk Hız, Yerçekimi İvmesi veya Kütle değişkenlerini test etmek istediğinde, arayüzde o sürgüyü açmak için bu fonksiyonu çalıştır. Zaten açık olan bir şeyi tekrar açma.",
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

        // 3. DOĞAL SOHBET İSTEĞİ (Araçlarla Birlikte)
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            tools: tools,
            tool_choice: "auto" // Yapay zeka araca basıp basmayacağına kendisi karar verir
        });

        const responseMessage = response.choices[0].message;
        
        let replyText = responseMessage.content || "";
        let action = "NONE";
        let variable = "NONE";

        // 4. YAPAY ZEKA ARACA BASMAYA KARAR VERDİYSE (TOOL CALL YAKALAMA)
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];
            if (toolCall.function.name === "show_slider") {
                const args = JSON.parse(toolCall.function.arguments);
                action = "SHOW_SLIDER";
                variable = args.variable_name;
                
                // Eğer yapay zeka aracı tetiklerken metin yazmayı unuttuysa, otomatik metin ekle:
                if (!replyText) {
                    replyText = `Harika bir fikir! ${variable} ayarını ekrana getiriyorum. Hemen değerini değiştirip test edelim.`;
                }
            }
        }

        // Önyüzün beklediği formata (JSON) sunucu tarafında biz dönüştürüyoruz, yapay zeka değil.
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
