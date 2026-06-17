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
1. YENİ SÜRGÜ AÇMA: Öğrenci Rüzgar, Hacim, Sıcaklık, Kütle, Hız vb. herhangi bir şeyi test etmek isterse KESİNLİKLE 'show_slider' aracını (tool) kullan! AÇIK olanlara çağırma.

2. ÖĞRENCİ GÖZLEM YAPTIYSA ("Etkiledi" / "Etkilemedi" dediğinde):
   Öğrencinin söylediği ile Matematiksel Gerçekliğini karşılaştır.
   
   - DURUM A (Doğru Bildi ve Değişken ETKİLİ BİR ŞEY): Öğrenci "Etkiledi" dedi ve Matematiksel Gerçek "ETKİLER" ise -> SADECE ŞUNU SÖYLE: "Harika bir bilimsel gözlem! Matematiksel modelde de bu değişken menzili doğrudan değiştirir. Peki uçuşu etkileyecek BAŞKA ne olabilir?" (Sakın sürtünmesiz ortamdan bahsetme!)
   
   - DURUM B (Doğru Bildi ve Değişken ETKİSİZ BİR ŞEY): Öğrenci "Etkilemedi" dedi ve Matematiksel Gerçek "HİÇ ETKİLEMEZ" ise -> ŞUNU SÖYLE: "Mükemmel bir tespit! Hatırlarsan en başta bu laboratuvarın 'sürtünmesiz ve ideal bir ortam' olduğunu konuşmuştuk. İşte bu yüzden test ettiğin bu değişken menzile etki etmiyor. Peki sence uçuşu gerçekten etkileyecek BAŞKA ne olabilir?"

   - DURUM C (Yanlış Bildi): Öğrencinin söylediği ile Matematiksel Gerçek uyuşmuyorsa -> Cevabı ASLA verme! Sadece: "Buna emin misin? Bence diğer ayarları sabit tutup bu değişkeni bir kez daha test etmelisin!" de.
     
   - DURUM D (Emin Değil): Öğrenci "Emin değilim" derse -> "Bilim deneme yanılma işidir. Diğer ayarları sabit bırakıp tekrar ateşle." de.

3. "BAŞKA YOK" DURUMU:
   Öğrenci "Başka yok" derse, YUKARIDAKİ "Öğrenci 3 Temel Değişkeni de buldu mu?" bilgisini KONTROL ET:
   - Eğer EVET yazıyorsa -> "Harika! Formülün tüm parçalarını buldun. Şimdi bu 3 değişkeni (Açı, Hız, İvme) en doğru şekilde ayarlayarak 150m ilerideki hedefi tam isabetle vurma zamanı! Başarılar!" de.
   - Eğer HAYIR yazıyorsa -> "Emin misin? Bence formülde menzili doğrudan etkileyen çok temel bir fizik kuralı daha eksik. Biraz daha düşün." de.

4. "BAŞKA VAR" veya "EMİN DEĞİLİM" DURUMU:
   Öğrenci "Başka var" veya "Emin değilim" derse -> "Harika, bilim sorgulamaktır! Aklına ne geliyor? Söyle, sürgüsünü açıp test edelim." de.

Çok doğal, dostane ve öğretici bir Türkçe kullan.
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
