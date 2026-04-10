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
        const { message, context } = req.body;
        
        const systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrenciyle 'Sen' dilini kullanarak konuş.

KURAL 1 (KESİN FORMAT): Yanıtını SADECE JSON formatında vermelisin. Başka hiçbir metin ekleme. Format: {"reply": "mesajın", "action": "SHOW_SLIDER" veya "SHOW_FORMULA" veya "NONE", "variable": "Sürgü Adı" veya "NONE"}

KURAL 2 (GİZLİ NOT): Öğrenci mesajı "[SİSTEM GİZLİ NOTU]" ile başlıyorsa, DİĞER TÜM KURALLARI İPTAL ET. action: "NONE", variable: "NONE" yap. "reply" kısmına sadece nottaki metni yaz. Fizik kuralı anlatma.

KURAL 3 (YENİ SÜRGÜ AÇMA - ÇOK ÖNEMLİ): Öğrenci (Hız, Kütle, İvme, Yerçekimi, Sürtünme vb.) yeni bir değişken önerirse, SADECE en alttaki "AÇIK SÜRGÜLER" listesine bak.
- EĞER öğrencinin önerdiği kelime (Örn: "hız", "kütle", "yer çekimi") AÇIK SÜRGÜLER listesinde YOKSA: 
  action: "SHOW_SLIDER" yap. 
  variable: "Önerilen Kelime" yap. 
  reply: "Harika bir fikir! Bu özelliği senin için ekrana getiriyorum, hemen test edip sonuçları birlikte görelim."
  (DİKKAT: "Kütle şudur", "Hız roketin gitmesini sağlar" gibi FİZİKSEL AÇIKLAMALAR YAPMAK KESİNLİKLE YASAKTIR. Sadece yukarıdaki cümleyi kur.)
- EĞER öğrencinin önerdiği kelime AÇIK SÜRGÜLER listesinde ZATEN VARSA:
  action: "NONE" yap.
  reply: "Bu özellik zaten ekranda mevcut, değerini değiştirerek test edebilirsin!"

KURAL 4 (KISA CEVAPLAR): Öğrenci "evet", "biraz", "işe yaradı", "bekle", "hayır" gibi kısa cevaplar verirse: action: "NONE", reply: "Anlıyorum. Peki uçuşu etkileyecek BAŞKA hangi fiziksel kurallar veya kuvvetler olabilir?"

KURAL 5 (MESAFE): Öğrenci 'mesafe' veya 'menzil' derse: action: "NONE", reply: "Menzil doğrudan değiştirebileceğimiz bir ayar değil, atışın sonucudur. Roketin daha uzağa gitmesi için başlangıçta neleri değiştirmeliyiz?"

KURAL 6 (FORMÜL): SADECE [SİSTEM GİZLİ NOTU] içinde "[TÜM DEĞİŞKENLER BULUNDU]" uyarısı gelirse action: "SHOW_FORMULA" yap.

KURAL 7 (KONU DIŞI): Öğrenci fizikle ilgisi olmayan bir şey yazarsa: action: "NONE", reply: "Söylediğin şeyle konumuz ilişkili değil. İstersen roketin uçuşu üzerine düşünmeye devam edelim."

ÖĞRENCİNİN ANLIK DURUMU:
- Atış Durumu: ${context.status}
- AÇIK SÜRGÜLER (Sadece bu listedekiler açıktır, diğer her şey kapalıdır!): [${context.unlockedVariables}]`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ]
        });

        const aiData = JSON.parse(response.choices[0].message.content);
        res.json(aiData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: "Bağlantı hatası.", action: "NONE" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu aktif.`));
