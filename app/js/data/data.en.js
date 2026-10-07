// ─────────────────────────────────────────────
//  data.en.js — English chapter & question definitions
// ─────────────────────────────────────────────

var chaptersEN = [
  
  {
    id: "profile",
    title: "👤 Chapter 1: Personal Profile",
    subtitle: "Help us understand your background so we can better assess your risk.",
    questions: [
      {
        text: "What is your name?",
        type: "text",
        key: "Name",
        placeholder: "e.g. Budi",
        info: "For data collection"
      },
      {
        text: "How old are you?",
        type: "number",
        key: "age",
        placeholder: "e.g. 29",
        unit: "years",
        min: 1,
        max: 120,
        info: "Older adults produce less vitamin D from sunlight and absorb it less efficiently from food."
      },
      {
        text: "What is your biological sex?",
        type: "choice",
        key: "sex",
        options: ["A. Male", "B. Female"],
        info: "Hormonal differences can affect vitamin D metabolism. Pregnant or breastfeeding women are at higher risk."
      },
      {
        text: "Which Fitzpatrick skin type best matches yours?",
        type: "skintone",
        key: "skinTone",
        options: [
          { value: "A. Type I – Very Fair",  color: "#FDDBB4", label: "Type I",   desc: "Very fair, always burns, never tans" },
          { value: "B. Type II – Fair",       color: "#F5C89A", label: "Type II",  desc: "Fair, usually burns, sometimes tans" },
          { value: "C. Type III – Medium",    color: "#E8A87C", label: "Type III", desc: "Medium, sometimes burns, always tans" },
          { value: "D. Type IV – Olive",      color: "#C68642", label: "Type IV",  desc: "Olive, rarely burns, easily tans" },
          { value: "E. Type V – Brown",       color: "#8D5524", label: "Type V",   desc: "Brown, very rarely burns, always tans" },
          { value: "F. Type VI – Dark",       color: "#4A2912", label: "Type VI",  desc: "Dark brown/black, never burns" }
        ],
        info: "The Fitzpatrick scale classifies skin by how it reacts to UV. Darker skin (Types V–VI) has more melanin, which blocks UV and reduces vitamin D synthesis — more sun exposure is needed to produce the same amount."
      },
      {
        text: "What best describes your typical work or daily environment during daytime hours?",
        type: "choice",
        key: "workType",
        options: [
          "A. Mostly outdoors (e.g., construction, farming, field work)",
          "B. Mix of indoor and outdoor",
          "C. Mostly indoors (e.g., office, remote work, study)"
        ],
        info: "People who work indoors get far less natural sunlight than those who work outdoors, significantly reducing vitamin D synthesis. (Night shift work is asked about separately.)"
      },
      {
        text: "What is your height?",
        type: "number",
        key: "heightCm",
        placeholder: "e.g. 165",
        unit: "cm",
        min: 50,
        max: 250,
        info: "Used together with your weight to calculate your Body Mass Index (BMI) — vitamin D is fat-soluble, so body composition affects blood levels."
      },
      {
        text: "What is your weight?",
        type: "number",
        key: "weightKg",
        placeholder: "e.g. 60",
        unit: "kg",
        min: 20,
        max: 300,
        info: "Vitamin D is fat-soluble and can get trapped in body fat. People with higher body weight often need more vitamin D to maintain healthy blood levels."
      },
      {
        text: "Where do you work?",
        type: "text",
        key: "location",
        placeholder: "e.g. Jakarta",
        info: "This data is taken purely for the UV data index."
      }
    ]
  },
  {
    id: "lifestyle",
    title: "☀️ Chapter 2: Sun Exposure & Lifestyle",
    subtitle: "Your daily sun habits and lifestyle choices directly affect your vitamin D levels.",
    questions: [

      // ── Work & shift ─────────────────────────────
      {
        text: "Does your job involve night shift hours?",
        type: "choice",
        key: "nightShift",
        options: [
          "A. Yes, fixed night shift",
          "B. Yes, rotating shifts (sometimes day, sometimes night)",
          "C. No, standard daytime hours",
          "D. I don't work / retired / student"
        ],
        info: "Night shift workers often have severely reduced vitamin D levels because they sleep during peak UV hours and work when the sun is down."
      },
      {
        text: "How long do you work per day?",
        type: "choice",
        key: "worktime",
        options: [
          "A. Less than 3 hours",
          "B. 3–6 hours",
          "C. 7–10 hours",
          "D. 11 hours or more"
        ],
        info: "Longer work hours — especially indoors — can significantly reduce the time available for sun exposure."
      },

      // ── Indoor sun exposure ───────────────────────
      {
        text: "When working indoors, how often are you exposed to sunlight (e.g. near a window, terrace, balcony, or yard)?",
        type: "choice",
        key: "indoorSunFreq",
        options: [
          "A. Never",
          "B. 1 time a week",
          "C. 2–3 times a week",
          "D. 4–5 times a week",
          "E. More than 5 times a week"
        ],
        info: "Even brief incidental sun exposure near windows or on breaks can contribute to vitamin D synthesis, though glass blocks most UVB rays."
      },

      // ── Outdoor sun exposure ──────────────────────
      {
        text: "How much time do you spend outdoors in direct sunlight on a typical day?",
        type: "choice",
        key: "sunTime",
        options: [
          "A. Never or less than 5 minutes",
          "B. 5–15 minutes",
          "C. 15–30 minutes",
          "D. 30–60 minutes",
          "E. More than 1 hour"
        ],
        info: "Just 15–30 minutes of midday sun on your arms and face several times a week can significantly boost vitamin D levels."
      },
      {
        text: "When working outdoors, at what time of day are you usually exposed to sunlight?",
        type: "choice",
        key: "outdoorSunTime",
        options: [
          "A. Never or before 7am",
          "B. 7am – 9am",
          "C. 9am – 11am",
          "D. 11am – 1pm",
          "E. 1pm – 5pm"
        ],
        info: "The optimal window for vitamin D synthesis from sunlight is between 10am and 2pm when UVB rays are most intense."
      },
      {
        text: "When outdoors for work, which body parts are typically exposed to sunlight?",
        type: "choice",
        key: "outdoorSunBodyPart",
        options: [
          "A. None / not exposed",
          "B. Face only",
          "C. Face and hands",
          "D. Face and arms",
          "E. Face, arms, and legs"
        ],
        info: "Larger exposed skin area means more vitamin D production. Wearing long sleeves and gloves outdoors can drastically reduce synthesis even in strong sunlight."
      },

      // ── Recreational outdoor activity ─────────────
      {
        text: "How often do you do outdoor recreational activities? (e.g. sports, hiking, walking, camping, swimming)",
        type: "choice",
        key: "recFreq",
        options: [
          "A. Never or less than once a week",
          "B. Once a week",
          "C. 2–3 times a week",
          "D. 4–5 times a week",
          "E. More than 5 times a week"
        ],
        info: "Recreational outdoor activity adds meaningful sun exposure beyond work hours and is one of the best natural ways to boost vitamin D."
      },

      // ── Shade & protection ────────────────────────
      {
        text: "When outdoors, how often do you stay in the shade? (e.g. under trees, buildings, or umbrellas)",
        type: "choice",
        key: "shadeUse",
        options: [
          "A. Always in the shade",
          "B. Often in the shade",
          "C. Sometimes in the shade",
          "D. Rarely in the shade",
          "E. Never — I stay in direct sunlight"
        ],
        info: "Shade significantly reduces UV exposure. While it protects against sunburn, it also reduces vitamin D synthesis substantially."
      },
      {
        text: "Do you usually wear sunscreen when going outdoors?",
        type: "choice",
        key: "sunscreen",
        options: [
          "A. Always — SPF 50+ on all exposed skin",
          "B. Always — SPF 30–50",
          "C. Sometimes — SPF 15–30",
          "D. Rarely",
          "E. Never"
        ],
        info: "SPF 50+ sunscreen can block up to 98% of UVB rays needed for vitamin D synthesis. While essential for skin protection, it significantly limits vitamin D production."
      },
      {
        text: "What type of clothing do you typically wear outdoors?",
        type: "choice",
        key: "clothing",
        options: [
          "A. Fully covered — dark coloured (e.g. abaya, full uniform)",
          "B. Long sleeves / long trousers — dark or tight fitting",
          "C. Long sleeves / long trousers — loose and light coloured",
          "D. Light loose clothing — light colours",
          "E. Short sleeves / shorts — maximum skin exposure"
        ],
        info: "Clothing is a major barrier to UV exposure. Full-coverage dark clothing can block nearly all UVB rays. Light loose clothing allows some UV through while offering comfort."
      },

      // ── Lunch break ───────────────────────────────
      {
        text: "How long is your lunch break?",
        type: "choice",
        key: "lunchDuration",
        options: [
          "A. Less than 30 minutes",
          "B. 30–60 minutes",
          "C. More than 60 minutes",
          "D. I don't have a regular lunch break"
        ],
        info: "A lunch break of 30+ minutes outdoors during midday is one of the best opportunities for workers to get sun exposure and produce vitamin D."
      },
      {
        text: "What time do you usually start your lunch break?",
        type: "choice",
        key: "lunchTime",
        options: [
          "A. Before 11am",
          "B. 11am – 1pm",
          "C. After 1pm",
          "D. No fixed time"
        ],
        info: "A lunch break between 11am and 1pm coincides with peak UV hours, making it the most effective time for vitamin D synthesis from sunlight."
      },
      {
        text: "Where do you usually have lunch during your work break?",
        type: "choice",
        key: "lunchLocation",
        options: [
          "A. Fully indoors — closed canteen or room with no windows",
          "B. Indoors with open windows",
          "C. Covered outdoor area (e.g. under a roof or shade)",
          "D. Outdoors in direct sunlight"
        ],
        info: "Eating lunch outdoors in direct sunlight is a simple way to get midday UV exposure. Glass windows block most UVB, so indoor dining near windows offers minimal benefit."
      },

      // ── Supplements ───────────────────────────────
      {
        text: "Do you currently take vitamin D supplements or a multivitamin containing vitamin D?",
        type: "choice",
        key: "supplements",
        options: [
          "A. Yes — vitamin D supplement specifically",
          "B. Yes — as part of a multivitamin",
          "C. No",
          "D. I used to, but stopped"
        ],
        info: "Supplements are one of the most reliable ways to maintain healthy vitamin D levels, especially for those with limited sun exposure."
      }
    ]
  },
  {
    id: "symptoms",
    title: "🩺 Chapter 3: Diet & Health Signs",
    subtitle: "What you eat and how you feel can reveal important clues about your vitamin D status.",
    questions: [

      // ── Diet — from spreadsheet cols 45–49 ────────
      {
        text: "In the past week, how often did you consume dairy products? (milk, yoghurt, cheese)",
        type: "choice",
        key: "dairyFreq",
        options: [
          "A. Never",
          "B. Once a week",
          "C. 2–3 times a week",
          "D. 4–5 times a week",
          "E. More than 5 times a week (daily)"
        ],
        info: "Fortified milk and dairy products are important dietary sources of vitamin D. Many countries fortify milk with 100–120 IU per cup."
      },
      {
        text: "In the past week, how often did you consume seafood? (fresh or canned fish, shellfish, shrimp, crab)",
        type: "choice",
        key: "seafoodFreq",
        options: [
          "A. Never",
          "B. Once a week",
          "C. 2–3 times a week",
          "D. 4–5 times a week",
          "E. More than 5 times a week"
        ],
        info: "Fatty fish like salmon, sardines, mackerel, and tuna are among the richest natural sources of vitamin D — salmon contains up to 447 IU per 85g serving."
      },
      {
        text: "In the past week, how often did you consume eggs?",
        type: "choice",
        key: "eggFreq",
        options: [
          "A. Never",
          "B. Once a week",
          "C. 2–3 times a week",
          "D. 4–5 times a week",
          "E. More than 5 times a week"
        ],
        info: "Egg yolks contain about 40 IU of vitamin D each. They're not a major source alone but contribute as part of a balanced diet."
      },

      // ── Medical history ───────────────────────────
      {
        text: "Do you have any of the following conditions?",
        type: "choice",
        key: "medicalCondition",
        options: [
          "A. Diabetes mellitus",
          "B. Hypertension (high blood pressure)",
          "C. Heart disease",
          "D. Kidney or liver disease",
          "E. None of the above"
        ],
        info: "Several chronic conditions are linked to lower vitamin D levels. Kidney and liver disease directly impair vitamin D activation. Diabetes and hypertension are associated with deficiency as a risk factor."
      },
      {
        text: "Are you currently pregnant?",
        type: "choice",
        key: "pregnant",
        options: [
          "A. Yes",
          "B. No",
          "C. Not applicable"
        ],
        info: "Pregnant women have increased vitamin D requirements (600–800 IU/day minimum). Deficiency during pregnancy is linked to low birth weight and complications."
      },
      {
        text: "Are you currently breastfeeding?",
        type: "choice",
        key: "breastfeeding",
        options: [
          "A. Yes",
          "B. No",
          "C. Not applicable"
        ],
        info: "Breastfeeding mothers need adequate vitamin D both for themselves and because breast milk alone may not provide enough for the infant."
      },
    ]
  }
];
var lastResult = null; // stores the last computed result so the
                        // recommendations screen can reuse it