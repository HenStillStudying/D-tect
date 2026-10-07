// ─────────────────────────────────────────────
//  data.id.js — Definisi bab & pertanyaan (Bahasa Indonesia)
//  Struktur identik dengan data.en.js: key, type, color, dan
//  awalan huruf (A/B/C/D...) sama agar scoring.js tetap berfungsi.
// ─────────────────────────────────────────────

var chaptersID = [
  {
    id: "profile",
    title: "👤 Bab 1: Profil Pribadi",
    subtitle: "Bantu kami memahami latar belakang Anda agar penilaian risiko lebih akurat.",
    questions: [
      {
        text: "Siapa nama Anda?",
        type: "text",
        key: "Name",
        placeholder: "cth. Budi",
        info: "Untuk keperluan pengumpulan data"
      },
      {
        text: "Berapa usia Anda?",
        type: "number",
        key: "age",
        placeholder: "cth. 29",
        unit: "tahun",
        min: 1,
        max: 120,
        info: "Orang dewasa yang lebih tua memproduksi lebih sedikit vitamin D dari sinar matahari dan menyerapnya kurang efisien dari makanan."
      },
      {
        text: "Apa jenis kelamin biologis Anda?",
        type: "choice",
        key: "sex",
        options: ["A. Laki-laki", "B. Perempuan"],
        info: "Perbedaan hormon dapat memengaruhi metabolisme vitamin D. Wanita hamil atau menyusui memiliki risiko lebih tinggi."
      },
      {
        text: "Tipe kulit Fitzpatrick mana yang paling sesuai dengan Anda?",
        type: "skintone",
        key: "skinTone",
        options: [
          { value: "A. Tipe I – Sangat Terang",  color: "#FDDBB4", label: "Tipe I",   desc: "Sangat terang, selalu terbakar, tidak pernah cokelat" },
          { value: "B. Tipe II – Terang",         color: "#F5C89A", label: "Tipe II",  desc: "Terang, biasanya terbakar, kadang cokelat" },
          { value: "C. Tipe III – Sedang",        color: "#E8A87C", label: "Tipe III", desc: "Sedang, kadang terbakar, selalu cokelat" },
          { value: "D. Tipe IV – Zaitun",         color: "#C68642", label: "Tipe IV",  desc: "Zaitun, jarang terbakar, mudah cokelat" },
          { value: "E. Tipe V – Cokelat",         color: "#8D5524", label: "Tipe V",   desc: "Cokelat, sangat jarang terbakar, selalu cokelat" },
          { value: "F. Tipe VI – Gelap",          color: "#4A2912", label: "Tipe VI",  desc: "Cokelat tua/hitam, tidak pernah terbakar" }
        ],
        info: "Skala Fitzpatrick mengklasifikasikan kulit berdasarkan reaksinya terhadap sinar UV. Kulit lebih gelap (Tipe V–VI) memiliki lebih banyak melanin yang menghalangi UV dan mengurangi sintesis vitamin D — diperlukan lebih banyak paparan matahari untuk menghasilkan jumlah yang sama."
      },
      {
        text: "Apa yang paling menggambarkan lingkungan kerja atau aktivitas harian Anda di siang hari?",
        type: "choice",
        key: "workType",
        options: [
          "A. Sebagian besar di luar ruangan (cth. konstruksi, pertanian, kerja lapangan)",
          "B. Campuran dalam dan luar ruangan",
          "C. Sebagian besar di dalam ruangan (cth. kantor, kerja jarak jauh, belajar)"
        ],
        info: "Orang yang bekerja di dalam ruangan mendapatkan jauh lebih sedikit sinar matahari alami dibanding yang bekerja di luar ruangan, sehingga secara signifikan mengurangi sintesis vitamin D. (Kerja shift malam ditanyakan secara terpisah.)"
      },
      {
        text: "Berapa tinggi badan Anda?",
        type: "number",
        key: "heightCm",
        placeholder: "cth. 165",
        unit: "cm",
        min: 50,
        max: 250,
        info: "Digunakan bersama berat badan Anda untuk menghitung Indeks Massa Tubuh (IMT) — vitamin D bersifat larut lemak, sehingga komposisi tubuh memengaruhi kadar dalam darah."
      },
      {
        text: "Berapa berat badan Anda?",
        type: "number",
        key: "weightKg",
        placeholder: "cth. 60",
        unit: "kg",
        min: 20,
        max: 300,
        info: "Vitamin D bersifat larut lemak dan dapat terperangkap dalam lemak tubuh. Orang dengan berat badan lebih tinggi sering membutuhkan lebih banyak vitamin D untuk menjaga kadar darah yang sehat."
      },
      {
        text: "Di mana Anda bekerja?",
        type: "text",
        key: "location",
        placeholder: "cth. Jakarta",
        info: "Data ini diambil semata-mata untuk indeks UV lokal."
      }
    ]
  },
  {
    id: "lifestyle",
    title: "☀️ Bab 2: Paparan Matahari & Gaya Hidup",
    subtitle: "Kebiasaan paparan matahari dan gaya hidup harian Anda langsung memengaruhi kadar vitamin D.",
    questions: [

      // ── Kerja & shift ─────────────────────────────
      {
        text: "Apakah pekerjaan Anda melibatkan jam shift malam?",
        type: "choice",
        key: "nightShift",
        options: [
          "A. Ya, shift malam tetap",
          "B. Ya, shift bergantian (kadang siang, kadang malam)",
          "C. Tidak, jam kerja siang hari biasa",
          "D. Saya tidak bekerja / pensiunan / pelajar"
        ],
        info: "Pekerja shift malam sering memiliki kadar vitamin D yang sangat rendah karena tidur saat jam UV puncak dan bekerja saat matahari tidak bersinar."
      },
      {
        text: "Berapa lama Anda bekerja per hari?",
        type: "choice",
        key: "worktime",
        options: [
          "A. Kurang dari 3 jam",
          "B. 3–6 jam",
          "C. 7–10 jam",
          "D. 11 jam atau lebih"
        ],
        info: "Jam kerja yang lebih panjang — terutama di dalam ruangan — dapat secara signifikan mengurangi waktu yang tersedia untuk paparan sinar matahari."
      },

      // ── Paparan matahari di dalam ruangan ─────────
      {
        text: "Saat bekerja di dalam ruangan, seberapa sering Anda terkena sinar matahari? (cth. dekat jendela, teras, balkon, atau halaman)",
        type: "choice",
        key: "indoorSunFreq",
        options: [
          "A. Tidak pernah",
          "B. 1 kali seminggu",
          "C. 2–3 kali seminggu",
          "D. 4–5 kali seminggu",
          "E. Lebih dari 5 kali seminggu"
        ],
        info: "Bahkan paparan matahari sebentar dekat jendela atau saat istirahat dapat berkontribusi pada sintesis vitamin D, meski kaca menghalangi sebagian besar sinar UVB."
      },

      // ── Paparan matahari di luar ruangan ──────────
      {
        text: "Berapa lama Anda menghabiskan waktu di luar ruangan terkena sinar matahari langsung dalam sehari?",
        type: "choice",
        key: "sunTime",
        options: [
          "A. Tidak pernah atau kurang dari 5 menit",
          "B. 5–15 menit",
          "C. 15–30 menit",
          "D. 30–60 menit",
          "E. Lebih dari 1 jam"
        ],
        info: "Cukup 15–30 menit paparan sinar matahari siang pada lengan dan wajah beberapa kali seminggu dapat meningkatkan kadar vitamin D secara signifikan."
      },
      {
        text: "Saat bekerja di luar ruangan, pada jam berapa biasanya Anda terkena sinar matahari?",
        type: "choice",
        key: "outdoorSunTime",
        options: [
          "A. Tidak pernah atau sebelum pukul 07.00",
          "B. 07.00 – 09.00",
          "C. 09.00 – 11.00",
          "D. 11.00 – 13.00",
          "E. 13.00 – 17.00"
        ],
        info: "Waktu optimal untuk sintesis vitamin D dari sinar matahari adalah antara pukul 10.00 dan 14.00 ketika sinar UVB paling intens."
      },
      {
        text: "Saat bekerja di luar ruangan, bagian tubuh mana yang biasanya terkena sinar matahari?",
        type: "choice",
        key: "outdoorSunBodyPart",
        options: [
          "A. Tidak ada / tidak terkena",
          "B. Hanya wajah",
          "C. Wajah dan tangan",
          "D. Wajah dan lengan",
          "E. Wajah, lengan, dan kaki"
        ],
        info: "Semakin luas area kulit yang terbuka, semakin banyak vitamin D yang diproduksi. Memakai lengan panjang dan sarung tangan di luar ruangan dapat sangat mengurangi sintesis meski sinar matahari kuat."
      },

      // ── Aktivitas rekreasi di luar ruangan ────────
      {
        text: "Seberapa sering Anda melakukan aktivitas rekreasi di luar ruangan? (cth. olahraga, mendaki, berjalan, berkemah, berenang)",
        type: "choice",
        key: "recFreq",
        options: [
          "A. Tidak pernah atau kurang dari sekali seminggu",
          "B. Sekali seminggu",
          "C. 2–3 kali seminggu",
          "D. 4–5 kali seminggu",
          "E. Lebih dari 5 kali seminggu"
        ],
        info: "Aktivitas rekreasi di luar ruangan menambah paparan sinar matahari yang berarti di luar jam kerja dan merupakan salah satu cara terbaik alami untuk meningkatkan vitamin D."
      },

      // ── Keteduhan & perlindungan ──────────────────
      {
        text: "Saat di luar ruangan, seberapa sering Anda berada di tempat teduh? (cth. di bawah pohon, bangunan, atau payung)",
        type: "choice",
        key: "shadeUse",
        options: [
          "A. Selalu di tempat teduh",
          "B. Sering di tempat teduh",
          "C. Kadang-kadang di tempat teduh",
          "D. Jarang di tempat teduh",
          "E. Tidak pernah — saya selalu di bawah sinar matahari langsung"
        ],
        info: "Tempat teduh secara signifikan mengurangi paparan UV. Meski melindungi dari sengatan matahari, keteduhan juga sangat mengurangi sintesis vitamin D."
      },
      {
        text: "Apakah Anda biasanya memakai tabir surya saat keluar ruangan?",
        type: "choice",
        key: "sunscreen",
        options: [
          "A. Selalu — SPF 50+ di semua kulit yang terbuka",
          "B. Selalu — SPF 30–50",
          "C. Kadang-kadang — SPF 15–30",
          "D. Jarang",
          "E. Tidak pernah"
        ],
        info: "Tabir surya SPF 50+ dapat menghalangi hingga 98% sinar UVB yang diperlukan untuk sintesis vitamin D. Meski penting untuk perlindungan kulit, tabir surya secara signifikan membatasi produksi vitamin D."
      },
      {
        text: "Pakaian seperti apa yang biasanya Anda kenakan di luar ruangan?",
        type: "choice",
        key: "clothing",
        options: [
          "A. Tertutup penuh — warna gelap (cth. abaya, seragam lengkap)",
          "B. Lengan panjang / celana panjang — gelap atau ketat",
          "C. Lengan panjang / celana panjang — longgar dan terang",
          "D. Pakaian longgar ringan — warna terang",
          "E. Lengan pendek / celana pendek — paparan kulit maksimal"
        ],
        info: "Pakaian adalah penghalang utama paparan UV. Pakaian penutup penuh berwarna gelap dapat menghalangi hampir semua sinar UVB. Pakaian longgar terang memungkinkan sebagian UV melewatinya."
      },

      // ── Jam istirahat makan siang ─────────────────
      {
        text: "Berapa lama jam istirahat makan siang Anda?",
        type: "choice",
        key: "lunchDuration",
        options: [
          "A. Kurang dari 30 menit",
          "B. 30–60 menit",
          "C. Lebih dari 60 menit",
          "D. Saya tidak memiliki jam istirahat makan siang yang tetap"
        ],
        info: "Istirahat makan siang 30 menit atau lebih di luar ruangan pada siang hari adalah salah satu kesempatan terbaik bagi pekerja untuk mendapatkan paparan matahari dan memproduksi vitamin D."
      },
      {
        text: "Pukul berapa biasanya Anda mulai istirahat makan siang?",
        type: "choice",
        key: "lunchTime",
        options: [
          "A. Sebelum pukul 11.00",
          "B. 11.00 – 13.00",
          "C. Setelah pukul 13.00",
          "D. Tidak ada waktu yang tetap"
        ],
        info: "Istirahat makan siang antara pukul 11.00 dan 13.00 bertepatan dengan jam UV puncak, menjadikannya waktu paling efektif untuk sintesis vitamin D dari sinar matahari."
      },
      {
        text: "Di mana Anda biasanya makan siang saat jam istirahat kerja?",
        type: "choice",
        key: "lunchLocation",
        options: [
          "A. Sepenuhnya di dalam ruangan — kantin atau ruangan tertutup tanpa jendela",
          "B. Di dalam ruangan dengan jendela terbuka",
          "C. Area luar yang tertutup atap (cth. di bawah atap atau tempat teduh)",
          "D. Di luar ruangan di bawah sinar matahari langsung"
        ],
        info: "Makan siang di luar ruangan di bawah sinar matahari langsung adalah cara sederhana untuk mendapatkan paparan UV siang hari. Kaca menghalangi sebagian besar UVB sehingga makan di dalam ruangan dekat jendela memberikan manfaat minimal."
      },

      // ── Suplemen ──────────────────────────────────
      {
        text: "Apakah Anda saat ini mengonsumsi suplemen vitamin D atau multivitamin yang mengandung vitamin D?",
        type: "choice",
        key: "supplements",
        options: [
          "A. Ya — suplemen vitamin D khusus",
          "B. Ya — sebagai bagian dari multivitamin",
          "C. Tidak",
          "D. Dulu pernah, tapi sudah berhenti"
        ],
        info: "Suplemen adalah salah satu cara paling andal untuk menjaga kadar vitamin D yang sehat, terutama bagi mereka yang memiliki paparan sinar matahari terbatas."
      }
    ]
  },
  {
    id: "symptoms",
    title: "🩺 Bab 3: Pola Makan & Tanda Kesehatan",
    subtitle: "Apa yang Anda makan dan bagaimana perasaan Anda dapat mengungkap petunjuk penting tentang status vitamin D Anda.",
    questions: [

      // ── Pola makan — dari kolom spreadsheet 45–49 ─
      {
        text: "Dalam seminggu terakhir, seberapa sering Anda mengonsumsi produk susu? (susu, yoghurt, keju)",
        type: "choice",
        key: "dairyFreq",
        options: [
          "A. Tidak pernah",
          "B. Sekali seminggu",
          "C. 2–3 kali seminggu",
          "D. 4–5 kali seminggu",
          "E. Lebih dari 5 kali seminggu (setiap hari)"
        ],
        info: "Susu dan produk susu yang difortifikasi merupakan sumber vitamin D penting dalam makanan. Banyak negara memfortifikasi susu dengan 100–120 IU per gelas."
      },
      {
        text: "Dalam seminggu terakhir, seberapa sering Anda mengonsumsi makanan laut? (ikan segar atau kaleng, kerang, udang, kepiting)",
        type: "choice",
        key: "seafoodFreq",
        options: [
          "A. Tidak pernah",
          "B. Sekali seminggu",
          "C. 2–3 kali seminggu",
          "D. 4–5 kali seminggu",
          "E. Lebih dari 5 kali seminggu"
        ],
        info: "Ikan berlemak seperti salmon, sarden, makarel, dan tuna adalah salah satu sumber vitamin D alami terkaya — salmon mengandung hingga 447 IU per 85g."
      },
      {
        text: "Dalam seminggu terakhir, seberapa sering Anda mengonsumsi telur?",
        type: "choice",
        key: "eggFreq",
        options: [
          "A. Tidak pernah",
          "B. Sekali seminggu",
          "C. 2–3 kali seminggu",
          "D. 4–5 kali seminggu",
          "E. Lebih dari 5 kali seminggu"
        ],
        info: "Kuning telur mengandung sekitar 40 IU vitamin D. Bukan sumber utama sendiri, tetapi berkontribusi sebagai bagian dari pola makan seimbang."
      },

      // ── Riwayat medis ─────────────────────────────
      {
        text: "Apakah Anda memiliki salah satu kondisi berikut?",
        type: "choice",
        key: "medicalCondition",
        options: [
          "A. Diabetes melitus",
          "B. Hipertensi (tekanan darah tinggi)",
          "C. Penyakit jantung",
          "D. Penyakit ginjal atau hati",
          "E. Tidak ada di atas"
        ],
        info: "Beberapa kondisi kronis dikaitkan dengan kadar vitamin D yang lebih rendah. Penyakit ginjal dan hati secara langsung mengganggu aktivasi vitamin D. Diabetes dan hipertensi dikaitkan dengan defisiensi sebagai faktor risiko."
      },
      {
        text: "Apakah Anda saat ini sedang hamil?",
        type: "choice",
        key: "pregnant",
        options: [
          "A. Ya",
          "B. Tidak",
          "C. Tidak berlaku"
        ],
        info: "Wanita hamil memiliki kebutuhan vitamin D yang lebih tinggi (minimal 600–800 IU/hari). Kekurangan selama kehamilan dikaitkan dengan berat lahir rendah dan komplikasi."
      },
      {
        text: "Apakah Anda saat ini sedang menyusui?",
        type: "choice",
        key: "breastfeeding",
        options: [
          "A. Ya",
          "B. Tidak",
          "C. Tidak berlaku"
        ],
        info: "Ibu menyusui membutuhkan vitamin D yang cukup untuk diri mereka sendiri dan karena ASI saja mungkin tidak memberikan cukup vitamin D untuk bayi."
      },
    ]
  }
];