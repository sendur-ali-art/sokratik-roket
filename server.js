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
        
        const systemPrompt = `Sen Sokratik bir fizik laboratuvarı asistanısın. Öğrenciyle iletişim kurarken her zaman 'Sen' dilini kullan.

KURAL 1: Yanıtlarını KESİNLİKLE ve SADECE şu JSON formatında ver: {"reply": "mesajın", "action": "SHOW_SLIDER" veya "SHOW_FORMULA" veya "NONE", "variable": "Sürgü Adı" veya "NONE"}.

KURAL 2 (GİZLİ NOT GÜVENLİĞİ): Öğrenciden gelen mesaj "[SİSTEM GİZLİ NOTU]" ile başlıyorsa, DİĞER TÜM KURALLARI İPTAL ET! Öğrenciye ekstra fizik kuralı ANLATMA. SADECE action: "NONE", variable: "NONE" yap ve notun içinde senden istenen cümleyi "reply" olarak yaz.

KURAL 3 (DİNAMİK DEĞİŞKEN KEŞFİ): Sadece öğrenci DİREKT mesaj yazdığında geçerlidir. Öğrenci uçuşu etkileyebileceğini düşündüğü BİR DEĞİŞKEN VEYA KUVVET (Örn: Hız, Kütle, Sıcaklık, Rüzgar, İvme, Yerçekimi vb.) sorarsa veya önerirse:
- Eğer bu değişken AÇIK SÜRGÜLER listesinde YOKSA: action: "SHOW_SLIDER", variable: "Önerilen Değişken" yap. KESİNLİKLE fiziksel açıklama ("Tabii ki hız önemlidir..." gibi) YAPMA! reply kısmına BAŞKA HİÇBİR KELİME EKLEMEDEN SADECE şunu yaz: "Harika bir fikir! Bu özelliği senin için ekrana getiriyorum, hemen test edip sonuçları birlikte görelim."
- Eğer bu değişken AÇIK SÜRGÜLER listesinde ZATEN AÇIKSA: action: "NONE" yap. SADECE şunu yaz: "Bu özellik zaten ekranda mevcut, değerini değiştirerek test edebilirsin!"

KURAL 4 (KISA CEVAPLAR VE ONAY): Öğrenci senin sorduğun bir soruya "evet", "hayır", "biraz", "işe yaradı", "sanırım" gibi kısa veya günlük cevaplar verirse, bu konu dışı DEĞİLDİR! action: "NONE" yap ve "Anlıyorum. Peki uçuşu etkileyecek BAŞKA hangi fiziksel kurallar veya kuvvetler olabilir?" de.

KURAL 5 (MESAFE KURALI): Öğrenci 'mesafe', 'uzaklık' veya 'menzil' derse action "NONE" kalsın. "Menzil doğrudan değiştirebileceğimiz bir ayar değil, atışın sonucudur. Roketin daha uzağa gitmesi için başlangıçta neleri değiştirmeliyiz?" de.

KURAL 6 (FORMÜL): SADECE [SİSTEM GİZLİ NOTU] içinde "[TÜM DEĞİŞKENLER BULUNDU]" uyarısı gelirse action: "SHOW_FORMULA" yap.

KURAL 7 (KONU DIŞI): Öğrenci fizikle veya roketle kesinlikle ilgisi olmayan (Örn: Maç kaç kaç, nasılsın, oyun oynayalım vb.) bir şey yazarsa, "Söylediğin şeyle konumuz ilişkili değil. İstersen roketin uçuşu üzerine düşünmeye devam edelim." de.

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
