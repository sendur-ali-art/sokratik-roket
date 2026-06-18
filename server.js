const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const http = require('http'); 
const { Server } = require('socket.io'); 
const path = require('path');

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: '*' } }); 

app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// =========================================================================
// ÖĞRETMEN PANELİ ROTALARI VE SOCKET.IO (HAFİYE) MANTIĞI
// =========================================================================

// Öğretmen paneline giriş rotası (Dosyayı public klasöründen çeker)
app.get('/ogretmen', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

// Öğrenci durumlarını hafızada tutan depo
const students = {}; 

io.on('connection', (socket) => {
    // Öğrenci ismini girdiğinde paneli haberdar et
    socket.on('student_join', (data) => {
        students[socket.id] = { id: socket.id, name: data.name, status: '🟢 Yeşil', shots: 0, foundVars: 0, chat: [] };
        io.emit('teacher_update_all', Object.values(students));
    });
    
    // Öğrencinin tarayıcısındaki Hafiye (Ajan) durum raporu yolladığında
    socket.on('student_update', (data) => {
        if(students[socket.id]) {
            students[socket.id].status = data.status;
            students[socket.id].shots = data.shots;
            students[socket.id].foundVars = data.foundVars;
            io.emit('teacher_update_student', students[socket.id]);
        }
    });

    // Öğrenci veya Yapay Zeka bir mesaj yazdığında paneli haberdar et
    socket.on('chat_message', (data) => {
        if(students[socket.id]) {
            const msgObj = { sender: data.sender, text: data.text, time: new Date().toLocaleTimeString('tr-TR') };
            students[socket.id].chat.push(msgObj);
            io.emit('teacher_chat_update', { id: socket.id, msg: msgObj });
        }
    });

    // Öğrenci sayfayı yenilerse veya sekmeyi kapatırsa (Gri Koptu durumu)
    socket.on('disconnect', () => {
        if(students[socket.id]) {
            students[socket.id].status = '⚪ Gri (Koptu)';
            io.emit('teacher_update_student', students[socket.id]);
        }
    });
});

// =========================================================================
// YAPAY ZEKA VE SOKRATİK MANTIK (ESKİ KODUN - BİREBİR AYNI VE DOKUNULMADI)
// =========================================================================

app.post('/api/chat', async (req, res) => {
    try {
        const { message, context, history = [] } = req.body;
        const msg = message.trim();
        const studentName = context.userName || "Öğrenci";

        if (msg.startsWith("Gözlem:")) {
            const obs = msg.split(":")[1].trim();
            const isEffective = (context.isEffectiveTruth === true || context.isEffectiveTruth === "true");
            
            if (obs === "Etkiledi.") {
                if (isEffective) {
                    return res.json({
                        reply: `Harika bir bilimsel gözlem ${studentName}! Matematiksel modelde de bu değişken menzili doğrudan değiştirir. Peki uçuşu etkileyecek BAŞKA ne olabilir?`,
                        action: "NONE", variable: "NONE", showOptions: true
                    });
                } else {
                    return res.json({
                        reply: `Buna emin misin ${studentName}? Bence aynı anda birden fazla ayarla oynadın. Diğerlerini sabit tutup SADECE bu ayarı değiştirerek tekrar denemelisin!`,
                        action: "NONE", variable: "NONE", hintGiven: true
                    });
                }
            } else if (obs === "Etkilemedi.") {
                if (isEffective) {
                    return res.json({
                        reply: `Buna emin misin ${studentName}? Bence diğer ayarları sabit tutup bu değişkeni bir kez daha test etmelisin!`,
                        action: "NONE", variable: "NONE", hintGiven: true
                    });
                } else {
                    return res.json({
                        reply: `Mükemmel bir tespit ${studentName}! Hatırlarsan en başta bu laboratuvarın 'sürtünmesiz ve ideal bir ortam' olduğunu konuşmuştuk. İşte bu yüzden test ettiğin bu değişken menzile etki etmiyor. Bunu bizzat deneyerek kanıtlaman harika! Peki sence uçuşu gerçekten etkileyecek BAŞKA ne olabilir?`,
                        action: "NONE", variable: "NONE", showOptions: true, ineffectiveResolved: true
                    });
                }
            } else if (obs === "Emin değilim.") {
                return res.json({
                    reply: `Bilim deneme yanılma işidir ${studentName}. Diğer ayarları sabit bırakıp tekrar ateşle.`,
                    action: "NONE", variable: "NONE"
                });
            }
        }

        if (msg.startsWith("Fikir:")) {
            const fikir = msg.split(":")[1].trim();
            if (fikir === "Başka yok") {
                if (context.hasAllMainVariables === true || context.hasAllMainVariables === "true") {
                    return res.json({
                        reply: `Harika ${studentName}! Formülün tüm parçalarını buldun. Şimdi bu 3 değişkeni (Açı, Hız, İvme) en doğru şekilde ayarlayarak 150m ilerideki hedefi tam isabetle vurma zamanı! Başarılar!`,
                        action: "NONE", variable: "NONE"
                    });
                } else {
                    return res.json({
                        reply: `Emin misin ${studentName}? Bence formülde menzili doğrudan etkileyen çok temel bir fizik kuralı daha eksik. Biraz daha düşün.`,
                        action: "NONE", variable: "NONE", hintGiven: true
                    });
                }
            } else if (fikir === "Başka var" || fikir === "Emin değilim") {
                return res.json({
                    reply: `Harika, bilim sorgulamaktır! Aklına ne geliyor ${studentName}? Söyle, sürgüsünü açıp test edelim.`,
                    action: "NONE", variable: "NONE"
                });
            }
        }
        
        const systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrencinin adı ${studentName}.
        
        ÇOK KRİTİK KURAL (SPOILER YASAĞI): Öğrenci "Rüzgar", "Hacim", "Kütle", "Hız", "İvme" gibi herhangi bir değişkenin adını söylerse veya "etkiler mi?" diye sorarsa, o şeyin menzili etkileyip etkilemediğini ASLA PEŞİNEN SÖYLEME! Fiziğe dayalı açıklamalar yapmak bu aşamada KESİNLİKLE YASAKTIR.
        
        YAPMAN GEREKEN SADECE ŞUDUR:
        1. Eğer öğrenci fizikle ilgili yeni bir kavram söylediyse, hemen 'show_slider' aracını (tool) tetikle.
        2. Aracı tetiklerken öğrenciye sadece: "Harika bir fikir ${studentName}! Bilimde en iyi yol bizzat deney yapmaktır. Bahsettiğin ayarı ekrana getiriyorum, hemen test edip kendi gözlerinle gör." de. Başka cümle kurma!
        3. Öğrenci "ne yapmalıyım?" gibi akıl danışırsa: "Gezegenin ortamını (ivme) veya roketi fırlatma gücünü (hız) değiştirmeyi deneyebilirsin." gibi dolaylı ipuçları ver. İsimleri açıkça söyleme.
        
        İSTİSNA: Şu an açık olan sürgüler şunlar: [${context.unlockedVariables}]. Eğer öğrencinin söylediği ayar bu listede ZATEN VARSA aracı KULLANMA ve sadece "Bu zaten sol panelde açık, oradan değerini değiştirerek deneyebilirsin." de.`;

        const tools = [
            {
                type: "function",
                function: {
                    name: "show_slider",
                    description: "Öğrenci ekranda AÇIK OLMAYAN yeni bir değişkeni (Rüzgar, Hacim, Kütle, Hız, İvme vb.) test etmek için söylediğinde çalıştır.",
                    parameters: {
                        type: "object",
                        properties: {
                            variable_name: { type: "string", description: "Açılacak değişkenin adı. Öğrenci rüzgar dediyse 'Rüzgar', hız dediyse 'İlk Hız' yaz." }
                        },
                        required: ["variable_name"]
                    }
                }
            }
        ];

        const aiMessages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: msg } 
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: aiMessages,
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
server.listen(PORT, () => console.log(`Sunucu aktif.`));
