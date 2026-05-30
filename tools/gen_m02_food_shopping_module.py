#!/usr/bin/env python3
"""Generate content/modules/a2-m02-food-shopping/module.json (Stage 6 depth v2)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

MID = "a2-m02-food-shopping"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/modules/a2-m02-food-shopping/module.json"


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


GRAMMAR = [
    {
        "id": "a2.1-modals-requests",
        "name": "Modals for polite requests (mag / kan / wil)",
        "description": "High-frequency patterns in shops: permission, ability, wants with infinitive.",
        "examples": [
            {"nl": "Mag ik een bon, alstublieft?", "en": "May I have a receipt, please?"},
            {"nl": "Kan ik pinnen?", "en": "Can I pay by card?"},
            {"nl": "Ik wil graag een kilo appels.", "en": "I would like a kilo of apples."},
        ],
        "cefrLevel": "A2",
        "rules": {"pattern": "Modal + rest; polite u in service contexts."},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.1-present-tense",
        "name": "Present tense in shopping lines",
        "description": "Statements and questions with common verbs: kopen, kosten, hebben, willen.",
        "examples": [
            {"nl": "Ik koop brood bij de bakker.", "en": "I buy bread at the bakery."},
            {"nl": "Hoeveel kost dit?", "en": "How much does this cost?"},
            {"nl": "Heeft u melk?", "en": "Do you have milk?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.1-questions-basics",
        "name": "Questions for price & availability",
        "description": "Hoeveel / heeft u / waar vind ik … in short service exchanges.",
        "examples": [
            {"nl": "Hoeveel kost deze kaas?", "en": "How much does this cheese cost?"},
            {"nl": "Waar vind ik de melk?", "en": "Where do I find the milk?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.1-quantities-measures",
        "name": "Quantities & measures",
        "description": "een kilo, een pak, twee broodjes, een fles — chunks for amounts.",
        "examples": [
            {"nl": "Een kilo bananen, alstublieft.", "en": "A kilo of bananas, please."},
            {"nl": "Twee broodjes met kaas.", "en": "Two rolls with cheese."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
]

VOCAB = [
    ("lemma-supermarkt", "supermarkt", "supermarkt", "supermarket", "noun", "Ik ga naar de supermarkt.", "I go to the supermarket.", ["shopping", "A2.1"]),
    ("lemma-boodschappen", "boodschappen", "boodschappen", "groceries", "noun", "Ik doe boodschappen.", "I do grocery shopping.", ["shopping", "A2.1"]),
    ("lemma-mandje", "mandje", "mandje", "basket", "noun", "Neemt u een mandje?", "Will you take a basket?", ["shopping", "A2.1"]),
    ("lemma-kassa", "kassa", "kassa", "checkout", "noun", "Ik betaal bij de kassa.", "I pay at the checkout.", ["shopping", "A2.1"]),
    ("lemma-bon", "bon", "bon", "receipt", "noun", "Mag ik de bon?", "May I have the receipt?", ["shopping", "A2.1"]),
    ("lemma-pinnen", "pinnen", "pinnen", "to pay by card", "verb", "Kan ik pinnen?", "Can I pay by card?", ["shopping", "A2.1"]),
    ("lemma-contant", "contant", "contant", "cash", "adjective", "Ik betaal contant.", "I pay cash.", ["shopping", "A2.1"]),
    ("lemma-prijs", "prijs", "prijs", "price", "noun", "Wat is de prijs?", "What is the price?", ["shopping", "A2.1"]),
    ("lemma-euro", "euro", "euro", "euro", "noun", "Dat is drie euro.", "That is three euros.", ["shopping", "A2.1"]),
    ("lemma-kilo", "kilo", "kilo", "kilo", "noun", "Een kilo appels.", "A kilo of apples.", ["shopping", "A2.1"]),
    ("lemma-aanbieding", "aanbieding", "aanbieding", "offer; deal", "noun", "Deze week is er aanbieding.", "There is an offer this week.", ["shopping", "A2.1"]),
    ("lemma-vers", "vers", "vers", "fresh", "adjective", "Is dit vers?", "Is this fresh?", ["shopping", "A2.1"]),
    ("lemma-kaas", "kaas", "kaas", "cheese", "noun", "Ik wil kaas.", "I want cheese.", ["food", "A2.1"]),
    ("lemma-melk", "melk", "melk", "milk", "noun", "Ik heb melk nodig.", "I need milk.", ["food", "A2.1"]),
    ("lemma-brood", "brood", "brood", "bread", "noun", "Vers brood.", "Fresh bread.", ["food", "A2.1"]),
    ("lemma-appels", "appels", "appel", "apples", "noun", "Een kilo appels.", "A kilo of apples.", ["food", "A2.1"]),
    ("lemma-koffie", "koffie", "koffie", "coffee", "noun", "Koffie om mee te nemen?", "Coffee to go?", ["food", "A2.1"]),
    ("lemma-kopen", "kopen", "kopen", "to buy", "verb", "Ik koop brood.", "I buy bread.", ["shopping", "A2.1"]),
    ("lemma-betalen", "betalen", "betalen", "to pay", "verb", "Waar kan ik betalen?", "Where can I pay?", ["shopping", "A2.1"]),
    ("lemma-nemen", "nemen", "nemen", "to take", "verb", "Ik neem deze.", "I will take this one.", ["shopping", "A2.1"]),
    ("lemma-brengen", "brengen", "brengen", "to bring", "verb", "Wil je brood meenemen?", "Will you bring bread?", ["shopping", "A2.1"]),
    ("lemma-nodig", "nodig", "nodig", "needed", "adjective", "Ik heb suiker nodig.", "I need sugar.", ["shopping", "A2.1"]),
    ("lemma-mag", "mag", "mogen", "may (permission)", "verb", "Mag ik een tasje?", "May I have a bag?", ["shopping", "A2.1"]),
    ("lemma-wil", "wil", "willen", "want", "verb", "Ik wil graag twee broodjes.", "I would like two rolls.", ["shopping", "A2.1"]),
    ("lemma-kan", "kan", "kunnen", "can", "verb", "Kan ik pinnen?", "Can I pay by card?", ["shopping", "A2.1"]),
    ("lemma-hoeveel", "hoeveel", "hoeveel", "how much", "pronoun", "Hoeveel kost dit?", "How much does this cost?", ["shopping", "A2.1"]),
    ("lemma-alstublieft", "alstublieft", "alstublieft", "please; here you go", "adverb", "Een bon, alstublieft.", "A receipt, please.", ["shopping", "A2.1"]),
    ("lemma-graag", "graag", "graag", "gladly; would like", "adverb", "Ik wil graag melk.", "I would like milk.", ["shopping", "A2.1"]),
    ("lemma-tasje", "tasje", "tasje", "bag", "noun", "Wilt u een tasje?", "Would you like a bag?", ["shopping", "A2.1"]),
    ("lemma-bakker", "bakker", "bakker", "baker; bakery", "noun", "Brood van de bakker.", "Bread from the bakery.", ["shopping", "A2.1"]),
    ("lemma-markt", "markt", "markt", "market", "noun", "Op de markt is het goedkoop.", "At the market it is cheap.", ["shopping", "A2.1"]),
    ("lemma-cafe", "café", "café", "café", "noun", "Koffie in het café.", "Coffee in the café.", ["shopping", "A2.1"]),
    ("lemma-broodje", "broodje", "broodje", "roll; sandwich", "noun", "Twee broodjes, graag.", "Two rolls, please.", ["food", "A2.1"]),
    ("lemma-pak", "pak", "pak", "pack; carton", "noun", "Een pak melk.", "A carton of milk.", ["shopping", "A2.1"]),
    ("lemma-meenemen", "meenemen", "meenemen", "to bring along", "verb", "Kun je dat meenemen?", "Can you bring that?", ["shopping", "A2.1"]),
    ("lemma-vinden", "vinden", "vinden", "to find", "verb", "Waar vind ik de melk?", "Where do I find the milk?", ["shopping", "A2.1"]),
    ("lemma-wilt-u", "wilt u", "willen", "would you like (formal)", "verb", "Wilt u nog iets?", "Would you like anything else?", ["shopping", "A2.1"]),
]


def vocab_rows() -> list[dict]:
    out = []
    for vid, w, lem, tr, pos, nl, en, tags in VOCAB:
        out.append(
            {
                "id": vid,
                "word": w,
                "lemma": lem,
                "translation": tr,
                "partOfSpeech": pos,
                "example": {"nl": nl, "en": en},
                "tags": tags,
                "metadata": {},
            }
        )
    return out


META = {
    "contentFormatVersion": 1,
    "spine": "a2-m02",
    "stage6ReferenceModule": True,
    "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
}


def lesson_l01() -> dict:
    gid = "a2-m02-l01-listening-supermarket-gist"
    return {
        "id": gid,
        "moduleId": MID,
        "title": "Listening · In the supermarket · catch the gist",
        "lessonType": "input",
        "order": 0,
        "cefrLevel": "A2",
        "durationEstimate": 14,
        "grammarTargets": ["a2.1-present-tense"],
        "vocabTargets": ["lemma-supermarkt", "lemma-mandje", "lemma-kassa", "lemma-aanbieding", "lemma-vers"],
        "canDoStatements": [
            "I can follow a short supermarket exchange and catch the main topic.",
            "I can spot price and product words in context.",
        ],
        "steps": [
            {
                "id": "m02-l01-preview",
                "type": "preview",
                "prompt": "Swipe — supermarkt",
                "content": {
                    "previewItems": [
                        {"id": "m02-l01-p1", "word": "supermarkt", "lemma": "supermarkt", "translationEn": "supermarket", "emoji": "🛒"},
                        {"id": "m02-l01-p2", "word": "mandje", "lemma": "mandje", "translationEn": "basket", "emoji": "🧺"},
                        {"id": "m02-l01-p3", "word": "kassa", "lemma": "kassa", "translationEn": "checkout", "emoji": "💳"},
                        {"id": "m02-l01-p4", "word": "aanbieding", "lemma": "aanbieding", "translationEn": "offer", "emoji": "🏷️"},
                        {"id": "m02-l01-p5", "word": "vers", "lemma": "vers", "translationEn": "fresh", "emoji": "🥬"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m02-l01-listen",
                "type": "listening",
                "prompt": "Luister — eerst globaal",
                "content": {
                    "dialogue": [
                        {"speaker": "Medewerker", "nl": "Goedemiddag. Neemt u een mandje bij de ingang?", "en": "Good afternoon. Will you take a basket at the entrance?"},
                        {"speaker": "Klant", "nl": "Ja, dank u. Waar is de melk?", "en": "Yes, thank you. Where is the milk?"},
                        {"speaker": "Medewerker", "nl": "Gangpad drie, rechts. Vandaag is de kaas in de aanbieding.", "en": "Aisle three, on the right. Today the cheese is on offer."},
                        {"speaker": "Klant", "nl": "Perfect. En vers brood?", "en": "Perfect. And fresh bread?"},
                        {"speaker": "Medewerker", "nl": "Bij de bakkerijhoek, naast de kassa.", "en": "At the bakery corner, next to the checkout."},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"hint": "Luister naar *aanbieding* en *kassa*.", "errorTags": ["listening"]},
                "exercises": [
                    mcq("m02-l01-l1", "Waar gaat dit gesprek vooral over?", ["In de supermarkt: producten en plekken", "Op het station", "Bij de dokter"], "In de supermarkt: producten en plekken"),
                    mcq("m02-l01-l2", "Waar is de melk volgens de medewerker?", ["Gangpad drie", "Bij de kassa alleen", "Buiten"], "Gangpad drie"),
                    mcq("m02-l01-l3", 'Wat is er "in de aanbieding"?', ["Kaas", "Brood", "Koffie"], "Kaas"),
                    mcq("m02-l01-l4", "Waar is vers brood?", ["Bij de bakkerijhoek", "In gangpad tien", "Bij de ingang"], "Bij de bakkerijhoek"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l01-discovery",
                "type": "discovery",
                "prompt": "Tik — nuttige brokken",
                "content": {
                    "phrases": [
                        {"nl": "Neemt u een mandje?", "en": "Will you take a basket?", "focus": "mandje"},
                        {"nl": "Vandaag is de kaas in de aanbieding.", "en": "Today the cheese is on offer.", "focus": "aanbieding"},
                        {"nl": "Bij de bakkerijhoek.", "en": "At the bakery corner.", "focus": "bakkerij"},
                        {"nl": "Waar vind ik de melk?", "en": "Where do I find the milk?", "focus": "Waar"},
                    ]
                },
                "metadata": {},
            },
            {
                "id": "m02-l01-pl1",
                "type": "practice_loop",
                "prompt": "Herkennen — 6×",
                "content": {"lemmas": ["supermarkt", "melk", "kaas"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["vocab"]},
                "exercises": [
                    mcq("m02-l01-pa1", "Welke zin hoort bij een winkelmedewerker?", ["Neemt u een mandje?", "Tot morgen op kantoor.", "Ik ga slapen."], "Neemt u een mandje?"),
                    mcq("m02-l01-pa2", "Wat betekent *in de aanbieding* ongeveer?", ["In actie / goedkoper", "Gesloten", "Zonder prijs"], "In actie / goedkoper"),
                    fb("m02-l01-pa3", "Vul in: Vandaag is de ___ in de aanbieding.", ["kaas", "trein", "regen"], "kaas"),
                    ro("m02-l01-pa4", "Zet in de juiste volgorde.", ["melk", "Waar", "is", "de", "?"], "Waar is de melk?"),
                    mcq("m02-l01-pa5", "Welk woord past bij “vers”?", ["Brood van vandaag", "Oud brood", "Plastic"], "Brood van vandaag"),
                    mcq("m02-l01-pa6", "Synoniem van *kassa* in deze context?", ["Waar je betaalt", "Waar je slaapt", "Waar je studeert"], "Waar je betaalt"),
                ],
                "metadata": {},
            },
            {
                "id": "m02-l01-grammar",
                "type": "grammar_card",
                "prompt": "Mini-regel",
                "content": {
                    "title": "Korte zinnen in de winkel",
                    "summary": "Vragen met **Waar** / **Hoeveel**; beleefd met **u** bij de medewerker.",
                    "examples": [
                        {"nl": "Waar vind ik de melk?", "en": "Where do I find the milk?"},
                        {"nl": "Hoeveel kost dit?", "en": "How much does this cost?"},
                    ],
                },
                "feedbackConfig": {"hint": "Let op vraagwoord eerst."},
                "metadata": {},
            },
            {
                "id": "m02-l01-pl2",
                "type": "practice_loop",
                "prompt": "Nog een ronde — 6×",
                "content": {"lemmas": ["kassa", "mandje", "brood"]},
                "interactionConfig": {"delimiter": " "},
                "feedbackConfig": {"errorTags": ["grammar", "vocab"]},
                "exercises": [
                    mcq("m02-l01-pb1", "Welke vraag is beleefd in een winkel?", ["Waar vind ik …?", "Jij melk waar?", "Melk waar jij?"], "Waar vind ik …?"),
                    fb("m02-l01-pb2", "___ vind ik het brood? (plek)", ["Waar", "Hoe", "Wie"], "Waar"),
                    ro("m02-l01-pb3", "Zet in de juiste volgorde.", ["de", "kassa", "bij", "Ik", "betaal"], "Ik betaal bij de kassa"),
                    mcq("m02-l01-pb4", "Wat vraag je als je de prijs wilt weten?", ["Hoeveel kost dit?", "Hoe gaat het?", "Waar woon je?"], "Hoeveel kost dit?"),
                    mcq(
                        "m02-l01-pb5",
                        "Jij bent de klant. De medewerker helpt je. Wat zeg jij het meest natuurlijk?",
                        ["Dank u wel.", "Graag gedaan.", "Jij bent welkom."],
                        "Dank u wel.",
                    ),
                    fb("m02-l01-pb6", "Ik neem een ___ bij de ingang. (klein mand)", ["mandje", "huis", "trein"], "mandje"),
                ],
                "metadata": {"depthLayer": "m02-v2"},
            },
            {
                "id": "m02-l01-mcq",
                "type": "mcq",
                "prompt": "Snel antwoord",
                "feedbackConfig": {"incorrectFeedback": "Denk aan een korte, vriendelijke winkelreactie.", "errorTags": ["register"]},
                "exercises": [mcq("m02-l01-mcq1", 'Medewerker: “Goedemiddag.” Jij:', ["Goedemiddag.", "Ik ben moe.", "Tot gisteren."], "Goedemiddag.", "A2_mid")],
                "metadata": {},
            },
            {
                "id": "m02-l01-sp1",
                "type": "speaking",
                "prompt": "Zeg het hardop",
                "content": {"targetNl": "Waar vind ik de melk?", "acceptable": ["Waar vind ik de melk", "waar vind ik de melk"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Waar vind ik de melk"},
                "feedbackConfig": {"pronunciationTips": "Stress op *Waar* en *melk*."},
                "metadata": {},
            },
            {
                "id": "m02-l01-sp2",
                "type": "speaking",
                "prompt": "Variatie — prijs",
                "content": {"targetNl": "Hoeveel kost dit?", "acceptable": ["Hoeveel kost dit", "hoeveel kost dit"], "maxRecordingSeconds": 26},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Hoeveel kost dit"},
                "metadata": {},
            },
            {
                "id": "m02-l01-sp3",
                "type": "speaking",
                "prompt": "Beleefd afsluiten",
                "content": {"targetNl": "Dank u wel, tot ziens.", "acceptable": ["Dank u wel tot ziens", "dank u wel"], "maxRecordingSeconds": 28},
                "interactionConfig": {"requiresMicrophone": False, "mockTranscript": "Dank u wel"},
                "metadata": {},
            },
            {
                "id": "m02-l01-recap",
                "type": "recap",
                "prompt": "Laatste ronde",
                "content": {
                    "lemmas": ["supermarkt", "kassa", "aanbieding"],
                    "tasks": [
                        {
                            "kind": "listen_mcq",
                            "question": "De medewerker zegt:",
                            "snippetNl": "Vandaag is de kaas in de aanbieding.",
                            "options": ["Er is actie op kaas.", "De winkel is dicht.", "Het regent."],
                            "correctAnswer": "Er is actie op kaas.",
                        },
                        {"kind": "fill_blank", "sentence": "Ik betaal bij de ___.", "options": ["kassa", "ochtend", "weekend"], "correctAnswer": "kassa"},
                        {"kind": "reorder", "tokens": ["vind", "ik", "Waar", "de", "melk", "?"], "correctAnswer": "Waar vind ik de melk?"},
                        {"kind": "speak", "prompt": "Zeg: *Hoeveel kost dit?*", "targetNl": "Hoeveel kost dit?", "mockPass": True},
                        {
                            "kind": "listen_mcq",
                            "question": "Klant zoekt:",
                            "snippetNl": "Waar is vers brood?",
                            "options": ["Brood.", "Een treinkaartje.", "Een dokter."],
                            "correctAnswer": "Brood.",
                        },
                        {"kind": "fill_blank", "sentence": "Neemt u een ___?", "options": ["mandje", "station", "boek"], "correctAnswer": "mandje"},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["listening", "vocab"],
        "metadata": {**{"stage6": True, "schemaPlayer": True, "archetype": "input_a", "lessonDepth": {"m02": "v2", "targetMicroInteractions": "28-38"}}},
    }


def main() -> None:
    import sys

    sys.path.insert(0, str(Path(__file__).parent))
    from m02_lessons_rest import (
        lesson_l02,
        lesson_l03,
        lesson_l04,
        lesson_l05,
        lesson_l06,
        lesson_l07,
        lesson_l08,
        lesson_l09,
        lesson_l10,
        lesson_l11,
    )

    lessons = [
        lesson_l01(),
        lesson_l02(),
        lesson_l03(),
        lesson_l04(),
        lesson_l05(),
        lesson_l06(),
        lesson_l07(),
        lesson_l08(),
        lesson_l09(),
        lesson_l10(),
        lesson_l11(),
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    mod = {
        "id": MID,
        "title": "Food & shopping",
        "band": "A2.1",
        "description": "Practical A2.1 Dutch for supermarkets, markets, bakeries, cafés: polite requests (mag/kan/wil), prices, quantities, paying, and short shopping dialogues. Stage 6 module with lesson depth v2 loops.",
        "order": 1,
        "lessons": lessons,
        "grammarTargets": GRAMMAR,
        "vocabTargets": vocab_rows(),
        "learningGoals": [
            "Ask for common groceries politely and understand simple answers",
            "Handle price, quantity, and payment phrases in routine contexts",
            "Use short present-tense lines with modals in service transactions",
            "Complete a simple shopping interaction from start to finish",
        ],
        "metadata": META,
    }
    OUT.write_text(json.dumps(mod, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
