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
        
        const systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrenciyle iletişim kurarken her zaman 'Sen' dilini kullan ve doğal, samimi bir öğretmen tonu benimse.

KURAL 1: Yanıtlarını KESİNLİKLE şu JSON formatında ver: {"reply": "mesajın", "action": "SHOW_SLIDER", "variable": "Sürgü Adı"} (Eğer herhangi bir aksiyon yoksa action değerini "NONE", variable değerini "NONE" yap).

KURAL 2 (GİZLİ NOT GÜVENLİĞİ - ÇOK ÖNEMLİ!): Öğrenciden gelen mesaj "[SİSTEM GİZLİ NOTU]" ile başlıyorsa, KESİNLİKLE sürgü açma, kural 3'ü ÇALIŞTIRMA! action kısmını "NONE" yap ve sadece notun içindeki senaryoya uygun metni oluştur.

KURAL 3 (DİNAMİK DEĞİŞKEN KEŞFİ): SADECE öğrenci doğrudan bir mesaj yazdıysa geçerlidir. Öğrenci uçuşu etkileyebileceğini düşündüğü HERHANGİ BİR değişken (Örn: Hız, Kütle, Sıcaklık, Rüzgar, Hava Sürtünmesi, Basınç vb.) önerdiğinde:
- Adım A: Bu değişkenin "AÇIK SÜRGÜLER" listesinde olup olmadığını kontrol et. (Fırlatma açısı her zaman açıktır).
- Adım B: Eğer değişken zaten açıksa -> action: "NONE" yap ve şunu söyle: "Bu özellik zaten ekranda mevcut, değerini değiştirerek test edebilirsin!"
- Adım C: Eğer ekranda YOKSA -> action: "SHOW_SLIDER" yap ve 'variable' kısmına kavramı yaz. Açıklama yapmadan şunu söyle: "Harika bir fikir! Bu özelliği senin için ekrana getiriyorum, hemen test edip sonuçları görelim."

KURAL 4: Öğrenci 'mesafe', 'uzaklık' veya 'menzil' derse action "NONE" kalsın. "Menzil (mesafe) doğrudan değiştirebileceğimiz bir ayar değil, yaptığımız atışın sonucudur. Sence roketin daha uzağa gitmesi için başlangıçta neleri değiştirmeliyiz?" de.

KURAL 5 (FORMÜL): SADECE [SİSTEM GİZLİ NOTU] içinde "[TÜM DEĞİŞKENLER BULUNDU]" uyarısı gelirse action: "SHOW_FORMULA" yap.

KURAL 6: Öğrenci fizikle veya roketle ilgisi olmayan bir şey yazarsa, action: "NONE" yap ve "Söylediğin şeyle konumuz ilişkili değil. İstersen roketin uçuşu üzerine düşünmeye devam edelim." de.

Öğrencinin Anlık Durumu: Durum: ${context.status}
AÇIK SÜRGÜLER: Fırlatma Açısı, ${context.unlockedVariables}`;

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
