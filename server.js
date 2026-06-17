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

--- FİZİKSEL GERÇEKLİK ---
Öğrencinin son test ettiği değişken: "${context.activeTestVariable}"
Matematiksel Gerçek: Bu değişken menzili ${context.isEffectiveTruth ? "ETKİLER" : "HİÇ ETKİLEMEZ"}.
Şu an AÇIK olan sürgüler: [${context.unlockedVariables}]
Öğrenci 3 Temel Değişkeni de buldu mu?: ${context.hasAllMainVariables ? "EVET" : "HAYIR"}

--- GÖREVLERİN VE KURALLAR ---
1. YENİ SÜRGÜ AÇMA (ÖNEMLİ): Öğrenci Rüzgar, Hacim, Sıcaklık, Kütle, Hız vb. herhangi bir şeyi test etmek isterse KESİNLİKLE 'show_slider' aracını (tool) kullan! SAKIN ekranda olmayan bir değişkene "Bu zaten sol panelde açık" deme. Aracı kullan!

2. ÖĞRENCİ GÖZLEM YAPTIYSA ("Etkiledi" / "Etkilemedi" butonlarına bastıysa):
   - Eğer Matematiksel Gerçek ile öğrencinin dediği UYUŞUYORSA (Doğru bildiyse):
     * Onu tebrik et.
     * EĞER test ettiği değişken ETKİSİZ (Hacim, Rüzgar, Kütle vb.) ise ŞUNU KESİNLİKLE SÖYLE: "Hatırlarsan en başta laboratuvarımızın 'sürtünmesiz ve ideal' olduğunu söylemiştik. Bu yüzden test ettiğin bu ayar menzile etki etmiyor."
     * Cümlenin sonuna DAİMA şunu ekle: "Peki sence uçuşu etkileyecek BAŞKA ne olabilir?"
     
   - Eğer Matematiksel Gerçek ile UYUŞMUYORSA (Yanlış bildiyse): 
     Cevabı verme! Sadece: "Buna emin misin? Bence diğer ayarları sabit tutup bu değişkeni bir kez daha test etmelisin!" diyerek tekrar denemeye it.
     
   - Öğrenci "Emin değilim" derse: "Bilim deneme yanılma işidir. Diğer ayarları sabit bırakıp tekrar ateşle." de.

3. "BAŞKA YOK" DURUMU (YENİ KURAL):
   Öğrenci "Başka yok" derse:
   - Eğer "Öğrenci 3 Temel Değişkeni de buldu mu?" = EVET ise -> "Harika! Formülün tüm parçalarını buldun. Şimdi bu 3 değişkeni (Açı, Hız, İvme) en doğru şekilde ayarlayarak 150m ilerideki hedefi tam isabetle vurma zamanı! Başarılar!" de.
   - Eğer HAYIR ise -> "Emin misin? Bence formülde menzili doğrudan etkileyen çok temel bir fizik kuralı daha eksik. Biraz daha düşün." de.

4. "BAŞKA VAR" veya "EMİN DEĞİLİM" DURUMU:
   Öğrenci "Başka var" veya "Emin değilim" derse -> "Harika, bilim sorgulamaktır! Aklına ne geliyor? Söyle, sürgüsünü açıp test edelim." de.

Çok doğal, dostane ve öğretici bir Türkçe kullan. Asla robotik veya sıkıcı olma.
`;

        const tools = [
            {
                type: "function",
                function: {
                    name: "show_slider",
                    description: "Öğrenci ekranda AÇIK OLMAYAN HERHANGİ BİR değişkeni (Hız, İvme, Hacim, Rüzgar, Kütle vb. ne isterse) test etmek istediğinde bu fonksiyonu çağır. AÇIK olanlara çağırma.",
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
