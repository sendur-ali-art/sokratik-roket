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
        const msg = message.trim().toLowerCase();
        
        let systemPrompt = "";
        let useTools = false;
        
        // İsmi değişkene atayalım
        const studentName = context.userName || "Öğrenci";

        // KATI ALGORİTMA: Sadece basılan butona göre yönlendir
        if (msg.includes("etkiledi") && !msg.includes("etkilemedi")) {
            if (context.isEffectiveTruth === true || context.isEffectiveTruth === "true") {
                systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrencinin adı ${studentName}. Öğrenci "${context.activeTestVariable}" değişkeninin menzili etkilediğini doğru saptadı. 
                Ona ismiyle hitap ederek bu gözlemini onaylayan samimi bir tebrik cümlesi kur ve KESİNLİKLE şu soruyla bitir: "Peki sence uçuşu etkileyecek BAŞKA ne olabilir?"
                SAKIN sürtünmesiz/ideal ortam açıklaması yapma, çünkü bu değişken zaten etkilidir!`;
            } else {
                systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrencinin adı ${studentName}. Öğrenci "${context.activeTestVariable}" değişkeninin menzili etkilediğini sandı fakat bu değişken etkisizdir.
                Görevin öğrenciye KESİNLİKLE şu yanıtı vermektir: "Buna emin misin ${studentName}? Bence aynı anda birden fazla ayarla oynadın. Diğerlerini sabit tutup SADECE bu ayarı değiştirerek tekrar denemelisin!"`;
            }
        } 
        else if (msg.includes("etkilemedi")) {
            if (context.isEffectiveTruth === true || context.isEffectiveTruth === "true") {
                systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrencinin adı ${studentName}. Öğrenci "${context.activeTestVariable}" ayarının menzili etkilemediğini sandı fakat bu değişken KESİNLİKLE etkilidir.
                Görevin öğrenciye KESİNLİKLE tam olarak şu yanıtı vermektir: "Buna emin misin ${studentName}? Bence diğer ayarları sabit tutup bu değişkeni bir kez daha test etmelisin!"`;
            } else {
                systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrencinin adı ${studentName}. Öğrenci "${context.activeTestVariable}" değişkeninin menzili etkilemediğini doğru bildi.
                Görevin onu tebrik etmek ve KESİNLİKLE şu açıklamayı yaparak bitirmektir: "Mükemmel bir tespit! Hatırlarsan en başta bu laboratuvarın 'sürtünmesiz ve ideal bir ortam' olduğunu konuşmuştuk. İşte bu yüzden test ettiğin bu değişken menzile etki etmiyor. Peki sence uçuşu gerçekten etkileyecek BAŞKA ne olabilir?"`;
            }
        } 
        else if (msg.includes("emin değilim")) {
            systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrencinin adı ${studentName}. Öğrenci emin olmadığını belirtti. Görevin ona tam olarak şu yanıtı vermektir: "Bilim deneme yanılma işidir. Diğer ayarları sabit bırakıp tekrar ateşle."`;
        } 
        else if (msg.includes("başka yok")) {
            if (context.hasAllMainVariables === true || context.hasAllMainVariables === "true") {
                systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrencinin adı ${studentName}. Öğrenci tüm ana parametreleri (Açı, Hız, İvme) başarıyla buldu ve başka yok dedi.
                Görevin ona coşkulu bir başarı mesajı vererek şunu demektir: "Harika ${studentName}! Formülün tüm parçalarını buldun. Şimdi bu 3 değişkeni (Açı, Hız, İvme) en doğru şekilde ayarlayarak 150m ilerideki hedefi tam isabetle vurma zamanı! Başarılar!"`;
            } else {
                systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrencinin adı ${studentName}. Öğrenci henüz tüm değişkenleri bulamadığı halde başka yok dedi. Görevin ona şunu demektir: "Emin misin ${studentName}? Bence formülde menzili doğrudan etkileyen çok temel bir fizik kuralı daha eksik. Biraz daha düşün."`;
            }
        } 
        else if (msg.includes("başka var")) {
            systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrencinin adı ${studentName}. Öğrenci yeni şeyler arıyor. Görevin ona tam olarak şunu demektir: "Harika, bilim sorgulamaktır! Aklına ne geliyor? Söyle, sürgüsünü açıp test edelim."`;
        } 
        else {
            // YENİ VE SIKI KURAL: Fikri duyunca sakın fizik dersi verme, doğrudan aracı çalıştır!
            useTools = true;
            systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrencinin adı ${studentName}.
            
            ÇOK KRİTİK KURAL (SPOILER YASAĞI): Öğrenci "Rüzgar", "Hacim", "Kütle", "Hız", "İvme" gibi herhangi bir değişkenin adını söylerse veya "etkiler mi?" diye sorarsa, o şeyin menzili etkileyip etkilemediğini ASLA PEŞİNEN SÖYLEME! Fiziğe dayalı açıklamalar yapmak bu aşamada YASAKTIR.
            
            YAPMAN GEREKEN SADECE ŞUDUR:
            1. Eğer öğrenci fizikle ilgili yeni bir kavram söylediyse, hemen 'show_slider' aracını (tool) tetikle.
            2. Öğrenciye: "Harika bir fikir ${studentName}! Bilimde en iyi yol bizzat deney yapmaktır. Bahsettiğin ayarı ekrana getiriyorum, hemen test edip kendi gözlerinle gör." diyerek onu cesaretlendir.
            3. "Merhaba", "Nasılsın" gibi genel sohbetlere doğalca yanıt ver.
            
            İSTİSNA: Şu an açık olan sürgüler şunlar: [${context.unlockedVariables}]. Eğer öğrencinin söylediği ayar bu listede ZATEN VARSA aracı KULLANMA ve sadece "Bu zaten sol panelde açık, oradan değerini değiştirebilirsin." de.`;
        }

        const tools = [
            {
                type: "function",
                function: {
                    name: "show_slider",
                    description: "Öğrenci ekranda AÇIK OLMAYAN yeni bir değişkeni (Rüzgar, Hacim, Kütle, Hız, İvme vb.) test etmek için söylediğinde çalıştır.",
                    parameters: {
                        type: "object",
                        properties: {
                            variable_name: { type: "string", description: "Açılacak değişkenin adı. Öğrenci rüzgar dediyse 'Rüzgar', kütle dediyse 'Kütle' yaz." }
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
            tools: useTools ? tools : undefined,
            tool_choice: useTools ? "auto" : undefined
        });

        const responseMessage = response.choices[0].message;
        let replyText = responseMessage.content || "";
        let action = "NONE";
        let variable = "NONE";

        if (useTools && responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];
            if (toolCall.function.name === "show_slider") {
                const args = JSON.parse(toolCall.function.arguments);
                action = "SHOW_SLIDER";
                variable = args.variable_name; 
                if (!replyText) replyText = `Harika bir fikir ${studentName}! ${variable} ayarını ekrana getiriyorum. Hemen değerini değiştirip test edelim.`;
            }
        }

        res.json({ reply: replyText, action: action, variable: variable });

    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: "Bağlantı hatası.", action: "NONE" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu aktif.`));
