"""Lessons 2–11 for a2-m02-food-shopping (imported by gen_m02_food_shopping_module.py)."""
from __future__ import annotations

MID = "a2-m02-food-shopping"

LM = {
    "stage6": True,
    "schemaPlayer": True,
    "lessonDepth": {"m02": "v2", "targetMicroInteractions": "28-38"},
}


def mcq(i: str, q: str, opts: list[str], ans: str, diff: str = "A2_low") -> dict:
    return {
        "id": i,
        "question": q,
        "difficulty": diff,
        "metadata": {},
        "type": "multiple_choice",
        "options": opts,
        "correctAnswer": ans,
    }


def fb(i: str, q: str, opts: list[str], ans: str, diff: str = "A2_low") -> dict:
    return {
        "id": i,
        "question": q,
        "difficulty": diff,
        "metadata": {},
        "type": "fill_blank",
        "options": opts,
        "correctAnswer": ans,
    }


def ro(i: str, q: str, opts: list[str], ans: str) -> dict:
    return {
        "id": i,
        "question": q,
        "difficulty": "A2_low",
        "metadata": {},
        "type": "reorder",
        "options": opts,
        "correctAnswer": ans,
    }


def lesson_l02() -> dict:
    gid = "a2-m02-l02-listen-read-prices-products"
    return {
        "id": gid,
        "moduleId": MID,
        "title": "Listening & reading · Prices, products, and questions",
        "lessonType": "input",
        "order": 1,
        "cefrLevel": "A2",
        "durationEstimate": 14,
        "grammarTargets": ["a2.1-questions-basics", "a2.1-present-tense"],
        "vocabTargets": ["lemma-prijs", "lemma-euro", "lemma-kilo", "lemma-kaas", "lemma-hoeveel"],
        "canDoStatements": [
            "I can read prices and short product lines in a shop context.",
            "I can match common questions to their meaning (price, quantity).",
        ],
        "steps": [
            {
                "id": "m02-l02-preview",
                "type": "preview",
                "prompt": "Woorden — prijs",
                "content": {
                    "previewItems": [
                        {"id": "m02-l02-p1", "word": "prijs", "lemma": "prijs", "translationEn": "price", "emoji": "💶"},
                        {"id": "m02-l02-p2", "word": "euro", "lemma": "euro", "translationEn": "euro", "emoji": "€"},
                        {"id": "m02-l02-p3", "word": "kilo", "lemma": "kilo", "translationEn": "kilo", "emoji": "⚖️"},
                        {"id": "m02-l02-p4", "word": "hoeveel", "lemma": "hoeveel", "translationEn": "how much", "emoji": "❔"},
                        {"id": "m02-l02-p5", "word": "kaas", "lemma": "kaas", "translationEn": "cheese", "emoji": "🧀"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m02-l02-listen-read",
                "type": "listen_read",
                "prompt": "Lees en luister — aan de toonbank",
                "content": {
                    "dialogue": [
                        {"speaker": "Klant", "nl": "Goedemiddag. Hoeveel kost deze kaas per kilo?", "en": "Good afternoon. How much does this cheese cost per kilo?"},
                        {"speaker": "Medewerker", "nl": "Deze week negen euro vijftig per kilo.", "en": "This week nine euros fifty per kilo."},
                        {"speaker": "Klant", "nl": "Oké. Ik wil graag driehonderd gram.", "en": "Okay. I would like three hundred grams."},
                        {"speaker": "Medewerker", "nl": "Prima. Nog iets anders?", "en": "Fine. Anything else?"},
                        {"speaker": "Klant", "nl": "Nee, dat is alles. Dank u wel.", "en": "No, that is all. Thank you."},
                    ]
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m02-l02-e1", "Waar gaat dit over?", ["Prijs en hoeveelheid bij de kaas", "Een treinreis", "Een doktersafspraak"], "Prijs en hoeveelheid bij de kaas"),
                    mcq("m02-l02-e2", "Hoeveel kost de kaas per kilo deze week?", ["Negen euro vijftig", "Vijftien euro", "Twee euro"], "Negen euro vijftig"),
                    mcq("m02-l02-e3", "Hoeveel wil de klant?", ["Driehonderd gram", "Een kilo", "Geen kaas"], "Driehonderd gram"),
                    mcq("m02-l02-e4", "Hoe sluit de klant af?", ["Dat is alles — dank u wel", "Tot morgen op school", "Ik ga slapen"], "Dat is alles — dank u wel"),
                    mcq(
                        "m02-l02-e5",
                        "Welk product bespreken ze bij *per kilo*?",
                        ["Kaas", "Koffie", "Brood"],
                        "Kaas",
                    ),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l02-discovery",
                "type": "discovery",
                "prompt": "Tik — vaste brokken",
                "content": {
                    "phrases": [
                        {"nl": "Hoeveel kost dit?", "en": "How much does this cost?", "focus": "Hoeveel"},
                        {"nl": "Ik wil graag …", "en": "I would like …", "focus": "wil"},
                        {"nl": "Nog iets anders?", "en": "Anything else?", "focus": "Nog"},
                    ]
                },
                "metadata": {},
            },
            {
                "id": "m02-l02-pl1",
                "type": "practice_loop",
                "prompt": "Detail — 6×",
                "content": {"lemmas": ["prijs", "euro", "kilo"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["vocab"]},
                "exercises": [
                    mcq("m02-l02-p1", "Welke vraag hoort bij geld?", ["Hoeveel kost dit?", "Waar woon je?", "Hoe laat is het?"], "Hoeveel kost dit?"),
                    fb("m02-l02-p2", "Vul in: Ik wil graag een ___ appels.", ["kilo", "huis", "boek"], "kilo"),
                    ro("m02-l02-p3", "Zet in de juiste volgorde.", ["kost", "Hoeveel", "dit", "?"], "Hoeveel kost dit?"),
                    mcq("m02-l02-p4", "Wat betekent *per kilo*?", ["Voor elke kilo", "Zonder gewicht", "Alleen vandaag"], "Voor elke kilo"),
                    mcq("m02-l02-p5", "Natuurlijke reactie op “Nog iets anders?” als je klaar bent", ["Nee, dat is alles.", "Ja, ik ben de trein.", "Goedemorgen."], "Nee, dat is alles."),
                    mcq("m02-l02-p6", "Welk woord is een munteenheid?", ["euro", "melk", "brood"], "euro"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l02-fill",
                "type": "fill_blank",
                "prompt": "Mini-zin",
                "content": {
                    "followUpReorder": {"tokens": ["graag", "Ik", "wil", "melk", "."], "correctAnswer": "Ik wil graag melk."},
                },
                "feedbackConfig": {"errorTags": ["word-order"]},
                "exercises": [
                    fb("m02-l02-f1", "Ik wil ___ een halve kilo kaas. (beleefd: graag)", ["graag", "morgen", "trein"], "graag"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l02-pl2",
                "type": "practice_loop",
                "prompt": "Nog een ronde — 6×",
                "content": {"lemmas": ["hoeveel", "wil", "alles"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["grammar"]},
                "exercises": [
                    mcq("m02-l02-q1", "Welke zin vraagt naar prijs?", ["Hoeveel kost deze kaas?", "Ik ben moe.", "Waar is je huis?"], "Hoeveel kost deze kaas?"),
                    fb("m02-l02-q2", "___ kost dit? (vraagwoord)", ["Hoeveel", "Wie", "Waarom"], "Hoeveel"),
                    ro("m02-l02-q3", "Zet in de juiste volgorde.", ["is", "dat", "Nee", "alles", ","], "Nee, dat is alles,"),
                    mcq(
                        "m02-l02-q4",
                        "Wat betekent *Ik wil graag …* ongeveer?",
                        ["Ik zou graag willen / ik wil (beleefd)", "Ik wil nooit iets", "Ik ben moe"],
                        "Ik zou graag willen / ik wil (beleefd)",
                    ),
                    mcq("m02-l02-q5", "Welk antwoord past bij de prijs?", ["Dat is goedkoop.", "Ik ben een tafel.", "Het regent altijd."], "Dat is goedkoop."),
                    fb("m02-l02-q6", "De ___ is negen euro. (bedrag)", ["prijs", "melk", "ochtend"], "prijs"),
                ],
                "metadata": {"depthLayer": "m02-v2"},
            },
            {
                "id": "m02-l02-sp1",
                "type": "speaking",
                "prompt": "Zeg de prijsvraag",
                "content": {"targetNl": "Hoeveel kost deze kaas?", "acceptable": ["Hoeveel kost deze kaas", "hoeveel kost deze kaas"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Hoeveel kost deze kaas"},
                "metadata": {},
            },
            {
                "id": "m02-l02-sp2",
                "type": "speaking",
                "prompt": "Variatie — wil graag",
                "content": {"targetNl": "Ik wil graag een kilo appels.", "acceptable": ["Ik wil graag een kilo appels"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Ik wil graag een kilo appels"},
                "metadata": {},
            },
            {
                "id": "m02-l02-sp3",
                "type": "speaking",
                "prompt": "Afronden",
                "content": {"targetNl": "Nee, dat is alles. Dank u wel.", "acceptable": ["Nee dat is alles", "nee dat is alles dank u wel"], "maxRecordingSeconds": 30},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Nee dat is alles"},
                "metadata": {},
            },
            {
                "id": "m02-l02-recap",
                "type": "recap",
                "prompt": "Check",
                "content": {
                    "lemmas": ["prijs", "euro", "hoeveel"],
                    "tasks": [
                        {
                            "kind": "listen_mcq",
                            "question": "Je hoort:",
                            "snippetNl": "Hoeveel kost deze kaas per kilo?",
                            "options": ["Een prijsvraag.", "Een adres.", "Een weerbericht."],
                            "correctAnswer": "Een prijsvraag.",
                        },
                        {"kind": "fill_blank", "sentence": "Ik wil ___ een broodje. (beleefd)", "options": ["graag", "nooit", "gisteren"], "correctAnswer": "graag"},
                        {"kind": "reorder", "tokens": ["kost", "Hoeveel", "dit", "?"], "correctAnswer": "Hoeveel kost dit?"},
                        {"kind": "speak", "prompt": "Zeg: *Nee, dat is alles.*", "targetNl": "Nee, dat is alles.", "mockPass": True},
                        {
                            "kind": "listen_mcq",
                            "question": "Medewerker vraagt:",
                            "snippetNl": "Nog iets anders?",
                            "options": ["Of je meer wilt.", "Of je ziek bent.", "Of je werkt."],
                            "correctAnswer": "Of je meer wilt.",
                        },
                        {"kind": "fill_blank", "sentence": "De kaas kost negen euro ___. (centen)", "options": ["vijftig", "honderd kilo", "trein"], "correctAnswer": "vijftig"},
                        {
                            "kind": "listen_mcq",
                            "question": "Toon aan de toonbank:",
                            "snippetNl": "Nog iets anders?",
                            "options": ["Vraag of je meer wilt.", "Vraag om je adres.", "Vraag om het weer."],
                            "correctAnswer": "Vraag of je meer wilt.",
                        },
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["vocab", "register"],
        "metadata": {**LM, "archetype": "input_b"},
    }


def lesson_l03() -> dict:
    gid = "a2-m02-l03-grammar-modals-polite-requests"
    return {
        "id": gid,
        "moduleId": MID,
        "title": "Grammar & patterns · Mag / kan / wil · polite requests",
        "lessonType": "pattern",
        "order": 2,
        "cefrLevel": "A2",
        "durationEstimate": 14,
        "grammarTargets": ["a2.1-modals-requests"],
        "vocabTargets": ["lemma-mag", "lemma-kan", "lemma-wil", "lemma-alstublieft", "lemma-graag"],
        "canDoStatements": [
            "I can choose mag / kan / wil in short shop lines.",
            "I can form a polite request with u where appropriate.",
        ],
        "steps": [
            {
                "id": "m02-l03-preview",
                "type": "preview",
                "prompt": "Drie modale woorden",
                "content": {
                    "previewItems": [
                        {"id": "m02-l03-p1", "word": "mag", "lemma": "mogen", "translationEn": "may", "emoji": "🙋"},
                        {"id": "m02-l03-p2", "word": "kan", "lemma": "kunnen", "translationEn": "can", "emoji": "✅"},
                        {"id": "m02-l03-p3", "word": "wil", "lemma": "willen", "translationEn": "want", "emoji": "🛒"},
                        {"id": "m02-l03-p4", "word": "alstublieft", "lemma": "alstublieft", "translationEn": "please", "emoji": "🤲"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m02-l03-discovery",
                "type": "discovery",
                "prompt": "Tik — merk het verschil",
                "content": {
                    "phrases": [
                        {"nl": "Mag ik een bon?", "en": "May I have a receipt?", "focus": "Mag"},
                        {"nl": "Kan ik pinnen?", "en": "Can I pay by card?", "focus": "Kan"},
                        {"nl": "Ik wil graag melk.", "en": "I would like milk.", "focus": "wil"},
                    ]
                },
                "metadata": {},
            },
            {
                "id": "m02-l03-listen",
                "type": "listening",
                "prompt": "Luister — korte lijnen",
                "content": {
                    "dialogue": [
                        {"speaker": "Klant", "nl": "Mag ik een tasje?", "en": "May I have a bag?"},
                        {"speaker": "Medewerker", "nl": "Natuurlijk. Wilt u een grote of een kleine?", "en": "Of course. Would you like a large or a small one?"},
                        {"speaker": "Klant", "nl": "Klein is goed. Kan ik ook pinnen?", "en": "Small is fine. Can I also pay by card?"},
                        {"speaker": "Medewerker", "nl": "Ja, bij de kassa.", "en": "Yes, at the checkout."},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m02-l03-l1", "Wat vraagt de klant eerst?", ["Mag ik een tasje?", "Waar is de melk?", "Tot ziens."], "Mag ik een tasje?"),
                    mcq("m02-l03-l2", "Wat wil de klant weten over betalen?", ["Kan ik pinnen?", "Hoeveel kost het?", "Is het vers?"], "Kan ik pinnen?"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l03-grammar",
                "type": "grammar_card",
                "prompt": "Mini-regel",
                "content": {
                    "title": "Mag / Kan / Wil",
                    "summary": "**Mag** = toestemming. **Kan** = mogelijkheid. **Wil** (+ *graag*) = beleefd bestellen.",
                    "examples": [
                        {"nl": "Mag ik de bon?", "en": "May I have the receipt?"},
                        {"nl": "Kan ik hier pinnen?", "en": "Can I pay by card here?"},
                        {"nl": "Ik wil graag twee broodjes.", "en": "I would like two rolls."},
                    ],
                },
                "feedbackConfig": {"hint": "Kies eerst: toestemming, kan het, of ik wil iets."},
                "metadata": {},
            },
            {
                "id": "m02-l03-pl1",
                "type": "practice_loop",
                "prompt": "Kies het juiste modale woord — 8×",
                "content": {"lemmas": ["mag", "kan", "wil"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["grammar"]},
                "exercises": [
                    mcq("m02-l03-a1", "___ ik een bon? (toestemming)", ["Mag", "Kan", "Wil"], "Mag"),
                    mcq("m02-l03-a2", "___ ik pinnen? (mogelijkheid)", ["Kan", "Mag", "Wil"], "Kan"),
                    mcq("m02-l03-a3", "Ik ___ graag koffie. (bestellen)", ["wil", "mag", "kan"], "wil"),
                    mcq("m02-l03-a4", "Welke zin is het meest beleefd om iets te bestellen?", ["Ik wil graag brood.", "Ik ben brood.", "Brood ik."], "Ik wil graag brood."),
                    mcq("m02-l03-a5", "___ ik uw bonuskaart scannen? (toestemming aan de kassa)", ["Mag", "Wil", "Eet"], "Mag"),
                    fb("m02-l03-a6", "___ ik contant betalen? (kan het)", ["Kan", "Mag", "Ben"], "Kan"),
                    mcq("m02-l03-a7", "Contrast: *Ik wil …* klinkt vooral als …", ["bestellen / kiezen", "naar de wc vragen", "afscheid"], "bestellen / kiezen"),
                    mcq("m02-l03-a8", "Welke zin vraagt om een bon?", ["Mag ik de bon?", "Ik ben de bon.", "De bon is moe."], "Mag ik de bon?"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l03-mcq",
                "type": "mcq",
                "prompt": "Contrast",
                "feedbackConfig": {"errorTags": ["register"]},
                "exercises": [
                    mcq(
                        "m02-l03-m1",
                        "Je wilt iets bestellen bij de toonbank. Wat zeg je het eerst?",
                        ["Ik wil graag …", "Ik kan moe.", "Mag ik slapen?"],
                        "Ik wil graag …",
                        "A2_mid",
                    )
                ],
                "metadata": {},
            },
            {
                "id": "m02-l03-pl2",
                "type": "practice_loop",
                "prompt": "Fix & transform — 6×",
                "content": {"lemmas": ["mag", "kan", "graag"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["grammar"]},
                "exercises": [
                    mcq("m02-l03-b1", "Betere zin?", ["Mag ik een tasje?", "Tasje mag een ik?", "Ik tasje mag."], "Mag ik een tasje?"),
                    ro("m02-l03-b2", "Zet in de juiste volgorde.", ["pinnen", "Kan", "ik", "?"], "Kan ik pinnen?"),
                    mcq("m02-l03-b3", "Welke zin hoort bij *toestemming*?", ["Mag ik dit proeven?", "Ik kan honger.", "Wil je slapen?"], "Mag ik dit proeven?"),
                    fb("m02-l03-b4", "Ik ___ graag een koffie. (willen: ik-vorm)", ["wil", "kan", "mag"], "wil"),
                    mcq("m02-l03-b5", "Kies beleefd: aan een medewerker", ["Wilt u mijn bonuskaart?", "Jij kaart nu!", "Kaart weg."], "Wilt u mijn bonuskaart?"),
                    mcq("m02-l03-b6", "___ ik hier ook contant betalen?", ["Kan", "Wil", "Eet"], "Kan"),
                ],
                "metadata": {"depthLayer": "m02-v2"},
            },
            {
                "id": "m02-l03-sp1",
                "type": "speaking",
                "prompt": "Vraag om een bon",
                "content": {"targetNl": "Mag ik de bon, alstublieft?", "acceptable": ["Mag ik de bon alstublieft", "mag ik de bon"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Mag ik de bon alstublieft"},
                "metadata": {},
            },
            {
                "id": "m02-l03-sp2",
                "type": "speaking",
                "prompt": "Vraag of pinnen kan",
                "content": {"targetNl": "Kan ik pinnen?", "acceptable": ["Kan ik pinnen", "kan ik pinnen"], "maxRecordingSeconds": 24},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Kan ik pinnen"},
                "metadata": {},
            },
            {
                "id": "m02-l03-sp3",
                "type": "speaking",
                "prompt": "Bestel beleefd",
                "content": {"targetNl": "Ik wil graag twee broodjes.", "acceptable": ["Ik wil graag twee broodjes"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Ik wil graag twee broodjes"},
                "metadata": {},
            },
            {
                "id": "m02-l03-recap",
                "type": "recap",
                "prompt": "Laatste ronde",
                "content": {
                    "lemmas": ["mag", "kan", "wil"],
                    "tasks": [
                        {"kind": "fill_blank", "sentence": "___ ik een bon?", "options": ["Mag", "Kan", "Wil"], "correctAnswer": "Mag"},
                        {"kind": "reorder", "tokens": ["ik", "Kan", "pinnen", "?"], "correctAnswer": "Kan ik pinnen?"},
                        {"kind": "speak", "prompt": "Zeg: *Ik wil graag melk.*", "targetNl": "Ik wil graag melk.", "mockPass": True},
                        {
                            "kind": "listen_mcq",
                            "question": "Welke zin hoort bij betalen met pin?",
                            "snippetNl": "Kan ik pinnen?",
                            "options": ["Een pinvraag.", "Een weerbericht.", "Een adres."],
                            "correctAnswer": "Een pinvraag.",
                        },
                        {"kind": "fill_blank", "sentence": "Ik wil ___ een appel. (beleefd)", "options": ["graag", "nooit", "gisteren"], "correctAnswer": "graag"},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["grammar", "register"],
        "metadata": {**LM, "archetype": "pattern_modals"},
    }


def lesson_l04() -> dict:
    gid = "a2-m02-l04-practice-quantities-numbers"
    return {
        "id": gid,
        "moduleId": MID,
        "title": "Controlled practice · Quantities · numbers · shopping chunks",
        "lessonType": "practice",
        "order": 3,
        "cefrLevel": "A2",
        "durationEstimate": 14,
        "grammarTargets": ["a2.1-quantities-measures", "a2.1-present-tense"],
        "vocabTargets": ["lemma-kilo", "lemma-broodje", "lemma-appels", "lemma-melk", "lemma-tasje"],
        "canDoStatements": [
            "I can use een kilo / twee broodjes / een pak in short lines.",
            "I can fix wrong word order in quantity phrases.",
        ],
        "steps": [
            {
                "id": "m02-l04-preview",
                "type": "preview",
                "prompt": "Hoeveelheden",
                "content": {
                    "previewItems": [
                        {"id": "m02-l04-p1", "word": "kilo", "lemma": "kilo", "translationEn": "kilo", "emoji": "⚖️"},
                        {"id": "m02-l04-p2", "word": "broodje", "lemma": "broodje", "translationEn": "roll", "emoji": "🥪"},
                        {"id": "m02-l04-p3", "word": "appels", "lemma": "appel", "translationEn": "apples", "emoji": "🍎"},
                        {"id": "m02-l04-p4", "word": "pak", "lemma": "pak", "translationEn": "pack", "emoji": "📦"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m02-l04-discovery",
                "type": "discovery",
                "prompt": "Tik — hoeveelheid + naamwoord",
                "content": {
                    "phrases": [
                        {"nl": "Een kilo bananen.", "en": "A kilo of bananas.", "focus": "kilo"},
                        {"nl": "Twee broodjes met kaas.", "en": "Two rolls with cheese.", "focus": "Twee"},
                        {"nl": "Een pak melk.", "en": "A carton of milk.", "focus": "pak"},
                    ]
                },
                "metadata": {},
            },
            {
                "id": "m02-l04-pl1",
                "type": "practice_loop",
                "prompt": "Progressief — 8×",
                "content": {"lemmas": ["kilo", "broodje", "pak"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["grammar"]},
                "exercises": [
                    mcq("m02-l04-a1", "Welke zin klopt?", ["Een kilo appels", "Kilo een appels", "Appels kilo een"], "Een kilo appels"),
                    ro("m02-l04-a2", "Zet in de juiste volgorde.", ["broodjes", "Twee", "met", "kaas"], "Twee broodjes met kaas"),
                    mcq("m02-l04-a3", "Welk getal hoort bij *twee broodjes*?", ["2", "10", "100"], "2"),
                    fb("m02-l04-a4", "Ik wil graag een ___ melk. (verpakking)", ["pak", "kilo", "uur"], "pak"),
                    mcq("m02-l04-a5", "Welke zin is natuurlijk in de winkel?", ["Mag ik een kilo aardappelen?", "Ik ben een kilo.", "Kilo waar jij?"], "Mag ik een kilo aardappelen?"),
                    mcq("m02-l04-a6", "___ broodjes wilt u? (vraag)", ["Hoeveel", "Waar", "Wie"], "Hoeveel"),
                    ro("m02-l04-a7", "Zet in de juiste volgorde.", ["een", "kilo", "Ik", "neem", "peren"], "Ik neem een kilo peren"),
                    mcq("m02-l04-a8", "Welk woord is een maat voor gewicht?", ["kilo", "euro", "kassa"], "kilo"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l04-ro",
                "type": "reorder",
                "prompt": "Fix de volgorde",
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["word-order"]},
                "exercises": [ro("m02-l04-r1", "Zet in de juiste volgorde.", ["melk", "pak", "een", "Ik", "neem"], "Ik neem een pak melk")],
                "metadata": {},
            },
            {
                "id": "m02-l04-pl2",
                "type": "practice_loop",
                "prompt": "Nog een ronde — 6×",
                "content": {"lemmas": ["twee", "een", "kilo"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["vocab"]},
                "exercises": [
                    mcq("m02-l04-b1", "Kies de beste vraag bij de kaas", ["Hoeveel gram wilt u?", "Hoeveel is uw naam?", "Waar slaapt u?"], "Hoeveel gram wilt u?"),
                    fb("m02-l04-b2", "Twee ___ kaas, alstublieft. (broodjes/rollen)", ["broodjes", "treinen", "huizen"], "broodjes"),
                    mcq("m02-l04-b3", "Welke zin gebruikt *een* correct?", ["Een tasje, graag.", "Tasje een graag.", "Graag een ik."], "Een tasje, graag."),
                    ro("m02-l04-b4", "Zet in de juiste volgorde.", ["wil", "Ik", "graag", "twee", "appels"], "Ik wil graag twee appels"),
                    mcq("m02-l04-b5", "Synoniem van *een halve kilo* in de praktijk?", ["500 gram (ongeveer)", "10 liter", "1 euro"], "500 gram (ongeveer)"),
                    mcq(
                        "m02-l04-b6",
                        "Welke zin is fout?",
                        ["Ik wil kilo een appels", "Ik wil een kilo appels", "Ik wil graag een kilo appels"],
                        "Ik wil kilo een appels",
                        "A2_mid",
                    ),
                ],
                "metadata": {"depthLayer": "m02-v2"},
            },
            {
                "id": "m02-l04-sp1",
                "type": "speaking",
                "prompt": "Zeg de hoeveelheid",
                "content": {"targetNl": "Een kilo appels, alstublieft.", "acceptable": ["Een kilo appels alstublieft"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Een kilo appels alstublieft"},
                "metadata": {},
            },
            {
                "id": "m02-l04-sp2",
                "type": "speaking",
                "prompt": "Variatie",
                "content": {"targetNl": "Twee broodjes met kaas.", "acceptable": ["Twee broodjes met kaas"], "maxRecordingSeconds": 26},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Twee broodjes met kaas"},
                "metadata": {},
            },
            {
                "id": "m02-l04-recap",
                "type": "recap",
                "prompt": "Recap",
                "content": {
                    "lemmas": ["kilo", "broodje"],
                    "tasks": [
                        {"kind": "reorder", "tokens": ["kilo", "een", "Ik", "neem", "bananen"], "correctAnswer": "Ik neem een kilo bananen"},
                        {"kind": "fill_blank", "sentence": "___ broodjes wilt u?", "options": ["Hoeveel", "Waar", "Wie"], "correctAnswer": "Hoeveel"},
                        {"kind": "speak", "prompt": "Zeg: *Een pak melk.*", "targetNl": "Een pak melk.", "mockPass": True},
                        {"kind": "listen_mcq", "question": "Je hoort een hoeveelheid:", "snippetNl": "Twee broodjes met kaas.", "options": ["Twee items.", "Een adres.", "Een tijd."], "correctAnswer": "Twee items."},
                        {"kind": "fill_blank", "sentence": "Een ___ bananen, alstublieft. (gewicht)", "options": ["kilo", "euro", "mandje"], "correctAnswer": "kilo"},
                        {
                            "kind": "listen_mcq",
                            "question": "Natuurlijke bestelling:",
                            "snippetNl": "Mag ik een kilo aardappelen?",
                            "options": ["Een hoeveelheid + product.", "Een treinkaartje.", "Een doktersbrief."],
                            "correctAnswer": "Een hoeveelheid + product.",
                        },
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["word-order", "vocab"],
        "metadata": {**LM, "archetype": "practice_quantities"},
    }


def lesson_l05() -> dict:
    gid = "a2-m02-l05-speaking-ask-for-items"
    return {
        "id": gid,
        "moduleId": MID,
        "title": "Speaking · Ask for items · order simply",
        "lessonType": "speaking",
        "order": 4,
        "cefrLevel": "A2",
        "durationEstimate": 14,
        "grammarTargets": ["a2.1-modals-requests", "a2.1-present-tense"],
        "vocabTargets": ["lemma-wil", "lemma-graag", "lemma-brood", "lemma-melk", "lemma-kaas"],
        "canDoStatements": [
            "I can ask for at least three different products politely.",
            "I can vary wil graag with short follow-ups.",
        ],
        "steps": [
            {
                "id": "m02-l05-preview",
                "type": "preview",
                "prompt": "4 woorden",
                "content": {
                    "previewItems": [
                        {"id": "m02-l05-p1", "word": "graag", "lemma": "graag", "translationEn": "gladly", "emoji": "👍"},
                        {"id": "m02-l05-p2", "word": "brood", "lemma": "brood", "translationEn": "bread", "emoji": "🍞"},
                        {"id": "m02-l05-p3", "word": "melk", "lemma": "melk", "translationEn": "milk", "emoji": "🥛"},
                        {"id": "m02-l05-p4", "word": "kaas", "lemma": "kaas", "translationEn": "cheese", "emoji": "🧀"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m02-l05-listen",
                "type": "listening",
                "prompt": "Model — luister eerst",
                "content": {
                    "dialogue": [
                        {"speaker": "Klant", "nl": "Ik wil graag een bruin brood.", "en": "I would like a brown loaf."},
                        {"speaker": "Medewerker", "nl": "Zeker. Nog iets?", "en": "Sure. Anything else?"},
                        {"speaker": "Klant", "nl": "Ja, halfvolle melk, alsjeblieft.", "en": "Yes, semi-skimmed milk, please."},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m02-l05-l1", "Wat wil de klant eerst?", ["Een bruin brood", "Kaas", "Koffie"], "Een bruin brood"),
                    mcq("m02-l05-l2", "Wat wil de klant daarna?", ["Melk", "Brood", "Water"], "Melk"),
                    mcq("m02-l05-l3", "Welke melk vraagt de klant?", ["Halfvolle melk", "Volle yoghurt", "Plantaardige kaas"], "Halfvolle melk"),
                    mcq("m02-l05-l4", "Waar gebeurt dit waarschijnlijk?", ["Bij de bakker / broodafdeling", "Bij de kapper", "Op school"], "Bij de bakker / broodafdeling"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l05-shadow",
                "type": "speaking",
                "prompt": "Luister nog eens — zeg mee (shadow)",
                "content": {
                    "targetNl": "Ja, halfvolle melk, alsjeblieft.",
                    "acceptable": ["Ja halfvolle melk alsjeblieft", "halfvolle melk alsjeblieft"],
                    "maxRecordingSeconds": 28,
                },
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Ja halfvolle melk alsjeblieft"},
                "feedbackConfig": {"pronunciationTips": "Rustig: *half-vol-le*."},
                "metadata": {},
            },
            {
                "id": "m02-l05-pl1",
                "type": "practice_loop",
                "prompt": "Herhaal in je hoofd — 5×",
                "content": {"lemmas": ["wil", "graag"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["vocab"]},
                "exercises": [
                    mcq("m02-l05-p1", "Welke openingszin hoort bij bestellen?", ["Ik wil graag …", "Ik ben graag …", "Ik eet graag de kassa."], "Ik wil graag …"),
                    mcq("m02-l05-p2", "Kies natuurlijk Nederlands", ["Ik wil graag kaas.", "Kaas wil ik graag de supermarkt.", "Graag ik kaas wil."], "Ik wil graag kaas."),
                    ro("m02-l05-p3", "Zet in de juiste volgorde.", ["graag", "Ik", "wil", "melk"], "Ik wil graag melk"),
                    mcq("m02-l05-p4", "Na “Nog iets?” — korte bevestiging", ["Ja, nog …", "Nee, ik ben een trein.", "Goedemorgen gisteren."], "Ja, nog …"),
                    mcq("m02-l05-p5", "Welke zin klinkt beleefd?", ["Mag ik ook kaas?", "Kaas nu direct!", "Geef kaas snel!"], "Mag ik ook kaas?"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l05-sp1",
                "type": "speaking",
                "prompt": "Herhaal het model",
                "content": {"targetNl": "Ik wil graag een bruin brood.", "acceptable": ["Ik wil graag een bruin brood"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Ik wil graag een bruin brood"},
                "metadata": {},
            },
            {
                "id": "m02-l05-sp2",
                "type": "speaking",
                "prompt": "Variatie — melk",
                "content": {"targetNl": "Ik wil graag melk.", "acceptable": ["Ik wil graag melk"], "maxRecordingSeconds": 24},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Ik wil graag melk"},
                "metadata": {},
            },
            {
                "id": "m02-l05-sp3",
                "type": "speaking",
                "prompt": "Jouw beurt — kaas",
                "content": {"targetNl": "Ik wil graag jonge kaas.", "acceptable": ["Ik wil graag jonge kaas", "ik wil graag kaas"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Ik wil graag kaas"},
                "metadata": {},
            },
            {
                "id": "m02-l05-sp4",
                "type": "speaking",
                "prompt": "Vraag eerst beleefd",
                "content": {"targetNl": "Mag ik ook een bon?", "acceptable": ["Mag ik ook een bon"], "maxRecordingSeconds": 26},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Mag ik ook een bon"},
                "metadata": {},
            },
            {
                "id": "m02-l05-pl2",
                "type": "practice_loop",
                "prompt": "Mini-drill — 6×",
                "content": {"lemmas": ["wil", "mag", "graag"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["grammar"]},
                "exercises": [
                    mcq("m02-l05-q1", "Welke zin is een bestelling?", ["Ik wil graag twee appels.", "Ik ben twee appels.", "Twee appels ben ik."], "Ik wil graag twee appels."),
                    fb("m02-l05-q2", "___ ik nog water? (toestemming)", ["Mag", "Wil", "Eet"], "Mag"),
                    mcq("m02-l05-q3", "Kies de beste reactie op “Nog iets?”", ["Nee, dat is alles.", "Ja, ik ben de kassa.", "Nee, ik ben de zon."], "Nee, dat is alles."),
                    ro("m02-l05-q4", "Zet in de juiste volgorde.", ["graag", "Ik", "wil", "brood"], "Ik wil graag brood"),
                    mcq("m02-l05-q5", "Welke zin hoort bij de toonbank?", ["Ik wil graag 300 gram ham.", "Ik wil graag een dokter.", "Ik wil graag morgen."], "Ik wil graag 300 gram ham."),
                    mcq("m02-l05-q6", "Beleefd afsluiten", ["Dank u wel!", "Ik ben dank!", "Tot kaas!"], "Dank u wel!"),
                    mcq("m02-l05-q7", "Welke zin vraagt om meer?", ["Nog iets?", "Waar is je huiswerk?", "Hoe lang is je trein?"], "Nog iets?"),
                ],
                "metadata": {"depthLayer": "m02-v2"},
            },
            {
                "id": "m02-l05-recap",
                "type": "recap",
                "prompt": "Check",
                "content": {
                    "lemmas": ["wil", "graag"],
                    "tasks": [
                        {"kind": "speak", "prompt": "Zeg: *Ik wil graag brood.*", "targetNl": "Ik wil graag brood.", "mockPass": True},
                        {"kind": "reorder", "tokens": ["graag", "Ik", "wil", "melk"], "correctAnswer": "Ik wil graag melk"},
                        {
                            "kind": "listen_mcq",
                            "question": "Modelzin:",
                            "snippetNl": "Ik wil graag een bruin brood.",
                            "options": ["Een bestelling.", "Een weerbericht.", "Een adres."],
                            "correctAnswer": "Een bestelling.",
                        },
                        {"kind": "fill_blank", "sentence": "Ik wil graag ___ kaas. (jong/oud type)", "options": ["jonge", "snelle", "groene"], "correctAnswer": "jonge"},
                        {"kind": "reorder", "tokens": ["graag", "Ik", "wil", "een", "bruin", "brood"], "correctAnswer": "Ik wil graag een bruin brood"},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["pronunciation", "register"],
        "metadata": {**LM, "archetype": "speaking_studio"},
    }


def lesson_l06() -> dict:
    gid = "a2-m02-l06-listening-bakery-market-cafe"
    return {
        "id": gid,
        "moduleId": MID,
        "title": "Listening · Variation · bakery / market / café",
        "lessonType": "input",
        "order": 5,
        "cefrLevel": "A2",
        "durationEstimate": 14,
        "grammarTargets": ["a2.1-present-tense", "a2.1-questions-basics"],
        "vocabTargets": ["lemma-bakker", "lemma-markt", "lemma-cafe", "lemma-broodje", "lemma-koffie"],
        "canDoStatements": [
            "I can follow short clips in three familiar shopping contexts.",
            "I can pick the place (bakery / market / café) from clues.",
        ],
        "steps": [
            {
                "id": "m02-l06-preview",
                "type": "preview",
                "prompt": "Drie plekken",
                "content": {
                    "previewItems": [
                        {"id": "m02-l06-p1", "word": "bakker", "lemma": "bakker", "translationEn": "bakery", "emoji": "🥖"},
                        {"id": "m02-l06-p2", "word": "markt", "lemma": "markt", "translationEn": "market", "emoji": "🛒"},
                        {"id": "m02-l06-p3", "word": "café", "lemma": "café", "translationEn": "café", "emoji": "☕"},
                        {"id": "m02-l06-p4", "word": "broodje", "lemma": "broodje", "translationEn": "roll", "emoji": "🥪"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m02-l06-listen-a",
                "type": "listening",
                "prompt": "Bakker — luister",
                "content": {
                    "dialogue": [
                        {"speaker": "Klant", "nl": "Goedemorgen. Ik wil graag twee bruine broodjes.", "en": "Good morning. I would like two brown rolls."},
                        {"speaker": "Bakker", "nl": "Zeker. Nog iets?", "en": "Sure. Anything else?"},
                        {"speaker": "Klant", "nl": "Nee, dat is alles. Dank u wel.", "en": "No, that is all. Thank you."},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m02-l06-a1", "Waar zijn de mensen?", ["Bij de bakker", "In de supermarkt alleen", "Op het station"], "Bij de bakker"),
                    mcq("m02-l06-a2", "Hoeveel broodjes?", ["Twee", "Vijf", "Nul"], "Twee"),
                    mcq("m02-l06-a3", "Hoe sluit de klant af?", ["Dat is alles — dank u wel", "Tot op het station", "Ik ga slapen"], "Dat is alles — dank u wel"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l06-listen-b",
                "type": "listening",
                "prompt": "Markt — tweede clip",
                "content": {
                    "dialogue": [
                        {"speaker": "Verkoper", "nl": "Een kilo sinaasappels, vijf euro.", "en": "A kilo of oranges, five euros."},
                        {"speaker": "Klant", "nl": "Oké. Heeft u ook kleine mandarijnen?", "en": "Okay. Do you also have small mandarins?"},
                        {"speaker": "Verkoper", "nl": "Ja, hier. Voor twee euro.", "en": "Yes, here. For two euros."},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m02-l06-b1", "Welke context?", ["Een marktkraam", "Een bankkantoor", "Een ziekenhuis"], "Een marktkraam"),
                    mcq("m02-l06-b2", "Wat koopt de klant eerst?", ["Een kilo sinaasappels", "Brood", "Melk"], "Een kilo sinaasappels"),
                    mcq("m02-l06-b3", "Wat vraagt de klant daarna?", ["Mandarijnen", "Een fiets", "Een kaartje"], "Mandarijnen"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l06-listen-c",
                "type": "listening",
                "prompt": "Café — derde clip",
                "content": {
                    "dialogue": [
                        {"speaker": "Medewerker", "nl": "Goedemiddag. Wat wilt u drinken?", "en": "Good afternoon. What would you like to drink?"},
                        {"speaker": "Klant", "nl": "Een koffie om mee te nemen, graag.", "en": "A coffee to go, please."},
                        {"speaker": "Medewerker", "nl": "Prima. Dat is drie euro.", "en": "Fine. That is three euros."},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m02-l06-c1", "Wat bestelt de klant?", ["Koffie", "Bier", "Melk"], "Koffie"),
                    mcq("m02-l06-c2", "Hoeveel kost het?", ["Drie euro", "Tien cent", "Gratis"], "Drie euro"),
                    mcq(
                        "m02-l06-c3",
                        "Hoe vraagt de klant om koffie voor onderweg?",
                        ["Een koffie om mee te nemen, graag.", "Een koffie in de trein, graag.", "Een koffie zonder kopje, graag."],
                        "Een koffie om mee te nemen, graag.",
                    ),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l06-discovery",
                "type": "discovery",
                "prompt": "Tik — contextwoorden",
                "content": {
                    "phrases": [
                        {"nl": "Twee broodjes, graag.", "en": "Two rolls, please.", "focus": "broodjes"},
                        {"nl": "Een kilo … op de markt.", "en": "A kilo … at the market.", "focus": "markt"},
                        {"nl": "Koffie om mee te nemen.", "en": "Coffee to go.", "focus": "koffie"},
                    ]
                },
                "metadata": {},
            },
            {
                "id": "m02-l06-pl1",
                "type": "practice_loop",
                "prompt": "Welke plek? — 6×",
                "content": {"lemmas": ["bakker", "markt", "café"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m02-l06-p1", "Waar hoor je “broodjes” het meest?", ["Bij de bakker", "In de garage", "Op de sportschool"], "Bij de bakker"),
                    mcq("m02-l06-p2", "Waar hoor je vaak “per kilo” of marktprijzen?", ["Op de markt", "In de klas", "In de trein"], "Op de markt"),
                    mcq("m02-l06-p3", "Waar drink je koffie om mee te nemen?", ["In een café", "In een zwembad", "In een bibliotheek"], "In een café"),
                    mcq("m02-l06-p4", "Welke zin hoort bij afrekenen?", ["Dat is drie euro.", "Ik ben drie euro.", "Drie euro ben ik."], "Dat is drie euro."),
                    ro("m02-l06-p5", "Zet in de juiste volgorde.", ["graag", "Twee", "broodjes", ","], "Twee broodjes, graag"),
                    mcq("m02-l06-p6", "Welke fout is vreemd in een café?", ["Ik wil graag koffie.", "Ik wil graag een dokter.", "Ik wil graag thee."], "Ik wil graag een dokter."),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l06-pl2",
                "type": "practice_loop",
                "prompt": "Nog een ronde — 6×",
                "content": {"lemmas": ["koffie", "markt", "broodje"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["vocab"]},
                "exercises": [
                    mcq("m02-l06-q1", "Synoniem van *om mee te nemen* in context?", ["meenemen / to go", "slapen", "zwemmen"], "meenemen / to go"),
                    mcq("m02-l06-q2", "Welke zin hoort bij de bakker?", ["Ik wil graag een croissant.", "Ik wil graag benzine.", "Ik wil graag een trein."], "Ik wil graag een croissant."),
                    fb("m02-l06-q3", "Op de ___ vind je vaak groente en fruit. (plek)", ["markt", "ochtend", "radio"], "markt"),
                    mcq("m02-l06-q4", "Welke vraag hoort bij een bar?", ["Wat wilt u drinken?", "Waar is uw huiswerk?", "Hoe lang is uw trein?"], "Wat wilt u drinken?"),
                    ro("m02-l06-q5", "Zet in de juiste volgorde.", ["euro", "Dat", "drie", "is"], "Dat is drie euro"),
                    mcq("m02-l06-q6", "Kies de beste afsluiting", ["Dank u wel!", "Ik ben dank!", "Tot kaas!"], "Dank u wel!"),
                ],
                "metadata": {"depthLayer": "m02-v2"},
            },
            {
                "id": "m02-l06-sp1",
                "type": "speaking",
                "prompt": "Zeg het bij de bakker",
                "content": {"targetNl": "Ik wil graag twee broodjes.", "acceptable": ["Ik wil graag twee broodjes"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Ik wil graag twee broodjes"},
                "metadata": {},
            },
            {
                "id": "m02-l06-sp2",
                "type": "speaking",
                "prompt": "Variatie — café",
                "content": {"targetNl": "Een koffie om mee te nemen, graag.", "acceptable": ["Een koffie om mee te nemen graag"], "maxRecordingSeconds": 30},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Een koffie om mee te nemen"},
                "metadata": {},
            },
            {
                "id": "m02-l06-sp3",
                "type": "speaking",
                "prompt": "Markt — prijs",
                "content": {"targetNl": "Hoeveel kost een kilo?", "acceptable": ["Hoeveel kost een kilo", "hoeveel kost een kilo"], "maxRecordingSeconds": 26},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Hoeveel kost een kilo"},
                "metadata": {},
            },
            {
                "id": "m02-l06-recap",
                "type": "recap",
                "prompt": "Laatste ronde",
                "content": {
                    "lemmas": ["bakker", "markt", "koffie"],
                    "tasks": [
                        {
                            "kind": "listen_mcq",
                            "question": "Clip:",
                            "snippetNl": "Ik wil graag twee bruine broodjes.",
                            "options": ["Bakker.", "Zwembad.", "Station."],
                            "correctAnswer": "Bakker.",
                        },
                        {"kind": "fill_blank", "sentence": "Een koffie om mee te ___. (nemen)", "options": ["nemen", "slapen", "zwemmen"], "correctAnswer": "nemen"},
                        {"kind": "reorder", "tokens": ["euro", "drie", "is", "Dat"], "correctAnswer": "Dat is drie euro"},
                        {"kind": "speak", "prompt": "Zeg: *Nee, dat is alles.*", "targetNl": "Nee, dat is alles.", "mockPass": True},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["listening", "vocab"],
        "metadata": {**LM, "archetype": "input_variation"},
    }


def lesson_l07() -> dict:
    gid = "a2-m02-l07-grammar-present-shopping-verbs"
    return {
        "id": gid,
        "moduleId": MID,
        "title": "Grammar & patterns · Present tense · common shopping verbs",
        "lessonType": "pattern",
        "order": 6,
        "cefrLevel": "A2",
        "durationEstimate": 14,
        "grammarTargets": ["a2.1-present-tense"],
        "vocabTargets": ["lemma-kopen", "lemma-betalen", "lemma-nemen", "lemma-nodig", "lemma-brengen"],
        "canDoStatements": [
            "I can use koop / betaal / neem / heb nodig in short shopping lines.",
            "I can spot the verb in a simple question.",
        ],
        "steps": [
            {
                "id": "m02-l07-grammar",
                "type": "grammar_card",
                "prompt": "Werkwoorden in de winkel",
                "content": {
                    "title": "Present — kopen, betalen, nemen, nodig hebben",
                    "summary": "**Ik koop** … / **Ik betaal** / **Ik neem** … / **Ik heb … nodig** (nodig hebben).",
                    "examples": [
                        {"nl": "Ik koop melk bij de supermarkt.", "en": "I buy milk at the supermarket."},
                        {"nl": "Ik betaal bij de kassa.", "en": "I pay at the checkout."},
                        {"nl": "Ik neem deze.", "en": "I will take this one."},
                        {"nl": "Ik heb brood nodig.", "en": "I need bread."},
                    ],
                },
                "feedbackConfig": {"hint": "Zoek het werkwoord op de tweede plek (ik-vorm)."},
                "metadata": {},
            },
            {
                "id": "m02-l07-discovery",
                "type": "discovery",
                "prompt": "Tik — het werkwoord",
                "content": {
                    "phrases": [
                        {"nl": "Ik koop groente.", "en": "I buy vegetables.", "focus": "koop"},
                        {"nl": "Ik betaal contant.", "en": "I pay cash.", "focus": "betaal"},
                        {"nl": "Ik heb suiker nodig.", "en": "I need sugar.", "focus": "heb"},
                    ]
                },
                "metadata": {},
            },
            {
                "id": "m02-l07-pl1",
                "type": "practice_loop",
                "prompt": "Kies / vul in — 8×",
                "content": {"lemmas": ["kopen", "betalen", "nodig"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["grammar"]},
                "exercises": [
                    mcq("m02-l07-a1", "Welke zin gebruikt *kopen* goed?", ["Ik koop brood.", "Ik kopen brood.", "Koop ik brood."], "Ik koop brood."),
                    fb("m02-l07-a2", "Ik ___ bij de kassa. (betalen)", ["betaal", "koop", "slaap"], "betaal"),
                    mcq("m02-l07-a3", "Welke zin hoort bij *nodig hebben*?", ["Ik heb melk nodig.", "Ik nodig melk heb.", "Ik melk heb nodig."], "Ik heb melk nodig."),
                    mcq("m02-l07-a4", "___ je brood mee? (thuisbrengen)", ["Wil", "Ben", "Is"], "Wil"),
                    ro("m02-l07-a5", "Zet in de juiste volgorde.", ["nodig", "Ik", "heb", "kaas"], "Ik heb kaas nodig"),
                    mcq("m02-l07-a6", "Welke vraag is correct?", ["Waar kan ik betalen?", "Waar kan betalen ik?", "Betalen waar ik?"], "Waar kan ik betalen?"),
                    fb("m02-l07-a7", "___ u dit mee? (willen: u-vorm)", ["Wilt", "Wil", "Ben"], "Wilt"),
                    mcq("m02-l07-a8", "Welke zin betekent “I take this”?", ["Ik neem deze.", "Ik eet deze.", "Ik ben deze."], "Ik neem deze."),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l07-pl2",
                "type": "practice_loop",
                "prompt": "Transform — 6×",
                "content": {"lemmas": ["koop", "betaal", "neem"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["grammar"]},
                "exercises": [
                    mcq(
                        "m02-l07-b1",
                        "Welke vraag hoort bij boodschappen met een vriend (informeel **je/jij**)?",
                        ["Wil je vanavond brood meenemen?", "Koop u ook online vandaag?", "Wilt u mijn bonuskaart scannen?"],
                        "Wil je vanavond brood meenemen?",
                    ),
                    mcq("m02-l07-b2", "Welke zin hoort bij de supermarkt?", ["Ik koop boodschappen.", "Ik koop een trein.", "Ik koop een dokter."], "Ik koop boodschappen."),
                    fb("m02-l07-b3", "Ik ___ twee euro contant. (betalen)", ["betaal", "koop", "slaap"], "betaal"),
                    ro("m02-l07-b4", "Zet in de juiste volgorde.", ["pinnen", "Kan", "ik", "?"], "Kan ik pinnen?"),
                    mcq("m02-l07-b5", "Welk werkwoord past bij *meenemen*?", ["brengen", "slapen", "zwemmen"], "brengen"),
                    mcq("m02-l07-b6", "Kies de beste zin", ["Ik heb brood nodig.", "Ik ben brood nodig.", "Ik nodig brood heb."], "Ik heb brood nodig."),
                ],
                "metadata": {"depthLayer": "m02-v2"},
            },
            {
                "id": "m02-l07-sp1",
                "type": "speaking",
                "prompt": "Zeg het met *nodig*",
                "content": {"targetNl": "Ik heb melk nodig.", "acceptable": ["Ik heb melk nodig"], "maxRecordingSeconds": 26},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Ik heb melk nodig"},
                "metadata": {},
            },
            {
                "id": "m02-l07-sp2",
                "type": "speaking",
                "prompt": "Variatie — kopen",
                "content": {"targetNl": "Ik koop vandaag groente.", "acceptable": ["Ik koop vandaag groente"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Ik koop vandaag groente"},
                "metadata": {},
            },
            {
                "id": "m02-l07-sp3",
                "type": "speaking",
                "prompt": "Meenemen",
                "content": {"targetNl": "Wil je brood meenemen?", "acceptable": ["Wil je brood meenemen"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Wil je brood meenemen"},
                "metadata": {},
            },
            {
                "id": "m02-l07-recap",
                "type": "recap",
                "prompt": "Check",
                "content": {
                    "lemmas": ["kopen", "nodig"],
                    "tasks": [
                        {"kind": "fill_blank", "sentence": "Ik ___ kaas nodig. (hebben)", "options": ["heb", "ben", "ga"], "correctAnswer": "heb"},
                        {"kind": "reorder", "tokens": ["betalen", "bij", "Ik", "de", "kassa"], "correctAnswer": "Ik betaal bij de kassa"},
                        {"kind": "speak", "prompt": "Zeg: *Ik neem deze.*", "targetNl": "Ik neem deze.", "mockPass": True},
                        {"kind": "fill_blank", "sentence": "Ik ___ brood nodig. (hebben)", "options": ["heb", "ben", "ga"], "correctAnswer": "heb"},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["grammar", "word-order"],
        "metadata": {**LM, "archetype": "pattern_present"},
    }


def lesson_l08() -> dict:
    gid = "a2-m02-l08-writing-short-shopping-messages"
    return {
        "id": gid,
        "moduleId": MID,
        "title": "Writing · Short shopping messages · buy / bring / need",
        "lessonType": "writing",
        "order": 7,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.1-present-tense", "a2.1-modals-requests"],
        "vocabTargets": ["lemma-boodschappen", "lemma-nodig", "lemma-brengen", "lemma-melk", "lemma-brood"],
        "canDoStatements": [
            "I can write a short note or app message about what to buy or bring.",
            "I can use *nodig hebben* and *wil graag* in one short line.",
        ],
        "steps": [
            {
                "id": "m02-l08-preview",
                "type": "preview",
                "prompt": "3 woorden",
                "content": {
                    "previewItems": [
                        {"id": "m02-l08-p1", "word": "boodschappen", "lemma": "boodschappen", "translationEn": "groceries", "emoji": "🛒"},
                        {"id": "m02-l08-p2", "word": "nodig", "lemma": "nodig", "translationEn": "needed", "emoji": "📝"},
                        {"id": "m02-l08-p3", "word": "meenemen", "lemma": "meenemen", "translationEn": "bring along", "emoji": "🎒"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m02-l08-listen-read",
                "type": "listen_read",
                "prompt": "Voorbeeld — appje",
                "content": {
                    "dialogue": [
                        {"speaker": "Jij", "nl": "Hoi! Ik heb melk en brood nodig. Kun je dat meenemen?", "en": "Hi! I need milk and bread. Can you bring that?"},
                        {"speaker": "Vriend", "nl": "Ja, geen probleem. Tot straks!", "en": "Yes, no problem. See you later!"},
                    ]
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m02-l08-e1", "Wat heeft de persoon nodig?", ["Melk en brood", "Kaas en bier", "Alleen water"], "Melk en brood"),
                    mcq("m02-l08-e2", "Wat vraagt hij/zij?", ["Of de ander het kan meenemen", "Of het regent", "Of er een trein is"], "Of de ander het kan meenemen"),
                    mcq("m02-l08-e3", "Welke toon past bij dit appje?", ["Informeel en kort (Hoi!)", "Zeer formeel (Geachte heer)", "Juridisch"], "Informeel en kort (Hoi!)"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l08-grammar",
                "type": "grammar_card",
                "prompt": "Zo schrijf je een kort berichtje",
                "content": {
                    "title": "Appje — boodschappen",
                    "summary": "**Nodig:** *Ik heb X nodig.* **Vraag:** *Kun je … meenemen?* / *Wil je … meenemen?* Kort + duidelijk.",
                    "examples": [
                        {"nl": "Ik heb melk nodig. Kun je dat meenemen?", "en": "I need milk. Can you bring it?"},
                        {"nl": "Wil je vanavond brood meenemen?", "en": "Will you bring bread tonight?"},
                    ],
                },
                "feedbackConfig": {"hint": "Eerst wat je nodig hebt, dan je vraag."},
                "metadata": {},
            },
            {
                "id": "m02-l08-pl1",
                "type": "practice_loop",
                "prompt": "Kies de beste zin — 6×",
                "content": {"lemmas": ["nodig", "meenemen"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["grammar"]},
                "exercises": [
                    mcq("m02-l08-a1", "Welke zin is natuurlijk?", ["Ik heb suiker nodig.", "Ik ben suiker nodig.", "Ik nodig suiker heb."], "Ik heb suiker nodig."),
                    mcq("m02-l08-a2", "Beleefd verzoek", ["Wil je brood meenemen?", "Jij brood nu!", "Brood jij!"], "Wil je brood meenemen?"),
                    ro("m02-l08-a3", "Zet in de juiste volgorde.", ["nodig", "Ik", "heb", "water"], "Ik heb water nodig"),
                    mcq("m02-l08-a4", "Welke zin hoort bij een boodschappenlijst?", ["Ik koop vandaag groente.", "Ik ben een trein.", "Ik slaap de winkel."], "Ik koop vandaag groente."),
                    fb("m02-l08-a5", "___ je melk meenemen? (willen: je)", ["Wil", "Ben", "Heb"], "Wil"),
                    mcq("m02-l08-a6", "Kies de beste afsluiting", ["Tot straks!", "Tot gisteren!", "Tot de maan!"], "Tot straks!"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l08-fill",
                "type": "fill_blank",
                "prompt": "Vul in — schema",
                "feedbackConfig": {"errorTags": ["grammar"]},
                "exercises": [
                    fb("m02-l08-f1", "Ik ___ boodschappen doen na het werk. (gaan)", ["ga", "ben", "heb"], "ga"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l08-write1",
                "type": "writing",
                "prompt": "Schrijf één korte regel (WhatsApp-stijl)",
                "content": {
                    "prompt": "Schrijf: dat je melk nodig hebt (minimaal 4 tekens).",
                    "acceptable": [
                        "Ik heb melk nodig",
                        "ik heb melk nodig",
                        "Ik heb melk nodig.",
                        "heb melk nodig",
                    ],
                    "modelNl": "Ik heb melk nodig.",
                    "minChars": 4,
                },
                "feedbackConfig": {"errorTags": ["grammar"]},
                "metadata": {},
            },
            {
                "id": "m02-l08-write2",
                "type": "writing",
                "prompt": "Verbeter: vraag om meenemen",
                "content": {
                    "prompt": "Schrijf: Wil je brood meenemen? (mag klein verschil)",
                    "acceptable": [
                        "Wil je brood meenemen",
                        "wil je brood meenemen",
                        "Wil je brood meenemen?",
                        "Kun je brood meenemen",
                        "kun je brood meenemen",
                    ],
                    "modelNl": "Wil je brood meenemen?",
                    "minChars": 6,
                },
                "feedbackConfig": {},
                "metadata": {},
            },
            {
                "id": "m02-l08-pl2",
                "type": "practice_loop",
                "prompt": "Mini-check — 6×",
                "content": {"lemmas": ["boodschappen", "nodig"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["vocab"]},
                "exercises": [
                    mcq("m02-l08-b1", "Welke zin hoort bij een lijstje?", ["Vandaag: melk, brood, kaas.", "Vandaag: trein, vliegtuig.", "Vandaag: dokter."], "Vandaag: melk, brood, kaas."),
                    mcq("m02-l08-b2", "Welk woord hoort bij *nodig hebben*?", ["brood", "zwemmen", "radio"], "brood"),
                    fb("m02-l08-b3", "Ik ga vanavond ___. (boodschappen)", ["boodschappen", "trein", "slapen"], "boodschappen"),
                    mcq("m02-l08-b4", "Welke zin is een verzoek?", ["Kun je dat meenemen?", "Ik ben dat.", "Dat is een trein."], "Kun je dat meenemen?"),
                    ro("m02-l08-b5", "Zet in de juiste volgorde.", ["meenemen", "Wil", "je", "dit", "?"], "Wil je dit meenemen?"),
                    mcq("m02-l08-b6", "Kies natuurlijk Nederlands", ["Ik heb kaas nodig.", "Ik kaas heb nodig nodig.", "Nodig kaas ik."], "Ik heb kaas nodig."),
                    mcq("m02-l08-b7", "Welke zin hoort bij een app-berichtje?", ["Kun je dat meenemen?", "Kun je een trein zijn?", "Kun je morgen regen?"], "Kun je dat meenemen?"),
                ],
                "metadata": {"depthLayer": "m02-v2"},
            },
            {
                "id": "m02-l08-sp1",
                "type": "speaking",
                "prompt": "Lees je zin hardop",
                "content": {"targetNl": "Ik heb melk en brood nodig.", "acceptable": ["Ik heb melk en brood nodig"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Ik heb melk en brood nodig"},
                "metadata": {},
            },
            {
                "id": "m02-l08-recap",
                "type": "recap",
                "prompt": "Recap",
                "content": {
                    "lemmas": ["nodig", "boodschappen"],
                    "tasks": [
                        {"kind": "fill_blank", "sentence": "Ik heb ___ nodig. (brood)", "options": ["brood", "trein", "radio"], "correctAnswer": "brood"},
                        {"kind": "reorder", "tokens": ["je", "Wil", "melk", "meenemen", "?"], "correctAnswer": "Wil je melk meenemen?"},
                        {"kind": "speak", "prompt": "Zeg: *Ik ga boodschappen doen.*", "targetNl": "Ik ga boodschappen doen.", "mockPass": True},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["grammar", "spelling"],
        "metadata": {**LM, "archetype": "writing_proxy", "note": "Uses writing + loops; full typing UI is future."},
    }


def lesson_l09() -> dict:
    gid = "a2-m02-l09-task-buy-three-items"
    return {
        "id": gid,
        "moduleId": MID,
        "title": "Real-life task · Buy three items · scaffolded interaction",
        "lessonType": "task",
        "order": 8,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.1-modals-requests", "a2.1-quantities-measures"],
        "vocabTargets": ["lemma-mandje", "lemma-kassa", "lemma-bon", "lemma-pinnen", "lemma-tasje"],
        "canDoStatements": [
            "I can complete a scaffolded three-item purchase with polite lines.",
            "I can ask for a bag and receipt in the right order.",
        ],
        "steps": [
            {
                "id": "m02-l09-preview",
                "type": "preview",
                "prompt": "Taak — 4 woorden",
                "content": {
                    "previewItems": [
                        {"id": "m02-l09-p1", "word": "mandje", "lemma": "mandje", "translationEn": "basket", "emoji": "🧺"},
                        {"id": "m02-l09-p2", "word": "kassa", "lemma": "kassa", "translationEn": "checkout", "emoji": "💳"},
                        {"id": "m02-l09-p3", "word": "bon", "lemma": "bon", "translationEn": "receipt", "emoji": "🧾"},
                        {"id": "m02-l09-p4", "word": "pinnen", "lemma": "pinnen", "translationEn": "pay by card", "emoji": "💶"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m02-l09-listen",
                "type": "listening",
                "prompt": "Luister — voorbeeld",
                "content": {
                    "dialogue": [
                        {"speaker": "Klant", "nl": "Ik wil graag melk, brood en kaas.", "en": "I would like milk, bread and cheese."},
                        {"speaker": "Medewerker", "nl": "Prima. Wilt u een tasje?", "en": "Fine. Would you like a bag?"},
                        {"speaker": "Klant", "nl": "Ja, graag. Kan ik pinnen?", "en": "Yes, please. Can I pay by card?"},
                        {"speaker": "Medewerker", "nl": "Natuurlijk. Bij de kassa.", "en": "Of course. At the checkout."},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m02-l09-l1", "Hoeveel producten noemt de klant?", ["Drie", "Twee", "Eén"], "Drie"),
                    mcq("m02-l09-l2", "Wat vraagt de medewerker over een tas?", ["Wilt u een tasje?", "Waar woont u?", "Hoe laat is het?"], "Wilt u een tasje?"),
                    mcq("m02-l09-l3", "Hoe wil de klant betalen?", ["Pinnen", "Alleen contant zonder pin", "Gratis"], "Pinnen"),
                    mcq("m02-l09-l4", "Waar zegt de medewerker dat de klant kan betalen?", ["Bij de kassa", "In het park", "Op het station"], "Bij de kassa"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l09-pl1",
                "type": "practice_loop",
                "prompt": "Kies de volgende zin — 6×",
                "content": {"lemmas": ["wil", "tasje", "kan"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["register"]},
                "exercises": [
                    mcq("m02-l09-p1", "Eerst: producten noemen — wat klinkt goed?", ["Ik wil graag melk, brood en kaas.", "Ik wil melk brood kaas zonder woorden.", "Melk ik wil drie keer."], "Ik wil graag melk, brood en kaas."),
                    mcq("m02-l09-p2", "Daarna: tas — natuurlijk antwoord", ["Ja, graag.", "Nee, ik ben een tas.", "Tas is morgen."], "Ja, graag."),
                    mcq("m02-l09-p3", "Betalen — welke vraag?", ["Kan ik pinnen?", "Kan ik slapen?", "Kan ik een huis?"], "Kan ik pinnen?"),
                    ro("m02-l09-p4", "Zet in de juiste volgorde.", ["bij", "Ik", "betaal", "de", "kassa"], "Ik betaal bij de kassa"),
                    mcq("m02-l09-p5", "Bon — beleefd", ["Mag ik de bon?", "Ik ben de bon.", "Bon is kaas."], "Mag ik de bon?"),
                    mcq("m02-l09-p6", "Afsluiten", ["Dank u wel!", "Ik ben wel!", "Tot bon!"], "Dank u wel!"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l09-sp1",
                "type": "speaking",
                "prompt": "Jouw beurt — drie producten",
                "content": {
                    "targetNl": "Ik wil graag melk, brood en kaas.",
                    "acceptable": [
                        "Ik wil graag melk brood en kaas",
                        "Ik wil graag melk, brood en kaas",
                        "ik wil graag melk brood en kaas",
                        "Ik wil melk brood en kaas",
                    ],
                    "maxRecordingSeconds": 30,
                },
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Ik wil graag melk brood en kaas"},
                "metadata": {},
            },
            {
                "id": "m02-l09-sp2",
                "type": "speaking",
                "prompt": "Tas + pin",
                "content": {"targetNl": "Ja, graag. Kan ik pinnen?", "acceptable": ["Ja graag kan ik pinnen"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Ja graag kan ik pinnen"},
                "metadata": {},
            },
            {
                "id": "m02-l09-pl2",
                "type": "practice_loop",
                "prompt": "Nog een ronde — 6×",
                "content": {"lemmas": ["bon", "tasje", "pinnen"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["vocab"]},
                "exercises": [
                    mcq("m02-l09-q1", "Welke zin vraagt om een bon?", ["Mag ik de bon?", "Ik ben de bon.", "Bon waar?"], "Mag ik de bon?"),
                    mcq("m02-l09-q2", "___ ik pinnen? (mogelijkheid)", ["Kan", "Mag", "Wil"], "Kan"),
                    mcq("m02-l09-q3", "Wilt u een ___? (plastic tas)", ["tasje", "station", "dokter"], "tasje"),
                    fb("m02-l09-q4", "Ik betaal ___. (met pin)", ["pinnen", "slapen", "zwemmen"], "pinnen"),
                    ro("m02-l09-q5", "Zet in de juiste volgorde.", ["een", "Ik", "wil", "bon", "graag"], "Ik wil graag een bon"),
                    mcq("m02-l09-q6", "Welke zin sluit vriendelijk af?", ["Dank u wel, tot ziens.", "Tot kaas morgen.", "Ik ben de kassa."], "Dank u wel, tot ziens."),
                ],
                "metadata": {"depthLayer": "m02-v2"},
            },
            {
                "id": "m02-l09-recap",
                "type": "recap",
                "prompt": "Check",
                "content": {
                    "lemmas": ["pinnen", "bon"],
                    "tasks": [
                        {"kind": "speak", "prompt": "Zeg: *Kan ik pinnen?*", "targetNl": "Kan ik pinnen?", "mockPass": True},
                        {"kind": "fill_blank", "sentence": "Mag ik de ___?", "options": ["bon", "trein", "radio"], "correctAnswer": "bon"},
                        {
                            "kind": "listen_mcq",
                            "question": "Je hoort:",
                            "snippetNl": "Wilt u een tasje?",
                            "options": ["Vraag over een tas.", "Vraag over een huis.", "Vraag over een dokter."],
                            "correctAnswer": "Vraag over een tas.",
                        },
                        {"kind": "reorder", "tokens": ["melk", "wil", "graag", "Ik"], "correctAnswer": "Ik wil graag melk"},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["register", "vocab"],
        "metadata": {**LM, "archetype": "task_scaffold"},
    }


def lesson_l10() -> dict:
    gid = "a2-m02-l10-task-shop-dialogue-full"
    return {
        "id": gid,
        "moduleId": MID,
        "title": "Real-life task · Shop dialogue · full short simulation",
        "lessonType": "task",
        "order": 9,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.1-modals-requests", "a2.1-present-tense", "a2.1-questions-basics"],
        "vocabTargets": ["lemma-hoeveel", "lemma-contant", "lemma-kassa", "lemma-alstublieft", "lemma-graag"],
        "canDoStatements": [
            "I can follow a 5-line shop dialogue and respond at key turns.",
            "I can close with payment and thanks.",
        ],
        "steps": [
            {
                "id": "m02-l10-discovery",
                "type": "discovery",
                "prompt": "Herhaal deze brokken",
                "content": {
                    "phrases": [
                        {"nl": "Hoeveel kost dit?", "en": "How much does this cost?", "focus": "Hoeveel"},
                        {"nl": "Mag ik een bon?", "en": "May I have a receipt?", "focus": "Mag"},
                        {"nl": "Dat is alles.", "en": "That is all.", "focus": "alles"},
                    ]
                },
                "metadata": {},
            },
            {
                "id": "m02-l10-listen",
                "type": "listening",
                "prompt": "Volledig gesprek — luister twee keer in gedachten",
                "content": {
                    "dialogue": [
                        {"speaker": "Medewerker", "nl": "Goedemiddag. Kan ik u helpen?", "en": "Good afternoon. Can I help you?"},
                        {"speaker": "Klant", "nl": "Ja. Hoeveel kost deze kaas?", "en": "Yes. How much does this cheese cost?"},
                        {"speaker": "Medewerker", "nl": "Vandaag vier euro.", "en": "Today four euros."},
                        {"speaker": "Klant", "nl": "Prima. Ik neem hem. Kan ik pinnen?", "en": "Fine. I will take it. Can I pay by card?"},
                        {"speaker": "Medewerker", "nl": "Ja. Mag ik uw bonuskaart? Dank u wel, tot ziens!", "en": "Yes. May I have your loyalty card? Thank you, goodbye!"},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m02-l10-l1", "Wat wil de klant weten?", ["De prijs van de kaas", "Het adres van de bakker", "Het weer"], "De prijs van de kaas"),
                    mcq("m02-l10-l2", "Hoeveel kost de kaas vandaag?", ["Vier euro", "Twee euro", "Nul euro"], "Vier euro"),
                    mcq("m02-l10-l3", "Hoe wil de klant betalen?", ["Pinnen", "Alleen met appels", "Niet betalen"], "Pinnen"),
                    mcq("m02-l10-l4", "Wat vraagt de medewerker op het eind?", ["Bonuskaart", "Een dokter", "Een fiets"], "Bonuskaart"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l10-pl1",
                "type": "practice_loop",
                "prompt": "Jouw beurt (meerkeuze) — 6×",
                "content": {"lemmas": ["hoeveel", "pinnen", "bonuskaart"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["register"]},
                "exercises": [
                    mcq("m02-l10-p1", "Prijs vragen — beste zin?", ["Hoeveel kost dit?", "Hoeveel is jouw naam?", "Hoeveel regen?"], "Hoeveel kost dit?"),
                    mcq("m02-l10-p2", "Je wilt afrekenen — wat zeg je?", ["Kan ik pinnen?", "Kan ik slapen?", "Kan ik een boom?"], "Kan ik pinnen?"),
                    mcq("m02-l10-p3", "Welke zin sluit de lijst af?", ["Dat is alles.", "Dat is morgen.", "Dat is een trein."], "Dat is alles."),
                    ro("m02-l10-p4", "Zet in de juiste volgorde.", ["bon", "Mag", "ik", "een", "?"], "Mag ik een bon?"),
                    mcq("m02-l10-p5", "Welke reactie is beleefd?", ["Dank u wel!", "Ik ben wel!", "Tot kaas!"], "Dank u wel!"),
                    mcq(
                        "m02-l10-p6",
                        "Welke zin is duidelijk fout?",
                        ["Ik neem de maan.", "Ik neem hem.", "Prima, ik neem hem."],
                        "Ik neem de maan.",
                    ),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l10-sp1",
                "type": "speaking",
                "prompt": "Spreuk 1 — prijs",
                "content": {"targetNl": "Hoeveel kost deze kaas?", "acceptable": ["Hoeveel kost deze kaas"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Hoeveel kost deze kaas"},
                "metadata": {},
            },
            {
                "id": "m02-l10-sp2",
                "type": "speaking",
                "prompt": "Spreuk 2 — ik neem hem",
                "content": {"targetNl": "Prima. Ik neem hem.", "acceptable": ["Prima ik neem hem"], "maxRecordingSeconds": 26},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Prima ik neem hem"},
                "metadata": {},
            },
            {
                "id": "m02-l10-sp3",
                "type": "speaking",
                "prompt": "Spreuk 3 — pin + dank",
                "content": {"targetNl": "Kan ik pinnen? Dank u wel!", "acceptable": ["Kan ik pinnen dank u wel"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Kan ik pinnen"},
                "metadata": {},
            },
            {
                "id": "m02-l10-pl2",
                "type": "practice_loop",
                "prompt": "Fix — 6×",
                "content": {"lemmas": ["vier", "euro", "kaas"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["grammar"]},
                "exercises": [
                    mcq("m02-l10-q1", "Welke vraag hoort bij prijs?", ["Hoeveel kost dit?", "Waar kost dit?", "Wie kost dit?"], "Hoeveel kost dit?"),
                    fb("m02-l10-q2", "Vandaag ___ euro. (getal)", ["vier", "honderd kilo", "trein"], "vier"),
                    mcq("m02-l10-q3", "Bonuskaart — wat vraagt de medewerker?", ["Mag ik uw bonuskaart?", "Mag ik uw huis?", "Mag ik uw dokter?"], "Mag ik uw bonuskaart?"),
                    ro("m02-l10-q4", "Zet in de juiste volgorde.", ["is", "Dat", "alles", "."], "Dat is alles."),
                    mcq("m02-l10-q5", "Welke zin is een afscheid?", ["Tot ziens!", "Tot kaas in de trein!", "Tot gisteren!"], "Tot ziens!"),
                    mcq("m02-l10-q6", "Kies de beste klantregel na de prijs", ["Prima. Ik neem hem.", "Prima. Ik ben kaas.", "Prima. Ik eet de kassa."], "Prima. Ik neem hem."),
                ],
                "metadata": {"depthLayer": "m02-v2"},
            },
            {
                "id": "m02-l10-recap",
                "type": "recap",
                "prompt": "Check",
                "content": {
                    "lemmas": ["hoeveel", "pinnen"],
                    "tasks": [
                        {"kind": "listen_mcq", "question": "Prijs:", "snippetNl": "Vandaag vier euro.", "options": ["Vier euro.", "Vier treinen.", "Vier dokters."], "correctAnswer": "Vier euro."},
                        {"kind": "reorder", "tokens": ["ik", "Kan", "pinnen", "?"], "correctAnswer": "Kan ik pinnen?"},
                        {"kind": "speak", "prompt": "Zeg: *Mag ik de bon?*", "targetNl": "Mag ik de bon?", "mockPass": True},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["listening", "register"],
        "metadata": {**LM, "archetype": "task_full"},
    }


def lesson_l11() -> dict:
    gid = "a2-m02-l11-review-food-shopping-mixed"
    return {
        "id": gid,
        "moduleId": MID,
        "title": "Review · Food & shopping · mixed recap",
        "lessonType": "review",
        "order": 10,
        "cefrLevel": "A2",
        "durationEstimate": 16,
        "grammarTargets": ["a2.1-modals-requests", "a2.1-present-tense", "a2.1-questions-basics", "a2.1-quantities-measures"],
        "vocabTargets": ["lemma-boodschappen", "lemma-kassa", "lemma-hoeveel", "lemma-mag", "lemma-wil", "lemma-kilo", "lemma-pinnen"],
        "canDoStatements": [
            "I can retrieve key shopping chunks across listening, grammar, and speaking.",
            "I can self-check polite requests and quantities.",
        ],
        "steps": [
            {
                "id": "m02-l11-preview",
                "type": "preview",
                "prompt": "Snel opfrissen",
                "content": {
                    "previewItems": [
                        {"id": "m02-l11-p1", "word": "mag", "lemma": "mogen", "translationEn": "may", "emoji": "🙋"},
                        {"id": "m02-l11-p2", "word": "hoeveel", "lemma": "hoeveel", "translationEn": "how much", "emoji": "💶"},
                        {"id": "m02-l11-p3", "word": "kilo", "lemma": "kilo", "translationEn": "kilo", "emoji": "⚖️"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m02-l11-listen",
                "type": "listening",
                "prompt": "Luister — mix",
                "content": {
                    "dialogue": [
                        {"speaker": "Klant", "nl": "Ik wil graag een kilo appels. Hoeveel kost dat?", "en": "I would like a kilo of apples. How much does that cost?"},
                        {"speaker": "Medewerker", "nl": "Vandaag drie euro. Wilt u een tasje?", "en": "Today three euros. Would you like a bag?"},
                        {"speaker": "Klant", "nl": "Ja. Kan ik pinnen? Mag ik ook de bon?", "en": "Yes. Can I pay by card? May I also have the receipt?"},
                        {"speaker": "Medewerker", "nl": "Natuurlijk. Tot ziens!", "en": "Of course. Goodbye!"},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m02-l11-l1", "Wat wil de klant eerst?", ["Een kilo appels", "Een kilo kaas", "Een kilo koffie"], "Een kilo appels"),
                    mcq("m02-l11-l2", "Hoeveel kost het?", ["Drie euro", "Dertig euro", "Gratis"], "Drie euro"),
                    mcq("m02-l11-l3", "Wat vraagt de klant over betalen?", ["Kan ik pinnen?", "Kan ik zwemmen?", "Kan ik een boom?"], "Kan ik pinnen?"),
                    mcq("m02-l11-l4", "Wat vraagt de klant nog?", ["Mag ik ook de bon?", "Mag ik een dokter?", "Mag ik een trein?"], "Mag ik ook de bon?"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l11-mega",
                "type": "practice_loop",
                "prompt": "Gemengd — 12×",
                "content": {"lemmas": ["mag", "wil", "hoeveel", "kilo"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["grammar", "vocab"]},
                "exercises": [
                    mcq("m02-l11-m1", "___ ik een bon?", ["Mag", "Wil", "Eet"], "Mag"),
                    mcq("m02-l11-m2", "___ kost dit?", ["Hoeveel", "Waar", "Wie"], "Hoeveel"),
                    fb("m02-l11-m3", "Ik wil ___ een broodje. (beleefd)", ["graag", "nooit", "gisteren"], "graag"),
                    ro("m02-l11-m4", "Zet in de juiste volgorde.", ["pinnen", "Kan", "ik", "?"], "Kan ik pinnen?"),
                    mcq("m02-l11-m5", "Een hoeveelheid appels", ["Een kilo appels", "Een appels kilo", "Kilo een ik"], "Een kilo appels"),
                    mcq("m02-l11-m6", "Welke zin hoort bij afsluiten?", ["Dat is alles.", "Dat is een trein.", "Dat is gisteren."], "Dat is alles."),
                    mcq("m02-l11-m7", "___ u een tasje?", ["Wilt", "Ben", "Heb"], "Wilt"),
                    mcq("m02-l11-m8", "Welke zin is beleefd in de winkel?", ["Kunt u me helpen?", "Jij help nu!", "Help jij trein!"], "Kunt u me helpen?"),
                    fb("m02-l11-m9", "Ik ___ melk nodig. (hebben)", ["heb", "ben", "ga"], "heb"),
                    mcq("m02-l11-m10", "Waar betaal je meestal?", ["Bij de kassa", "In het plafond", "Onder de stoep"], "Bij de kassa"),
                    ro("m02-l11-m11", "Zet in de juiste volgorde.", ["graag", "Ik", "wil", "melk"], "Ik wil graag melk"),
                    mcq("m02-l11-m12", "Welke vraag hoort bij vers product?", ["Is dit vers?", "Is dit een trein?", "Is dit morgen?"], "Is dit vers?"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l11-mcq",
                "type": "mcq",
                "prompt": "Snel",
                "feedbackConfig": {"errorTags": ["register"]},
                "exercises": [mcq("m02-l11-mcq1", "Je wilt iets bestellen. Wat zeg je?", ["Ik wil graag …", "Ik ben graag …", "Ik eet graag de kassa."], "Ik wil graag …", "A2_mid")],
                "metadata": {},
            },
            {
                "id": "m02-l11-sp1",
                "type": "speaking",
                "prompt": "Zeg hardop",
                "content": {"targetNl": "Een kilo appels, alstublieft.", "acceptable": ["Een kilo appels alstublieft"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Een kilo appels alstublieft"},
                "metadata": {},
            },
            {
                "id": "m02-l11-recap",
                "type": "recap",
                "prompt": "Laatste ronde",
                "content": {
                    "lemmas": ["boodschappen", "kassa"],
                    "tasks": [
                        {"kind": "listen_mcq", "question": "Je hoort:", "snippetNl": "Kan ik pinnen?", "options": ["Betalen met pin.", "Naar het zwembad.", "Een adres."], "correctAnswer": "Betalen met pin."},
                        {"kind": "fill_blank", "sentence": "___ ik de bon?", "options": ["Mag", "Kan", "Wil"], "correctAnswer": "Mag"},
                        {"kind": "reorder", "tokens": ["kost", "Hoeveel", "dit", "?"], "correctAnswer": "Hoeveel kost dit?"},
                        {"kind": "speak", "prompt": "Zeg: *Ik ga boodschappen doen.*", "targetNl": "Ik ga boodschappen doen.", "mockPass": True},
                        {"kind": "fill_blank", "sentence": "Ik betaal bij de ___.", "options": ["kassa", "radio", "ochtend"], "correctAnswer": "kassa"},
                        {
                            "kind": "listen_mcq",
                            "question": "Polite request:",
                            "snippetNl": "Mag ik een tasje?",
                            "options": ["Toestemming / verzoek.", "Weerbericht.", "Trein."],
                            "correctAnswer": "Toestemming / verzoek.",
                        },
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["grammar", "vocab", "listening"],
        "metadata": {**LM, "archetype": "review_mixed"},
    }
