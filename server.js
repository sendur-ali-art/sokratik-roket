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

--- FİZİKSEL GERÇEKLİK (JAVASCRIPT TARAFINDAN KESİN OLARAK HESAPLANDI) ---
Öğrencinin test ettiği veya üzerine konuştuğu son değişken: "${context.activeTestVariable}"
Matematiksel Gerçek: Bu değişken menzili ${context.isEffectiveTruth ? "KESİNLİKLE ETKİLER" : "HİÇ ETKİLEMEZ (Çünkü sürtünmesiz ortam)"}.

--- SOKRATİK GÖREVLERİN ---
1. YENİ SÜRGÜ AÇMA (Öğrenci Kütle, Hız, Hacim vb. herhangi bir şeyi ekranda görmek isterse):
   'show_slider' aracını (tool) kullan ve "Harika fikir! Sürgüyü ekrana getiriyorum" de.

2. ÖĞRENCİNİN GÖZLEMİNİ DEĞERLENDİRME (Öğrenci "Etkiledi", "Etkilemedi" veya "Emin değilim" derse):
   Öğrencinin söylediği şey ile yukarıdaki "Matematiksel Gerçek" UYUŞUYOR MU kontrol et:
   
   - EĞER UYUŞUYORSA (Doğru bildiyse): 
     Onu tebrik et. "Mükemmel bilimsel tespit! Peki sence uçuşu etkileyecek BAŞKA ne olabilir?" de. (Not: Eğer bildiği şey etkisiz bir değişkense, ona 'Sürtünmesiz ortam olduğu için' kuralını da kısaca hatırlat).
     
   - EĞER UYUŞMUYORSA (Yanlış bildiyse): 
     Cevabı ASLA verme! Sadece: "Buna emin misin? Bence diğer ayarları sabit tutup bu değişkeni bir kez daha test etmelisin!" diyerek onu tekrar denemeye it.
     
   - EĞER EMİN DEĞİLSE: 
     "Bilim zaten deneme yanılma işidir! Diğer tüm sürgüleri sabit bırak ve sadece bu ayarı değiştirerek bir atış daha yap." diyerek cesaretlendir.

--- DİKKAT ---
- Şu an ekranda açık olan sürgüler: [${context.unlockedVariables}]. Zaten açık olan bir şeyi 'show_slider' aracı ile tekrar AÇMA! Sadece "Bu sol panelde zaten açık" de.
- Çok doğal, dostane ve öğretici bir Türkçe kullan.
`;

        const tools = [
            {
                type: "function",
                function: {
                    name: "show_slider",
                    description: "Öğrenci ekranda AÇIK OLMAYAN HERHANGİ BİR değişkeni (Hız, İvme, Hacim, Rüzgar, Kütle vb. ne isterse) test etmek istediğinde bu fonksiyonu çağır.",
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
