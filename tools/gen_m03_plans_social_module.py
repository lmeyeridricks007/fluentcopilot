#!/usr/bin/env python3
"""Generate content/modules/a2-m03-plans-social-life/module.json (Stage 6 depth v2)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

MID = "a2-m03-plans-social-life"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/modules/a2-m03-plans-social-life/module.json"

LM = {
    "stage6": True,
    "schemaPlayer": True,
    "lessonDepth": {"m03": "v2", "targetMicroInteractions": "28-38"},
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


def speak_step(
    sid: str,
    prompt: str,
    target: str,
    acceptable: list[str],
    mock: str,
    seconds: int = 28,
    tips: str | None = None,
) -> dict:
    out = {
        "id": sid,
        "type": "speaking",
        "prompt": prompt,
        "content": {"targetNl": target, "acceptable": acceptable, "maxRecordingSeconds": seconds},
        "interactionConfig": {"requiresMicrophone": False, "mockTranscript": mock},
        "metadata": {},
    }
    if tips:
        out["feedbackConfig"] = {"pronunciationTips": tips}
    return out


GRAMMAR = [
    {
        "id": "a2.1-invitations-patterns",
        "name": "Invitations & suggestions",
        "description": "Heb je zin om … / Zullen we … / Ga je mee — high-frequency plan chunks.",
        "examples": [
            {"nl": "Heb je zin om koffie te drinken?", "en": "Fancy a coffee?"},
            {"nl": "Zullen we morgen samen lunchen?", "en": "Shall we have lunch together tomorrow?"},
            {"nl": "Ga je mee naar de film?", "en": "Are you coming to the cinema?"},
        ],
        "cefrLevel": "A2",
        "rules": {"note": "Informal je/jij with friends; polite u in service contexts."},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.1-linking-connectors",
        "name": "Linking: en / maar / want / omdat",
        "description": "Connect two short ideas: contrast (maar), reason (want, omdat), addition (en).",
        "examples": [
            {"nl": "Ik wil wel, maar ik heb geen tijd.", "en": "I'd like to, but I don't have time."},
            {"nl": "Ik kan niet, want ik werk laat.", "en": "I can't, because I'm working late."},
            {"nl": "Ik kom, omdat ik je wil zien.", "en": "I'm coming because I want to see you."},
        ],
        "cefrLevel": "A2",
        "rules": {"want": "main clause + want + reason", "omdat": "subclause can flip word order"},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.1-plans-time-phrases",
        "name": "Plans & time references",
        "description": "morgen, vanavond, straks, dit weekend, zaterdag — simple future-ish framing without heavy tense.",
        "examples": [
            {"nl": "Vanavond heb ik tijd.", "en": "I'm free tonight."},
            {"nl": "Straks bel ik je.", "en": "I'll call you in a bit."},
            {"nl": "Zullen we zaterdag afspreken?", "en": "Shall we meet on Saturday?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.1-present-tense",
        "name": "Present tense in social plans",
        "description": "Statements and questions about availability and wishes.",
        "examples": [
            {"nl": "Ik heb al plannen.", "en": "I already have plans."},
            {"nl": "Wanneer heb je tijd?", "en": "When are you free?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.1-questions-basics",
        "name": "Questions in invitations",
        "description": "Hoe laat? Waar? Wanneer? — follow-up in short chats.",
        "examples": [
            {"nl": "Hoe laat treffen we elkaar?", "en": "What time shall we meet?"},
            {"nl": "Waar spreken we af?", "en": "Where shall we meet?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
]

VOCAB = [
    ("lemma-plan", "plan", "plan", "plan", "noun"),
    ("lemma-afspreken", "afspreken", "afspreken", "to arrange to meet", "verb"),
    ("lemma-vanavond", "vanavond", "vanavond", "tonight", "adv"),
    ("lemma-morgen", "morgen", "morgen", "tomorrow", "adv"),
    ("lemma-straks", "straks", "straks", "later / in a bit", "adv"),
    ("lemma-zin", "zin", "zin", "inclination (heb je zin)", "noun"),
    ("lemma-tijd", "tijd", "tijd", "time", "noun"),
    ("lemma-mee", "mee", "mee", "along (with)", "adv"),
    ("lemma-leuk", "leuk", "leuk", "nice / fun", "adj"),
    ("lemma-want", "want", "want", "because (coord.)", "conj"),
    ("lemma-omdat", "omdat", "omdat", "because (subord.)", "conj"),
    ("lemma-misschien", "misschien", "misschien", "maybe", "adv"),
    ("lemma-cafe", "café", "café", "café", "noun"),
    ("lemma-film", "film", "film", "film", "noun"),
    ("lemma-vriend", "vriend", "vriend", "friend", "noun"),
    ("lemma-bericht", "bericht", "bericht", "message", "noun"),
    ("lemma-helaas", "helaas", "helaas", "unfortunately", "adv"),
    ("lemma-graag", "graag", "graag", "gladly / please", "adv"),
    ("lemma-samen", "samen", "samen", "together", "adv"),
    ("lemma-weekend", "weekend", "weekend", "weekend", "noun"),
    ("lemma-koffie", "koffie", "koffie", "coffee", "noun"),
    ("lemma-laten", "laten", "laten", "to let / let's", "verb"),
    ("lemma-kunnen", "kunnen", "kunnen", "can / to be able", "verb"),
    ("lemma-zullen", "zullen", "zullen", "shall / will (modal)", "verb"),
    ("lemma-waar", "waar", "waar", "where", "adv"),
    ("lemma-hoelaat", "hoe laat", "hoe laat", "what time", "phrase"),
]


def vocab_targets() -> list[dict]:
    out = []
    for vid, word, lemma, trans, pos in VOCAB:
        out.append(
            {
                "id": vid,
                "word": word,
                "lemma": lemma,
                "translation": trans,
                "partOfSpeech": pos,
                "metadata": {"module": MID},
            }
        )
    return out


def pl(loop_id: str, prompt: str, lemmas: list[str], exercises: list[dict], depth: bool = False) -> dict:
    d: dict = {
        "id": loop_id,
        "type": "practice_loop",
        "prompt": prompt,
        "content": {"lemmas": lemmas},
        "interactionConfig": {"delimiter": " "},
        "feedbackConfig": {"errorTags": ["grammar"]},
        "exercises": exercises,
        "metadata": {},
    }
    if depth:
        d["metadata"] = {"depthLayer": "m03-v2"}
    return d


def lessons() -> list[dict]:
    # --- L01 ---
    l01 = {
        "id": "a2-m03-l01-listening-making-plans-gist",
        "moduleId": MID,
        "title": "Listening · Making plans · catch the gist",
        "lessonType": "input",
        "order": 0,
        "cefrLevel": "A2",
        "durationEstimate": 14,
        "grammarTargets": ["a2.1-plans-time-phrases", "a2.1-present-tense"],
        "vocabTargets": ["lemma-vanavond", "lemma-morgen", "lemma-cafe", "lemma-film", "lemma-afspreken"],
        "canDoStatements": [
            "I can follow a short chat about meeting up and catch who/when/where.",
            "I can recognise invitation and reply chunks.",
        ],
        "steps": [
            {
                "id": "m03-l01-preview",
                "type": "preview",
                "prompt": "Plannen — 5 woorden",
                "content": {
                    "previewItems": [
                        {"id": "m03-l01-p1", "word": "afspreken", "lemma": "afspreken", "translationEn": "to meet up", "emoji": "🤝"},
                        {"id": "m03-l01-p2", "word": "vanavond", "lemma": "vanavond", "translationEn": "tonight", "emoji": "🌙"},
                        {"id": "m03-l01-p3", "word": "morgen", "lemma": "morgen", "translationEn": "tomorrow", "emoji": "📅"},
                        {"id": "m03-l01-p4", "word": "café", "lemma": "café", "translationEn": "café", "emoji": "☕"},
                        {"id": "m03-l01-p5", "word": "film", "lemma": "film", "translationEn": "film", "emoji": "🎬"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m03-l01-listen",
                "type": "listening",
                "prompt": "Luister — appje over het weekend",
                "content": {
                    "dialogue": [
                        {"speaker": "Sam", "nl": "Hoi! Heb je zin om zaterdag iets te doen?", "en": "Hi! Fancy doing something on Saturday?"},
                        {"speaker": "Lisa", "nl": "Ja, leuk! Wat wil je doen?", "en": "Yes, fun! What do you want to do?"},
                        {"speaker": "Sam", "nl": "Misschien een film? Of koffie in het café.", "en": "Maybe a film? Or coffee at a café."},
                        {"speaker": "Lisa", "nl": "Koffie klinkt goed. Hoe laat?", "en": "Coffee sounds good. What time?"},
                        {"speaker": "Sam", "nl": "Om drie uur? Bij Station café.", "en": "At three? At Station café."},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m03-l01-l1", "Waar gaat het gesprek over?", ["Afspraken maken", "Boodschappen", "Een sollicitatie"], "Afspraken maken"),
                    mcq("m03-l01-l2", "Wat stelt Sam voor?", ["Een film of koffie", "Alleen sporten", "Naar huis gaan"], "Een film of koffie"),
                    mcq("m03-l01-l3", "Wat kiest Lisa?", ["Koffie", "Een film", "Niets"], "Koffie"),
                    mcq("m03-l01-l4", "Waar spreken ze af?", ["Bij Station café", "Thuis bij Lisa", "In de supermarkt"], "Bij Station café"),
                    mcq("m03-l01-l5", "Hoe laat ongeveer?", ["Om drie uur", "Om acht uur 's ochtends", "Om middernacht"], "Om drie uur"),
                ],
                "metadata": {},
            },
            {
                "id": "m03-l01-discovery",
                "type": "discovery",
                "prompt": "Tik — vaste brokken",
                "content": {
                    "phrases": [
                        {"nl": "Heb je zin om …?", "en": "Fancy …?", "focus": "zin"},
                        {"nl": "Dat klinkt leuk!", "en": "That sounds fun!", "focus": "leuk"},
                        {"nl": "Hoe laat?", "en": "What time?", "focus": "laat"},
                        {"nl": "Waar spreken we af?", "en": "Where shall we meet?", "focus": "afspreken"},
                    ]
                },
                "metadata": {},
            },
            pl(
                "m03-l01-pl1",
                "Begrip — 6×",
                ["vanavond", "film", "café"],
                [
                    mcq("m03-l01-a1", "Welke zin is een uitnodiging?", ["Heb je zin om te komen?", "Ik ben moe.", "Het regent."], "Heb je zin om te komen?"),
                    mcq("m03-l01-a2", "Wat betekent *Dat klinkt leuk!*?", ["Ik vind het een goed idee.", "Ik ben boos.", "Ik weet het niet."], "Ik vind het een goed idee."),
                    fb("m03-l01-a2b", "___ je zin om koffie? (informeel)", ["Heb", "Ben", "Word"], "Heb"),
                    ro("m03-l01-a3", "Zet in de juiste volgorde.", ["laat", "Hoe", "?"], "Hoe laat?"),
                    mcq("m03-l01-a4", "Welk woord hoort bij *misschien*?", ["Misschien later.", "Altijd nu.", "Nooit morgen."], "Misschien later."),
                    mcq("m03-l01-a5", "Natuurlijke reactie op een leuk plan", ["Ja, graag!", "Ik ben een trein.", "Tot volgend jaar."], "Ja, graag!"),
                ],
            ),
            pl(
                "m03-l01-pl2",
                "Variatie — 6×",
                ["morgen", "straks", "tijd"],
                [
                    mcq("m03-l01-b1", "Welke vraag hoort bij plannen?", ["Wanneer heb je tijd?", "Hoeveel kost brood?", "Waar is je sok?"], "Wanneer heb je tijd?"),
                    fb("m03-l01-b2", "Zullen we ___ samen lunchen? (dag)", ["morgen", "gisteren", "ooit"], "morgen"),
                    ro("m03-l01-b3", "Zet in de juiste volgorde.", ["af", "Waar", "spreken", "we", "?"], "Waar spreken we af?"),
                    mcq("m03-l01-b4", "Welke context is informeel?", ["Hoi! Zin in koffie?", "Geachte heer, gaat u mee?", "Dames en heren, stilte."], "Hoi! Zin in koffie?"),
                    mcq("m03-l01-b5", "Wat vraag je na een idee?", ["Hoe laat?", "Hoeveel kilo?", "Waar is de melk?"], "Hoe laat?"),
                    mcq("m03-l01-b6", "Welke zin sluit vriendelijk af?", ["Tot dan!", "Tot de maan!", "Ik ben de koffie."], "Tot dan!"),
                ],
                depth=True,
            ),
            speak_step(
                "m03-l01-sp1",
                "Zeg de uitnodiging",
                "Heb je zin om zaterdag koffie te drinken?",
                ["Heb je zin om zaterdag koffie te drinken", "heb je zin om zaterdag koffie te drinken"],
                "Heb je zin om zaterdag koffie te drinken",
                30,
                "Rustig: *zin om*.",
            ),
            speak_step(
                "m03-l01-sp2",
                "Positieve reactie",
                "Dat klinkt leuk!",
                ["Dat klinkt leuk", "dat klinkt leuk"],
                "Dat klinkt leuk",
            ),
            speak_step(
                "m03-l01-sp3",
                "Tijd vragen",
                "Hoe laat?",
                ["Hoe laat", "hoe laat"],
                "Hoe laat",
            ),
            {
                "id": "m03-l01-recap",
                "type": "recap",
                "prompt": "Recap",
                "content": {
                    "lemmas": ["zin", "vanavond", "afspreken"],
                    "tasks": [
                        {
                            "kind": "listen_mcq",
                            "question": "Je hoort:",
                            "snippetNl": "Heb je zin om zaterdag iets te doen?",
                            "options": ["Een uitnodiging.", "Een klacht.", "Een recept."],
                            "correctAnswer": "Een uitnodiging.",
                        },
                        {"kind": "fill_blank", "sentence": "Dat klinkt ___! (positief)", "options": ["leuk", "traag", "duur"], "correctAnswer": "leuk"},
                        {"kind": "reorder", "tokens": ["spreken", "Waar", "we", "af", "?"], "correctAnswer": "Waar spreken we af?"},
                        {"kind": "speak", "prompt": "Zeg: *Misschien morgen.*", "targetNl": "Misschien morgen.", "mockPass": True},
                        {
                            "kind": "listen_mcq",
                            "question": "Toon:",
                            "snippetNl": "Om drie uur? Bij Station café.",
                            "options": ["Tijd + plek.", "Alleen het weer.", "Een treinschema."],
                            "correctAnswer": "Tijd + plek.",
                        },
                        {"kind": "fill_blank", "sentence": "___ laat? (vraag)", "options": ["Hoe", "Waar", "Wie"], "correctAnswer": "Hoe"},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["listening", "vocab"],
        "metadata": {**LM, "archetype": "input_gist"},
    }

    # --- L02 listen_read ---
    l02 = {
        "id": "a2-m03-l02-listen-read-invitations-replies",
        "moduleId": MID,
        "title": "Listening & reading · Invitations & replies",
        "lessonType": "input",
        "order": 1,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.1-invitations-patterns", "a2.1-present-tense"],
        "vocabTargets": ["lemma-zin", "lemma-graag", "lemma-helaas", "lemma-misschien", "lemma-plan"],
        "canDoStatements": [
            "I can read short invitation lines and pick natural accept/decline replies.",
            "I can match follow-up questions to the situation.",
        ],
        "steps": [
            {
                "id": "m03-l02-preview",
                "type": "preview",
                "prompt": "Snel — 5 woorden",
                "content": {
                    "previewItems": [
                        {"id": "m03-l02-p1", "word": "uitnodigen", "lemma": "uitnodigen", "translationEn": "to invite", "emoji": "✉️"},
                        {"id": "m03-l02-p2", "word": "helaas", "lemma": "helaas", "translationEn": "unfortunately", "emoji": "😕"},
                        {"id": "m03-l02-p3", "word": "misschien", "lemma": "misschien", "translationEn": "maybe", "emoji": "🤔"},
                        {"id": "m03-l02-p4", "word": "graag", "lemma": "graag", "translationEn": "gladly", "emoji": "👍"},
                        {"id": "m03-l02-p5", "word": "plan", "lemma": "plan", "translationEn": "plan", "emoji": "📋"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m03-l02-listen-read",
                "type": "listen_read",
                "prompt": "Lees en luister — collega's na werk",
                "content": {
                    "dialogue": [
                        {"speaker": "Tom", "nl": "Zullen we vanavond nog een drankje doen?", "en": "Shall we have a drink tonight?"},
                        {"speaker": "Noa", "nl": "Leuk idee! Waar?", "en": "Nice idea! Where?"},
                        {"speaker": "Tom", "nl": "Bij De Buurman, om half zeven?", "en": "At De Buurman, at half past six?"},
                        {"speaker": "Noa", "nl": "Helaas, ik moet vroeg naar huis. Misschien morgen?", "en": "Unfortunately, I have to go home early. Maybe tomorrow?"},
                        {"speaker": "Tom", "nl": "Prima. Dan spreken we morgen af.", "en": "Fine. Then we'll arrange tomorrow."},
                    ]
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m03-l02-e1", "Waar gaat dit over?", ["Iets afspreken na werk", "Een verhuizing", "Een doktersbezoek"], "Iets afspreken na werk"),
                    mcq("m03-l02-e2", "Wat stelt Tom voor?", ["Een drankje vanavond", "Een marathon", "Overwerk tot middernacht"], "Een drankje vanavond"),
                    mcq("m03-l02-e3", "Waar wil Tom afspreken?", ["Bij De Buurman", "Op kantoor", "In het ziekenhuis"], "Bij De Buurman"),
                    mcq("m03-l02-e4", "Waarom kan Noa niet?", ["Ze moet vroeg naar huis", "Ze houdt niet van Tom", "Ze is op vakantie"], "Ze moet vroeg naar huis"),
                    mcq("m03-l02-e5", "Wat stelt Noa voor als alternatief?", ["Misschien morgen", "Nooit meer", "Alleen in de zomer"], "Misschien morgen"),
                ],
                "metadata": {},
            },
            {
                "id": "m03-l02-discovery",
                "type": "discovery",
                "prompt": "Herhaal — reacties",
                "content": {
                    "phrases": [
                        {"nl": "Zullen we …?", "en": "Shall we …?", "focus": "Zullen"},
                        {"nl": "Helaas, ik kan niet.", "en": "Unfortunately, I can't.", "focus": "Helaas"},
                        {"nl": "Misschien later.", "en": "Maybe later.", "focus": "Misschien"},
                    ]
                },
                "metadata": {},
            },
            pl(
                "m03-l02-pl1",
                "Beste antwoord — 6×",
                ["helaas", "misschien", "zullen"],
                [
                    mcq("m03-l02-p1", "Beleefd accepteren", ["Ja, leuk idee!", "Ik ben een idee.", "Nee, nooit."], "Ja, leuk idee!"),
                    mcq("m03-l02-p2", "Beleefd weigeren + reden", ["Helaas, ik heb al plannen.", "Ja, altijd alles.", "Ik ben de planning."], "Helaas, ik heb al plannen."),
                    ro("m03-l02-p3", "Zet in de juiste volgorde.", ["we", "Zullen", "koffie", "?", "drinken"], "Zullen we koffie drinken?"),
                    mcq("m03-l02-p4", "Welke vraag komt vaak na een uitnodiging?", ["Waar?", "Hoeveel kilo?", "Wat kost een fiets?"], "Waar?"),
                    fb("m03-l02-p5", "___ ik kan niet. (teleurstelling)", ["Helaas", "Graag", "Vandaag"], "Helaas"),
                    mcq("m03-l02-p6", "Natuurlijk Nederlands", ["Prima, tot morgen!", "Prima, tot gisteren!", "Prima, ik ben morgen."], "Prima, tot morgen!"),
                ],
            ),
            {
                "id": "m03-l02-fill",
                "type": "fill_blank",
                "prompt": "Mini-zin",
                "content": {"followUpReorder": {"tokens": ["ik", "heb", "al", "plannen", "."], "correctAnswer": "Ik heb al plannen."}},
                "feedbackConfig": {"errorTags": ["word-order"]},
                "exercises": [fb("m03-l02-f1", "Ik kan niet, ___ ik werk laat. (reden)", ["want", "maar", "en"], "want")],
                "metadata": {},
            },
            pl(
                "m03-l02-pl2",
                "Nog een ronde — 6×",
                ["want", "omdat", "maar"],
                [
                    mcq("m03-l02-q1", "Welke zin geeft een tegenstelling?", ["Ik wil wel, maar ik ben moe.", "Ik wil wel en ik ben moe.", "Ik wil wel want ik ben moe."], "Ik wil wel, maar ik ben moe."),
                    mcq("m03-l02-q2", "Welk woord geeft vaak een simpele reden?", ["want", "en", "of"], "want"),
                    fb("m03-l02-q3", "Ik kom niet, ___ ik ben ziek. (reden, informeel)", ["want", "maar", "dus"], "want"),
                    ro("m03-l02-q4", "Zet in de juiste volgorde.", ["niet", "Ik", "kan", "vandaag", "."], "Ik kan vandaag niet."),
                    mcq("m03-l02-q5", "Welke reactie is vriendelijk?", ["Misschien een andere keer?", "Nooit meer praten.", "Ik wil niet met jou."], "Misschien een andere keer?"),
                    mcq("m03-l02-q6", "Welke zin hoort bij *Zullen we …?*", ["Zullen we naar het park?", "Zullen we een dokter zijn?", "Zullen we de maan?"], "Zullen we naar het park?"),
                ],
                depth=True,
            ),
            speak_step(
                "m03-l02-sp1",
                "Zeg: Zullen we …",
                "Zullen we vanavond afspreken?",
                ["Zullen we vanavond afspreken", "zullen we vanavond afspreken"],
                "Zullen we vanavond afspreken",
            ),
            speak_step(
                "m03-l02-sp2",
                "Weigeren + reden",
                "Helaas, ik kan niet, want ik werk laat.",
                ["Helaas ik kan niet want ik werk laat", "helaas ik kan niet want ik werk laat"],
                "Helaas ik kan niet want ik werk laat",
                32,
            ),
            speak_step(
                "m03-l02-sp3",
                "Alternatief voorstellen",
                "Misschien morgen?",
                ["Misschien morgen", "misschien morgen"],
                "Misschien morgen",
            ),
            {
                "id": "m03-l02-recap",
                "type": "recap",
                "prompt": "Check",
                "content": {
                    "lemmas": ["zullen", "helaas", "want"],
                    "tasks": [
                        {
                            "kind": "listen_mcq",
                            "question": "Tom zegt:",
                            "snippetNl": "Zullen we vanavond nog een drankje doen?",
                            "options": ["Een voorstel / uitnodiging.", "Een klacht over werk.", "Een weerbericht."],
                            "correctAnswer": "Een voorstel / uitnodiging.",
                        },
                        {"kind": "fill_blank", "sentence": "Helaas, ik heb al ___.", "options": ["plannen", "koffie", "zon"], "correctAnswer": "plannen"},
                        {"kind": "reorder", "tokens": ["we", "Zullen", "morgen", "lunchen", "?"], "correctAnswer": "Zullen we morgen lunchen?"},
                        {"kind": "speak", "prompt": "Zeg: *Ik kan niet, want ik ben moe.*", "targetNl": "Ik kan niet, want ik ben moe.", "mockPass": True},
                        {"kind": "fill_blank", "sentence": "___ later? (onzeker)", "options": ["Misschien", "Altijd", "Nooit"], "correctAnswer": "Misschien"},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["register", "grammar"],
        "metadata": {**LM, "archetype": "input_listen_read"},
    }

    # Continue in part 2 — placeholder to be replaced by importing or appending
    _rest = _lessons_l03_l11()
    return [l01, l02, *_rest]


def _lessons_l03_l11() -> list[dict]:
    """Lessons 3–11 (grammar through review)."""
    # --- L03 grammar invitations ---
    l03 = {
        "id": "a2-m03-l03-grammar-invitations-patterns",
        "moduleId": MID,
        "title": "Grammar & patterns · Invitations (heb je zin / zullen we / ga je mee)",
        "lessonType": "pattern",
        "order": 2,
        "cefrLevel": "A2",
        "durationEstimate": 16,
        "grammarTargets": ["a2.1-invitations-patterns", "a2.1-questions-basics"],
        "vocabTargets": ["lemma-zin", "lemma-mee", "lemma-zullen", "lemma-kunnen", "lemma-cafe"],
        "canDoStatements": [
            "I can form informal invitations with *heb je zin*, *zullen we*, and *ga je mee*.",
            "I can spot unnatural or mixed-register lines.",
        ],
        "steps": [
            {
                "id": "m03-l03-preview",
                "type": "preview",
                "prompt": "Drie patronen",
                "content": {
                    "previewItems": [
                        {"id": "m03-l03-p1", "word": "zin", "lemma": "zin", "translationEn": "fancy / feel like", "emoji": "✨"},
                        {"id": "m03-l03-p2", "word": "zullen", "lemma": "zullen", "translationEn": "shall", "emoji": "🤝"},
                        {"id": "m03-l03-p3", "word": "mee", "lemma": "mee", "translationEn": "along", "emoji": "🚶"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m03-l03-grammar",
                "type": "grammar_card",
                "prompt": "Drie manieren om iets voor te stellen",
                "content": {
                    "title": "Uitnodigen (informeel)",
                    "summary": "**Heb je zin om** + te + werkwoord · **Zullen we** + infinitief/plan · **Ga je mee** + naar/om …",
                    "examples": [
                        {"nl": "Heb je zin om te wandelen?", "en": "Fancy a walk?"},
                        {"nl": "Zullen we pizza bestellen?", "en": "Shall we order pizza?"},
                        {"nl": "Ga je mee naar het museum?", "en": "Are you coming to the museum?"},
                    ],
                },
                "feedbackConfig": {"hint": "Houd het kort en duidelijk."},
                "metadata": {},
            },
            {
                "id": "m03-l03-listen",
                "type": "listening",
                "prompt": "Luister — mini-gesprek (4 regels)",
                "content": {
                    "dialogue": [
                        {"speaker": "A", "nl": "Hé, ga je mee naar de markt zaterdag?", "en": "Hey, are you coming to the market Saturday?"},
                        {"speaker": "B", "nl": "Tuurlijk! Hoe laat?", "en": "Sure! What time?"},
                        {"speaker": "A", "nl": "Om tien uur bij de viskraam?", "en": "At ten at the fish stall?"},
                        {"speaker": "B", "nl": "Top, tot zaterdag!", "en": "Great, see you Saturday!"},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m03-l03-l1", "Welk patroon gebruikt A eerst?", ["Ga je mee …?", "Mag ik een bon?", "Hoeveel kost dit?"], "Ga je mee …?"),
                    mcq("m03-l03-l2", "Wat vraagt B als eerste vervolg?", ["Hoe laat?", "Waar woon je?", "Hoe heet je docent?"], "Hoe laat?"),
                    mcq("m03-l03-l3", "Wat stelt A voor qua tijd en plek?", ["Om tien uur bij de viskraam", "Om middernacht thuis", "Morgen op school"], "Om tien uur bij de viskraam"),
                    mcq("m03-l03-l4", "Hoe sluit B af?", ["Bevestiging + afscheid", "Een klacht", "Een prijsvraag"], "Bevestiging + afscheid"),
                ],
                "metadata": {},
            },
            speak_step(
                "m03-l03-shadow-a",
                "Zeg mee — uitnodiging (A)",
                "Hé, ga je mee naar de markt zaterdag?",
                ["Hé ga je mee naar de markt zaterdag", "he ga je mee naar de markt zaterdag"],
                "Hé ga je mee naar de markt zaterdag",
                28,
                "Natuurlijke toon, niet te snel.",
            ),
            speak_step(
                "m03-l03-shadow-b",
                "Zeg mee — reactie (B)",
                "Tuurlijk! Hoe laat?",
                ["Tuurlijk hoe laat", "Tuurlijk! Hoe laat?"],
                "Tuurlijk hoe laat",
                26,
            ),
            pl(
                "m03-l03-pl1",
                "Kies de beste zin — 6×",
                ["zin", "zullen", "mee"],
                [
                    mcq("m03-l03-a1", "Natuurlijke uitnodiging", ["Heb je zin om te gamen?", "Heb je zin gamen?", "Zin heb je gamen?"], "Heb je zin om te gamen?"),
                    mcq("m03-l03-a2", "Welke zin is vreemd?", ["Zullen we samen koken?", "Zullen we een trein zijn?", "Zullen we naar het park?"], "Zullen we een trein zijn?"),
                    ro("m03-l03-a3", "Zet in de juiste volgorde.", ["mee", "Ga", "je", "naar", "het", "park", "?"], "Ga je mee naar het park?"),
                    mcq("m03-l03-a4", "Welke vraag hoort bij vrienden?", ["Heb je zin in een filmpje?", "Wilt u uw paspoort tonen?", "Mag ik uw salaris weten?"], "Heb je zin in een filmpje?"),
                    fb("m03-l03-a5", "___ je mee naar de film? (uitnodiging)", ["Ga", "Ben", "Heb"], "Ga"),
                    mcq("m03-l03-a6", "Welke zin is een voorstel voor eten?", ["Zullen we ergens een hapje eten?", "Zullen we een dokter eten?", "Zullen we de rekening eten?"], "Zullen we ergens een hapje eten?"),
                ],
            ),
            pl(
                "m03-l03-pl2",
                "Fouten vangen — 6×",
                ["register", "woordvolgorde"],
                [
                    mcq("m03-l03-b1", "Welke zin klinkt als winkel-Nederlands bij vrienden?", ["Zullen we straks bellen?", "Zou de heer willen bellen?", "Mag ik u verzoeken te telefoneren?"], "Zullen we straks bellen?"),
                    mcq("m03-l03-b2", "Welke volgorde klopt?", ["Heb je tijd vanavond?", "Je heb tijd vanavond?", "Tijd heb je vanavond?"], "Heb je tijd vanavond?"),
                    ro("m03-l03-b3", "Zet in de juiste volgorde.", ["te", "Heb", "je", "zin", "om", "te", "komen", "?"], "Heb je zin om te komen?"),
                    mcq("m03-l03-b4", "Kies natuurlijk", ["Laten we iets leuks doen!", "Laten we iets leuks zijn!", "Laten we de maan doen!"], "Laten we iets leuks doen!"),
                    fb("m03-l03-b5", "___ we vanavond een serie kijken? (voorstel)", ["Zullen", "Ben", "Heb"], "Zullen"),
                    mcq("m03-l03-b6", "Welke reactie past?", ["Ja, goed idee!", "Ja, slecht weer!", "Ja, ik ben een idee!"], "Ja, goed idee!"),
                ],
                depth=True,
            ),
            speak_step("m03-l03-sp1", "Patroon 1 — zelf", "Heb je zin om te wandelen?", ["Heb je zin om te wandelen", "heb je zin om te wandelen"], "Heb je zin om te wandelen", 28),
            speak_step("m03-l03-sp2", "Patroon 2 — zelf", "Zullen we pizza bestellen?", ["Zullen we pizza bestellen", "zullen we pizza bestellen"], "Zullen we pizza bestellen"),
            speak_step("m03-l03-sp3", "Patroon 3 — zelf", "Ga je mee naar het café?", ["Ga je mee naar het café", "ga je mee naar het cafe"], "Ga je mee naar het café", 28),
            speak_step(
                "m03-l03-sp4",
                "Herhaal de afsluiting uit het gesprek",
                "Top, tot zaterdag!",
                ["Top tot zaterdag", "top tot zaterdag"],
                "Top tot zaterdag",
                26,
            ),
            {
                "id": "m03-l03-recap",
                "type": "recap",
                "prompt": "Recap",
                "content": {
                    "lemmas": ["zin", "zullen", "mee"],
                    "tasks": [
                        {"kind": "fill_blank", "sentence": "Heb je ___ om te komen? (zin hebben)", "options": ["zin", "trein", "brood"], "correctAnswer": "zin"},
                        {"kind": "reorder", "tokens": ["we", "Zullen", "straks", "bellen", "?"], "correctAnswer": "Zullen we straks bellen?"},
                        {"kind": "speak", "prompt": "Zeg: *Ga je mee?*", "targetNl": "Ga je mee?", "mockPass": True},
                        {
                            "kind": "listen_mcq",
                            "question": "Je hoort:",
                            "snippetNl": "Ga je mee naar de film?",
                            "options": ["Uitnodiging.", "Een prijsvraag.", "Een sollicitatie."],
                            "correctAnswer": "Uitnodiging.",
                        },
                        {
                            "kind": "listen_mcq",
                            "question": "A stelt een tijd + plek voor:",
                            "snippetNl": "Om tien uur bij de viskraam?",
                            "options": ["Tijd en ontmoetingsplek.", "Alleen een klacht.", "Een treinschema."],
                            "correctAnswer": "Tijd en ontmoetingsplek.",
                        },
                        {"kind": "reorder", "tokens": ["Tuurlijk", "!", "Hoe", "laat", "?"], "correctAnswer": "Tuurlijk! Hoe laat?"},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["grammar", "register"],
        "metadata": {**LM, "archetype": "grammar_pattern"},
    }

    # L04 practice
    l04 = {
        "id": "a2-m03-l04-practice-questions-responses",
        "moduleId": MID,
        "title": "Controlled practice · Questions & responses",
        "lessonType": "practice",
        "order": 3,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.1-questions-basics", "a2.1-invitations-patterns"],
        "vocabTargets": ["lemma-hoelaat", "lemma-waar", "lemma-tijd", "lemma-weekend", "lemma-samen"],
        "canDoStatements": [
            "I can match follow-up questions to natural answers.",
            "I can fix word order in short plan questions.",
        ],
        "steps": [
            {
                "id": "m04-preview",
                "type": "preview",
                "prompt": "Vragen",
                "content": {
                    "previewItems": [
                        {"id": "m04-p1", "word": "wanneer", "lemma": "wanneer", "translationEn": "when", "emoji": "⏰"},
                        {"id": "m04-p2", "word": "waar", "lemma": "waar", "translationEn": "where", "emoji": "📍"},
                        {"id": "m04-p3", "word": "hoe laat", "lemma": "hoe laat", "translationEn": "what time", "emoji": "🕒"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m04-discovery",
                "type": "discovery",
                "prompt": "Tik — plannen",
                "content": {
                    "phrases": [
                        {"nl": "Wanneer heb je tijd?", "en": "When are you free?", "focus": "Wanneer"},
                        {"nl": "Waar spreken we af?", "en": "Where shall we meet?", "focus": "Waar"},
                        {"nl": "Hoe laat ben je daar?", "en": "What time will you be there?", "focus": "Hoe laat"},
                    ]
                },
                "metadata": {},
            },
            pl(
                "m04-pl1",
                "Vraag ↔ antwoord — 6×",
                ["wanneer", "waar", "tijd"],
                [
                    mcq("m04-a1", "Beste antwoord op *Wanneer heb je tijd?*", ["Donderdagavond kan ik.", "Ik ben een donderdag.", "Donderdag is mooi weer."], "Donderdagavond kan ik."),
                    mcq("m04-a2", "Beste antwoord op *Waar spreken we af?*", ["Bij de ingang van het station.", "Bij de maan.", "Waar is de tijd?"], "Bij de ingang van het station."),
                    ro("m04-a3", "Zet in de juiste volgorde.", ["heb", "je", "Wanneer", "tijd", "?"], "Wanneer heb je tijd?"),
                    mcq("m04-a4", "Welke vraag hoort bij een afspraak?", ["Hoe laat ben je daar?", "Hoeveel kost een kilo?", "Waar is je schoenmaat?"], "Hoe laat ben je daar?"),
                    fb("m04-a5", "___ spreken we af? (plek)", ["Waar", "Wanneer", "Hoeveel"], "Waar"),
                    mcq("m04-a6", "Natuurlijke bevestiging", ["Prima, tot dan!", "Prima, ik ben dan!", "Prima, de tijd is kaas."], "Prima, tot dan!"),
                ],
            ),
            {
                "id": "m04-listen",
                "type": "listening",
                "prompt": "Luister — hele afspraak (5 regels)",
                "content": {
                    "dialogue": [
                        {"speaker": "Kim", "nl": "Wanneer heb je tijd voor een kopje koffie?", "en": "When are you free for a cup of coffee?"},
                        {"speaker": "Alex", "nl": "Woensdag na mijn werk, rond vijf uur?", "en": "Wednesday after my work, around five?"},
                        {"speaker": "Kim", "nl": "Prima. Waar spreken we af?", "en": "Great. Where shall we meet?"},
                        {"speaker": "Alex", "nl": "Bij de ingang van het station?", "en": "At the station entrance?"},
                        {"speaker": "Kim", "nl": "Akkoord. Tot woensdag!", "en": "Agreed. See you Wednesday!"},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m04-l1", "Waar begint het gesprek over?", ["Tijd afspreken voor koffie", "Een sollicitatie", "Het weer op vakantie"], "Tijd afspreken voor koffie"),
                    mcq("m04-l2", "Wat stelt Alex eerst voor?", ["Woensdag rond vijf", "Vrijdag om middernacht", "Nooit koffie"], "Woensdag rond vijf"),
                    mcq("m04-l3", "Welke vraag stelt Kim daarna?", ["Waar spreken we af?", "Hoeveel kost de koffie?", "Wie is je baas?"], "Waar spreken we af?"),
                    mcq("m04-l4", "Welke plek kiest Alex?", ["Bij de ingang van het station", "In het zwembad", "Thuis bij Kim"], "Bij de ingang van het station"),
                    mcq("m04-l5", "Hoe sluit Kim af?", ["Akkoord + afscheid", "Een klacht", "Een vraag over brood"], "Akkoord + afscheid"),
                ],
                "metadata": {},
            },
            speak_step(
                "m04-shadow-alex",
                "Zeg mee — voorstel (Alex)",
                "Woensdag na mijn werk, rond vijf uur?",
                ["Woensdag na mijn werk rond vijf uur", "woensdag na mijn werk rond vijf uur"],
                "Woensdag na mijn werk rond vijf uur",
                30,
                "Let op *rond vijf uur*.",
            ),
            speak_step(
                "m04-shadow-kim",
                "Zeg mee — bevestiging (Kim)",
                "Akkoord. Tot woensdag!",
                ["Akkoord tot woensdag", "akkoord tot woensdag"],
                "Akkoord tot woensdag",
                26,
            ),
            pl(
                "m04-pl2",
                "Woordvolgorde & keuze — 6×",
                ["woordvolgorde", "vragen"],
                [
                    mcq("m04-b1", "Welke zin heeft goede woordvolgorde?", ["Kun je morgen?", "Morgen kun je?", "Je morgen kan?"], "Kun je morgen?"),
                    ro("m04-b2", "Zet in de juiste volgorde.", ["laat", "Hoe", "ben", "je", "daar", "?"], "Hoe laat ben je daar?"),
                    mcq("m04-b3", "Welke vraag is onnatuurlijk?", ["Waar zie ik je?", "Waar ben jij van de trein?", "Waar treffen we elkaar?"], "Waar ben jij van de trein?"),
                    fb("m04-b4", "___ heb je dit weekend tijd? (dagdeel)", ["Wanneer", "Waar", "Hoeveel"], "Wanneer"),
                    mcq("m04-b5", "Reactie op een leuk voorstel", ["Dat klinkt goed!", "Dat klinkt slecht altijd!", "Dat ben ik goed!"], "Dat klinkt goed!"),
                    mcq("m04-b6", "Welke zin vraagt naar de plek?", ["Waar ontmoeten we elkaar?", "Hoe laat eet je?", "Wanneer is je verjaardag?"], "Waar ontmoeten we elkaar?"),
                ],
                depth=True,
            ),
            speak_step("m04-sp1", "Beschikbaarheid", "Wanneer heb je tijd?", ["Wanneer heb je tijd", "wanneer heb je tijd"], "Wanneer heb je tijd"),
            speak_step("m04-sp2", "Afspraakplek", "Waar spreken we af?", ["Waar spreken we af", "waar spreken we af"], "Waar spreken we af"),
            speak_step("m04-sp3", "Bevestigen", "Prima, tot woensdag!", ["Prima tot woensdag", "prima tot woensdag"], "Prima tot woensdag"),
            {
                "id": "m04-recap",
                "type": "recap",
                "prompt": "Laatste check",
                "content": {
                    "lemmas": ["wanneer", "waar", "tijd"],
                    "tasks": [
                        {"kind": "fill_blank", "sentence": "___ laat? (klok)", "options": ["Hoe", "Waar", "Wie"], "correctAnswer": "Hoe"},
                        {"kind": "reorder", "tokens": ["Wanneer", "heb", "je", "tijd", "?"], "correctAnswer": "Wanneer heb je tijd?"},
                        {"kind": "listen_mcq", "question": "Snippet:", "snippetNl": "Bij de ingang.", "options": ["Een plek.", "Een tijd.", "Een reden."], "correctAnswer": "Een plek."},
                        {"kind": "speak", "prompt": "Zeg: *Waar zie ik je?*", "targetNl": "Waar zie ik je?", "mockPass": True},
                        {
                            "kind": "listen_mcq",
                            "question": "Kim sluit vriendelijk af:",
                            "snippetNl": "Akkoord. Tot woensdag!",
                            "options": ["Bevestiging + afscheid.", "Een weigering.", "Een prijs."],
                            "correctAnswer": "Bevestiging + afscheid.",
                        },
                        {"kind": "fill_blank", "sentence": "Prima. ___ spreken we af? (plek)", "options": ["Waar", "Wanneer", "Hoeveel"], "correctAnswer": "Waar"},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["word-order", "vocab"],
        "metadata": {**LM, "archetype": "controlled_practice"},
    }

    # L05 speaking — 5 turns
    l05 = {
        "id": "a2-m03-l05-speaking-invite-guided",
        "moduleId": MID,
        "title": "Speaking · Invite someone (guided)",
        "lessonType": "speaking",
        "order": 4,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.1-invitations-patterns", "a2.1-plans-time-phrases"],
        "vocabTargets": ["lemma-zin", "lemma-koffie", "lemma-vanavond", "lemma-samen", "lemma-leuk"],
        "canDoStatements": [
            "I can invite a friend and ask a follow-up about time or place.",
            "I can respond positively with short, natural lines.",
        ],
        "steps": [
            {
                "id": "m05-preview",
                "type": "preview",
                "prompt": "Warm-up",
                "content": {
                    "previewItems": [
                        {"id": "m05-p1", "word": "uitnodiging", "lemma": "uitnodiging", "translationEn": "invitation", "emoji": "💌"},
                        {"id": "m05-p2", "word": "reactie", "lemma": "reactie", "translationEn": "response", "emoji": "💬"},
                        {"id": "m05-p3", "word": "vervolg", "lemma": "vervolg", "translationEn": "follow-up", "emoji": "➡️"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m05-discovery",
                "type": "discovery",
                "prompt": "Brokken voor het gesprek",
                "content": {
                    "phrases": [
                        {"nl": "Heb je zin om langs te komen?", "en": "Fancy coming over?", "focus": "langs"},
                        {"nl": "Moet ik iets meenemen?", "en": "Should I bring something?", "focus": "meenemen"},
                        {"nl": "Tot straks!", "en": "See you in a bit!", "focus": "straks"},
                    ]
                },
                "metadata": {},
            },
            {
                "id": "m05-grammar-mini",
                "type": "grammar_card",
                "prompt": "Flow in 5 beurten",
                "content": {
                    "title": "Mini-gesprek",
                    "summary": "1) uitnodigen · 2) ja + follow-up · 3) tijd voorstellen · 4) meenemen? · 5) afscheid.",
                    "examples": [{"nl": "Hé, heb je zin …?", "en": "Hey, fancy …?"}],
                },
                "feedbackConfig": {"hint": "Kort antwoorden is prima."},
                "metadata": {},
            },
            {
                "id": "m05-listen-read",
                "type": "listen_read",
                "prompt": "Model — vriendinnen",
                "content": {
                    "dialogue": [
                        {"speaker": "Eva", "nl": "Hé, heb je zin om vanavond langs te komen?", "en": "Hey, fancy coming over tonight?"},
                        {"speaker": "Iris", "nl": "Ja, super! Hoe laat?", "en": "Yes, great! What time?"},
                        {"speaker": "Eva", "nl": "Rond half acht? We kunnen samen koken.", "en": "Around half past seven? We can cook together."},
                        {"speaker": "Iris", "nl": "Top. Moet ik iets meenemen?", "en": "Great. Should I bring something?"},
                        {"speaker": "Eva", "nl": "Alleen jezelf. Tot straks!", "en": "Just yourself. See you in a bit!"},
                    ]
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m05-e1", "Wat is Eva's eerste vraag?", ["Een uitnodiging", "Een klacht", "Een sollicitatiebrief"], "Een uitnodiging"),
                    mcq("m05-e2", "Wat vraagt Iris direct?", ["Hoe laat", "Hoeveel kilo", "Waar woon je"], "Hoe laat"),
                    mcq("m05-e3", "Wat voorstelt Eva qua tijd?", ["Rond half acht", "Om middernacht", "Om zes uur 's ochtends"], "Rond half acht"),
                    mcq("m05-e4", "Wat zegt Eva over meenemen?", ["Alleen jezelf", "Een piano", "Een auto"], "Alleen jezelf"),
                ],
                "metadata": {},
            },
            pl(
                "m05-pl1",
                "Herhaal in je hoofd — 6×",
                ["vanavond", "hoe laat", "samen"],
                [
                    mcq("m05-p1", "Welke zin is een follow-up?", ["Hoe laat?", "Ik ben moe.", "Het regent."], "Hoe laat?"),
                    ro("m05-p2", "Zet in de juiste volgorde.", ["langs", "te", "zin", "Heb", "je", "om", "komen", "?"], "Heb je zin om langs te komen?"),
                    mcq("m05-p3", "Vriendelijke bevestiging", ["Top!", "Stop!", "Hop!"], "Top!"),
                    mcq("m05-p4", "Wat vraag je als je iets wilt weten over eten meenemen?", ["Moet ik iets meenemen?", "Moet ik een huis zijn?", "Moet ik de tijd eten?"], "Moet ik iets meenemen?"),
                    fb("m05-p5", "Tot ___! (straks)", ["straks", "gisteren", "ooit"], "straks"),
                    mcq("m05-p6", "Welke zin hoort bij uitnodigen?", ["We kunnen samen koken.", "We kunnen samen slapen.", "We kunnen samen regenen."], "We kunnen samen koken."),
                ],
            ),
            speak_step("m05-sp1", "Beurt 1 — uitnodigen", "Heb je zin om vanavond langs te komen?", ["Heb je zin om vanavond langs te komen", "heb je zin om vanavond langs te komen"], "Heb je zin om vanavond langs te komen", 32),
            speak_step("m05-sp2", "Beurt 2 — positief", "Ja, super! Hoe laat?", ["Ja super hoe laat", "Ja, super! Hoe laat?"], "Ja super hoe laat", 26),
            speak_step("m05-sp3", "Beurt 3 — voorstel tijd", "Rond half acht?", ["Rond half acht", "rond half acht"], "Rond half acht"),
            speak_step("m05-sp4", "Beurt 4 — meenemen?", "Moet ik iets meenemen?", ["Moet ik iets meenemen", "moet ik iets meenemen"], "Moet ik iets meenemen"),
            speak_step("m05-sp5", "Beurt 5 — afsluiten", "Tot straks!", ["Tot straks", "tot straks"], "Tot straks"),
            {
                "id": "m05-recap",
                "type": "recap",
                "prompt": "Recap",
                "content": {
                    "lemmas": ["vanavond", "straks", "samen"],
                    "tasks": [
                        {"kind": "speak", "prompt": "Zeg: *Zullen we samen koken?*", "targetNl": "Zullen we samen koken?", "mockPass": True},
                        {"kind": "fill_blank", "sentence": "Heb je zin om ___ te komen? (langs)", "options": ["langs", "weg", "op"], "correctAnswer": "langs"},
                        {"kind": "listen_mcq", "question": "Je hoort:", "snippetNl": "Moet ik iets meenemen?", "options": ["Een vraag over meebrengen.", "Een weerbericht.", "Een prijs."], "correctAnswer": "Een vraag over meebrengen."},
                        {"kind": "reorder", "tokens": ["super", "Ja", ",", "Hoe", "laat", "?"], "correctAnswer": "Ja, super! Hoe laat?"},
                        {"kind": "fill_blank", "sentence": "Alleen ___. (niets anders meenemen)", "options": ["jezelf", "de maan", "de trein"], "correctAnswer": "jezelf"},
                        {
                            "kind": "listen_mcq",
                            "question": "Eva zegt:",
                            "snippetNl": "Rond half acht? We kunnen samen koken.",
                            "options": ["Tijd + activiteit.", "Alleen een adres.", "Een klacht."],
                            "correctAnswer": "Tijd + activiteit.",
                        },
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["pronunciation", "word-order"],
        "metadata": {**LM, "archetype": "speaking_studio"},
    }

    # L06 listening variations
    l06 = {
        "id": "a2-m03-l06-listening-variations-social-contexts",
        "moduleId": MID,
        "title": "Listening · Variations · different social contexts",
        "lessonType": "input",
        "order": 5,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.1-plans-time-phrases", "a2.1-present-tense"],
        "vocabTargets": ["lemma-weekend", "lemma-vriend", "lemma-cafe", "lemma-plan", "lemma-samen"],
        "canDoStatements": [
            "I can tell friend vs polite-work tone in short plan clips.",
            "I can retrieve key details from three short dialogues.",
        ],
        "steps": [
            {
                "id": "m06-preview",
                "type": "preview",
                "prompt": "Contexten",
                "content": {
                    "previewItems": [
                        {"id": "m06-p1", "word": "vriend", "lemma": "vriend", "translationEn": "friend", "emoji": "🧑‍🤝‍🧑"},
                        {"id": "m06-p2", "word": "collega", "lemma": "collega", "translationEn": "colleague", "emoji": "💼"},
                        {"id": "m06-p3", "word": "weekend", "lemma": "weekend", "translationEn": "weekend", "emoji": "🎉"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m06-listen-a",
                "type": "listening",
                "prompt": "Vrienden — festival",
                "content": {
                    "dialogue": [
                        {"speaker": "Jes", "nl": "Ga je mee naar het festival dit weekend?", "en": "Are you coming to the festival this weekend?"},
                        {"speaker": "Mila", "nl": "Ja! Zaterdagmiddag?", "en": "Yes! Saturday afternoon?"},
                        {"speaker": "Jes", "nl": "Perfect. We treffen elkaar bij de hoofdingang.", "en": "Perfect. We'll meet at the main entrance."},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m06-a1", "Welke context?", ["Vrienden + weekendplan", "Een doktersbezoek", "Boodschappen"], "Vrienden + weekendplan"),
                    mcq("m06-a2", "Wanneer ongeveer?", ["Zaterdagmiddag", "Maandagochtend vroeg", "Nooit"], "Zaterdagmiddag"),
                    mcq("m06-a3", "Waar afspreken?", ["Bij de hoofdingang", "In de klas", "Op het station alleen"], "Bij de hoofdingang"),
                ],
                "metadata": {},
            },
            {
                "id": "m06-listen-b",
                "type": "listening",
                "prompt": "Collega's — lunch",
                "content": {
                    "dialogue": [
                        {"speaker": "Rick", "nl": "Zullen we vrijdag samen lunchen in de kantine?", "en": "Shall we have lunch together in the canteen on Friday?"},
                        {"speaker": "Sara", "nl": "Goed idee. Om twaalf uur?", "en": "Good idea. At twelve?"},
                        {"speaker": "Rick", "nl": "Prima. Tot vrijdag.", "en": "Fine. See you Friday."},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m06-b1", "Welke toon?", ["Werk / collega", "Tegen een baby", "In de rechtbank"], "Werk / collega"),
                    mcq("m06-b2", "Waar lunchen?", ["In de kantine", "Thuis bij Rick", "In het zwembad"], "In de kantine"),
                    mcq("m06-b3", "Hoe laat?", ["Om twaalf uur", "Om drie uur 's nachts", "Geen tijd"], "Om twaalf uur"),
                ],
                "metadata": {},
            },
            {
                "id": "m06-listen-c",
                "type": "listening",
                "prompt": "Sportclub — training",
                "content": {
                    "dialogue": [
                        {"speaker": "Coach", "nl": "Hebben jullie zin om donderdag een extra training te doen?", "en": "Do you fancy an extra training on Thursday?"},
                        {"speaker": "Speler", "nl": "Ja, maar ik kan pas na achten.", "en": "Yes, but I can only make it after eight."},
                        {"speaker": "Coach", "nl": "Geen probleem. Tot donderdag.", "en": "No problem. See you Thursday."},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m06-c1", "Waar gebeurt dit waarschijnlijk?", ["Sport / training", "Bij de bakker", "Op school examen"], "Sport / training"),
                    mcq("m06-c2", "Wanneer kan de speler?", ["Na achten", "Om vijf uur 's ochtends", "Nooit"], "Na achten"),
                    mcq("m06-c3", "Welk woord geeft een beperking?", ["maar", "en", "dus"], "maar"),
                ],
                "metadata": {},
            },
            pl(
                "m06-pl1",
                "Welke context? — 6×",
                ["vriend", "werk", "sport"],
                [
                    mcq("m06-p1", "Waar hoor je *kantine*?", ["Werk", "Zwembad thuis", "Op vakantie"], "Werk"),
                    mcq("m06-p2", "Waar hoor je *festival*?", ["Vrije tijd", "Belastingdienst", "Tandarts"], "Vrije tijd"),
                    mcq("m06-p3", "Welke zin is collegiaal?", ["Zullen we vrijdag lunchen?", "Hé sukkel, kom!", "Jij nu eten!"], "Zullen we vrijdag lunchen?"),
                    ro("m06-p4", "Zet in de juiste volgorde.", ["mee", "Ga", "je", "dit", "weekend", "?"], "Ga je mee dit weekend?"),
                    mcq("m06-p5", "Welke reactie geeft een tegenstelling?", ["Ja, maar ik kan pas laat.", "Ja, en ik ben blij.", "Ja, want ik ben laat."], "Ja, maar ik kan pas laat."),
                    mcq("m06-p6", "Natuurlijke afsluiting", ["Tot donderdag!", "Tot gisteren!", "Tot de maan!"], "Tot donderdag!"),
                ],
                depth=True,
            ),
            speak_step("m06-sp1", "Vrienden", "Ga je mee naar het festival?", ["Ga je mee naar het festival", "ga je mee naar het festival"], "Ga je mee naar het festival"),
            speak_step("m06-sp2", "Collega", "Zullen we vrijdag lunchen?", ["Zullen we vrijdag lunchen", "zullen we vrijdag lunchen"], "Zullen we vrijdag lunchen"),
            speak_step("m06-sp3", "Beperking", "Ja, maar ik kan pas laat.", ["Ja maar ik kan pas laat", "ja maar ik kan pas laat"], "Ja maar ik kan pas laat", 28),
            {
                "id": "m06-recap",
                "type": "recap",
                "prompt": "Recap",
                "content": {
                    "lemmas": ["weekend", "kantine", "maar"],
                    "tasks": [
                        {
                            "kind": "listen_mcq",
                            "question": "Snippet:",
                            "snippetNl": "In de kantine om twaalf uur?",
                            "options": ["Werk-lunchafspraak.", "Festival.", "Film."],
                            "correctAnswer": "Werk-lunchafspraak.",
                        },
                        {"kind": "fill_blank", "sentence": "Ja, ___ ik heb geen tijd. (tegenstelling)", "options": ["maar", "want", "omdat"], "correctAnswer": "maar"},
                        {"kind": "reorder", "tokens": ["we", "Zullen", "zaterdag", "afspreken", "?"], "correctAnswer": "Zullen we zaterdag afspreken?"},
                        {"kind": "speak", "prompt": "Zeg: *Geen probleem.*", "targetNl": "Geen probleem.", "mockPass": True},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["listening", "register"],
        "metadata": {**LM, "archetype": "listening_variation"},
    }

    # L07 grammar linking
    l07 = {
        "id": "a2-m03-l07-grammar-linking-sentences",
        "moduleId": MID,
        "title": "Grammar & patterns · Linking sentences (en / maar / want / omdat)",
        "lessonType": "pattern",
        "order": 6,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.1-linking-connectors", "a2.1-present-tense"],
        "vocabTargets": ["lemma-want", "lemma-omdat", "lemma-maar", "lemma-en", "lemma-helaas"],
        "canDoStatements": [
            "I can choose en/maar/want/omdat to link two short ideas in plans.",
            "I can avoid mixing unnatural connectors.",
        ],
        "steps": [
            {
                "id": "m07-preview",
                "type": "preview",
                "prompt": "Verbindingswoorden",
                "content": {
                    "previewItems": [
                        {"id": "m07-p1", "word": "en", "lemma": "en", "translationEn": "and", "emoji": "➕"},
                        {"id": "m07-p2", "word": "maar", "lemma": "maar", "translationEn": "but", "emoji": "↩️"},
                        {"id": "m07-p3", "word": "want", "lemma": "want", "translationEn": "because", "emoji": "💡"},
                        {"id": "m07-p4", "word": "omdat", "lemma": "omdat", "translationEn": "because", "emoji": "🔗"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m07-grammar",
                "type": "grammar_card",
                "prompt": "Korte uitleg",
                "content": {
                    "title": "Zinnen koppelen",
                    "summary": "**en** = erbij · **maar** = tegenstelling · **want** = reden (na hoofdzin) · **omdat** = reden (nevenzin; werkwoord naar het eind).",
                    "examples": [
                        {"nl": "Ik kom, en ik neem brood mee.", "en": "I'm coming, and I'm bringing bread."},
                        {"nl": "Ik wil wel, maar ik ben moe.", "en": "I'd like to, but I'm tired."},
                        {"nl": "Ik ga niet, want ik ben ziek.", "en": "I'm not going, because I'm ill."},
                    ],
                },
                "feedbackConfig": {"hint": "Wil je kort praten? *want* is vaak het makkelijkst."},
                "metadata": {},
            },
            pl(
                "m07-pl1",
                "Kies de juiste schakel — 6×",
                ["want", "maar", "en"],
                [
                    mcq("m07-a1", "Tegenstelling: ik wil … ___ ik kan niet.", ["maar", "want", "omdat"], "maar"),
                    mcq("m07-a2", "Toevoeging: koffie ___ taart.", ["en", "maar", "want"], "en"),
                    fb("m07-a3", "Ik blijf thuis, ___ ik voel me niet lekker. (simpele reden)", ["want", "maar", "en"], "want"),
                    mcq("m07-a4", "Welke zin gebruikt *omdat* goed?", ["Ik blijf thuis, omdat ik moe ben.", "Omdat ik blijf thuis, want ik moe ben.", "Ik omdat thuis ben."], "Ik blijf thuis, omdat ik moe ben."),
                    ro(
                        "m07-a5",
                        "Zet in de juiste volgorde (*omdat*: werkwoord aan het eind).",
                        ["kom", "Ik", "niet", ",", "omdat", "ik", "moe", "ben", "."],
                        "Ik kom niet, omdat ik moe ben.",
                    ),
                    mcq("m07-a6", "Welke zin is natuurlijker in chat?", ["Sorry, ik kan niet want ik werk.", "Sorry, ik kan niet omdat werk ik.", "Sorry, want niet ik kan werk."], "Sorry, ik kan niet want ik werk."),
                ],
            ),
            {
                "id": "m07-listen",
                "type": "listening",
                "prompt": "Luister — reden",
                "content": {
                    "dialogue": [
                        {"speaker": "Bo", "nl": "Kom je vanavond naar het feestje?", "en": "Are you coming to the party tonight?"},
                        {"speaker": "Nina", "nl": "Ik wil wel, maar ik moet vroeg op. Misschien een uurtje?", "en": "I'd like to, but I have to get up early. Maybe for an hour?"},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m07-l1", "Welk woord geeft een tegenstelling in Nina's antwoord?", ["maar", "want", "omdat"], "maar"),
                    mcq("m07-l2", "Wat stelt Nina voor?", ["Misschien korter komen", "Niet meer praten", "Een andere stad"], "Misschien korter komen"),
                ],
                "metadata": {},
            },
            pl(
                "m07-pl2",
                "Nog 6× — linken",
                ["omdat", "want", "en"],
                [
                    mcq("m07-b1", "Welke zin klopt?", ["Ik ga mee, want ik heb tijd.", "Ik ga mee omdat, ik heb tijd.", "Ik want ga mee, ik heb tijd."], "Ik ga mee, want ik heb tijd."),
                    fb("m07-b2", "We zien elkaar ___ we spreken af in het park. (toevoeging)", ["en", "maar", "want"], "en"),
                    ro("m07-b3", "Zet in de juiste volgorde.", ["niet", ",", "Ik", "kan", "want", "ik", "werk", "."], "Ik kan niet, want ik werk."),
                    mcq("m07-b4", "Kies de beste *omdat*-zin", ["Ik blijf thuis, omdat ik ziek ben.", "Ik blijf thuis, omdat ben ik ziek.", "Omdat ik ben ziek, ik blijf thuis."], "Ik blijf thuis, omdat ik ziek ben."),
                    mcq("m07-b5", "Welke spreker geeft een reden met *want*?", ["Ik kan niet, want ik ben moe.", "Ik kan niet, maar ik ben moe.", "Ik kan niet, en ik ben moe."], "Ik kan niet, want ik ben moe."),
                    mcq("m07-b6", "Natuurlijk", ["Helaas, ik heb al plannen.", "Helaas, ik ben al plannen.", "Helaas, plannen heb ik al nooit."], "Helaas, ik heb al plannen."),
                ],
                depth=True,
            ),
            speak_step("m07-sp1", "Reden met *want*", "Ik kan niet, want ik werk laat.", ["Ik kan niet want ik werk laat", "ik kan niet want ik werk laat"], "Ik kan niet want ik werk laat", 30),
            speak_step("m07-sp2", "Tegenstelling", "Ik wil wel, maar ik ben moe.", ["Ik wil wel maar ik ben moe", "ik wil wel maar ik ben moe"], "Ik wil wel maar ik ben moe", 28),
            speak_step("m07-sp3", "Korte *omdat*-zin", "Ik blijf thuis, omdat ik ziek ben.", ["Ik blijf thuis omdat ik ziek ben", "ik blijf thuis omdat ik ziek ben"], "Ik blijf thuis omdat ik ziek ben", 32),
            {
                "id": "m07-recap",
                "type": "recap",
                "prompt": "Recap",
                "content": {
                    "lemmas": ["want", "maar", "omdat"],
                    "tasks": [
                        {"kind": "fill_blank", "sentence": "Ik wil wel, ___ ik heb geen tijd. (tegenstelling)", "options": ["maar", "want", "omdat"], "correctAnswer": "maar"},
                        {"kind": "reorder", "tokens": ["niet", ",", "Ik", "kom", "want", "ik", "ben", "moe", "."], "correctAnswer": "Ik kom niet, want ik ben moe."},
                        {"kind": "speak", "prompt": "Zeg: *Ik ga niet, want ik ben ziek.*", "targetNl": "Ik ga niet, want ik ben ziek.", "mockPass": True},
                        {
                            "kind": "listen_mcq",
                            "question": "Nina zegt:",
                            "snippetNl": "Ik wil wel, maar ik moet vroeg op.",
                            "options": ["Tegenstelling + reden voor 'nee'.", "Een adres.", "Een treinkaartje."],
                            "correctAnswer": "Tegenstelling + reden voor 'nee'.",
                        },
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["grammar", "word-order"],
        "metadata": {**LM, "archetype": "grammar_pattern"},
    }

    # --- L08 writing ---
    l08 = {
        "id": "a2-m03-l08-writing-short-plan-messages",
        "moduleId": MID,
        "title": "Writing · Short plan messages",
        "lessonType": "writing",
        "order": 7,
        "cefrLevel": "A2",
        "durationEstimate": 17,
        "grammarTargets": ["a2.1-invitations-patterns", "a2.1-linking-connectors"],
        "vocabTargets": ["lemma-bericht", "lemma-straks", "lemma-morgen", "lemma-graag", "lemma-cafe"],
        "canDoStatements": [
            "I can write a short app-style message to suggest a plan.",
            "I can respond in a thread with *want* and a polite alternative.",
        ],
        "steps": [
            {
                "id": "m08-preview",
                "type": "preview",
                "prompt": "Appje — 3 woorden",
                "content": {
                    "previewItems": [
                        {"id": "m08-p1", "word": "bericht", "lemma": "bericht", "translationEn": "message", "emoji": "💬"},
                        {"id": "m08-p2", "word": "straks", "lemma": "straks", "translationEn": "in a bit", "emoji": "⏱️"},
                        {"id": "m08-p3", "word": "afspreken", "lemma": "afspreken", "translationEn": "to meet up", "emoji": "🤝"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m08-listen-read",
                "type": "listen_read",
                "prompt": "Voorbeeld — twee appjes",
                "content": {
                    "dialogue": [
                        {"speaker": "Jij", "nl": "Hoi! Zullen we straks een koffie doen bij Central?", "en": "Hi! Shall we grab a coffee at Central in a bit?"},
                        {"speaker": "Vriend", "nl": "Ja! Hoe laat ongeveer?", "en": "Yes! Roughly what time?"},
                        {"speaker": "Jij", "nl": "Om half vier? Ik moet daarna weg, want ik heb sport.", "en": "Half past three? I have to leave after, because I have sports."},
                    ]
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m08-e1", "Wat stelt het eerste bericht voor?", ["Koffie afspreken", "Naar de dokter", "Boodschappen"], "Koffie afspreken"),
                    mcq("m08-e2", "Welke vraag is het vervolg?", ["Hoe laat ongeveer?", "Hoeveel kilo?", "Waar woon je?"], "Hoe laat ongeveer?"),
                    mcq("m08-e3", "Waarom moet de afzender weg?", ["Want hij/zij heeft sport", "Want het regent", "Want de koffie is duur"], "Want hij/zij heeft sport"),
                ],
                "metadata": {},
            },
            {
                "id": "m08-listen-read-b",
                "type": "listen_read",
                "prompt": "Tweede draad — even niet, dan wel",
                "content": {
                    "dialogue": [
                        {"speaker": "Jij", "nl": "Zullen we vanavond gamen?", "en": "Shall we game tonight?"},
                        {"speaker": "Vriend", "nl": "Ik kan niet, want ik werk laat. Misschien morgenavond?", "en": "I can't, because I'm working late. Maybe tomorrow evening?"},
                        {"speaker": "Jij", "nl": "Ah jammer. Morgenavond kan ik wel. Om acht uur?", "en": "Ah too bad. Tomorrow evening works for me. At eight?"},
                        {"speaker": "Vriend", "nl": "Perfect. Tot morgen!", "en": "Perfect. See you tomorrow!"},
                    ]
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m08-b1", "Waarom zegt de vriend eerst nee?", ["Want hij/zij werkt laat", "Want hij/zij houdt niet van jou", "Want het regent"], "Want hij/zij werkt laat"),
                    mcq("m08-b2", "Wat stelt de vriend voor als alternatief?", ["Misschien morgenavond", "Nooit meer", "Alleen in de zomer"], "Misschien morgenavond"),
                    mcq("m08-b3", "Welke tijd stel jij voor op de derde regel?", ["Om acht uur", "Om twee uur 's nachts", "Geen tijd"], "Om acht uur"),
                    mcq("m08-b4", "Hoe sluit de vriend af?", ["Bevestiging + tot morgen", "Een klacht", "Een sollicitatie"], "Bevestiging + tot morgen"),
                ],
                "metadata": {},
            },
            {
                "id": "m08-discovery",
                "type": "discovery",
                "prompt": "Herhaal — vaste app-regels",
                "content": {
                    "phrases": [
                        {"nl": "Zullen we straks een koffie doen?", "en": "Shall we grab a coffee in a bit?", "focus": "Zullen"},
                        {"nl": "Ik moet daarna weg, want ik heb sport.", "en": "I have to leave after, because I have sports.", "focus": "want"},
                        {"nl": "Ik kan niet, want ik werk laat.", "en": "I can't, because I'm working late.", "focus": "kan niet"},
                        {"nl": "Misschien morgenavond?", "en": "Maybe tomorrow evening?", "focus": "Misschien"},
                    ]
                },
                "metadata": {},
            },
            pl(
                "m08-pl-replies",
                "Kies het beste antwoord — alsof je chat (6×)",
                ["bericht", "vriend", "alternatief"],
                [
                    mcq("m08-r1", "Iemand vraagt: *Zullen we vanavond afspreken?* Jij kunt niet. Wat is vriendelijk?", ["Ik kan niet vanavond, want ik werk. Misschien morgen?", "Nee. Zoek iemand anders.", "Ik ben vanavond."], "Ik kan niet vanavond, want ik werk. Misschien morgen?"),
                    mcq("m08-r2", "Positief op een voorstel", ["Ja, leuk! Hoe laat?", "Ja, slecht idee.", "Ja, ik ben de klok."], "Ja, leuk! Hoe laat?"),
                    mcq("m08-r3", "Iemand geeft een tijd. Jij bevestigt.", ["Top, tot straks!", "Top, ik ben straks.", "Top, de tijd is kaas."], "Top, tot straks!"),
                    ro("m08-r4", "Zet in de juiste volgorde.", ["niet", ",", "Ik", "kan", "want", "ik", "ben", "moe", "."], "Ik kan niet, want ik ben moe."),
                    mcq("m08-r5", "Alternatief voorstellen", ["Misschien zaterdag?", "Misschien nooit?", "Misschien ben ik zaterdag?"], "Misschien zaterdag?"),
                    mcq("m08-r6", "Natuurlijk slot", ["Tot morgen!", "Tot gisteren!", "Tot de politie!"], "Tot morgen!"),
                ],
            ),
            {
                "id": "m08-grammar",
                "type": "grammar_card",
                "prompt": "Zo schrijf je kort",
                "content": {
                    "title": "Plan in één appje",
                    "summary": "**Voorstel** + **tijd/plek** + optioneel **want** + reden. Houd zinnen kort.",
                    "examples": [
                        {"nl": "Zullen we morgen lunchen? Ik heb om twaalf uur tijd.", "en": "Shall we lunch tomorrow? I'm free at twelve."},
                        {"nl": "Ik kan niet vanavond, want ik werk.", "en": "I can't tonight, because I'm working."},
                    ],
                },
                "feedbackConfig": {"hint": "Begin met Hoi of Hey bij vrienden."},
                "metadata": {},
            },
            pl(
                "m08-pl1",
                "Kies de beste regel — 6×",
                ["bericht", "tijd", "want"],
                [
                    mcq("m08-a1", "Natuurlijk appje", ["Zullen we straks bellen?", "Zullen we straks een boom?", "Zullen we straks de maan?"], "Zullen we straks bellen?"),
                    fb("m08-a2", "___ laat ben je daar? (klok)", ["Hoe", "Waar", "Wie"], "Hoe"),
                    ro("m08-a3", "Zet in de juiste volgorde.", ["we", "Zullen", "morgen", "afspreken", "?"], "Zullen we morgen afspreken?"),
                    mcq("m08-a4", "Welke zin geeft een reden?", ["Ik kan niet, want ik ben moe.", "Ik kan niet, en ik ben moe.", "Ik kan niet, maar ik ben blij."], "Ik kan niet, want ik ben moe."),
                    mcq("m08-a5", "Welke afsluiting past bij chat?", ["Tot zo!", "Tot volgend jaar!", "Tot de politie!"], "Tot zo!"),
                    mcq("m08-a6", "Beleefd + duidelijk", ["Misschien een andere keer?", "Misschien nooit praten?", "Misschien ben ik een trein?"], "Misschien een andere keer?"),
                ],
            ),
            {
                "id": "m08-fill",
                "type": "fill_blank",
                "prompt": "Mini",
                "content": {"followUpReorder": {"tokens": ["kan", "Ik", "niet", ",", "want", "ik", "werk", "."], "correctAnswer": "Ik kan niet, want ik werk."}},
                "feedbackConfig": {"errorTags": ["grammar"]},
                "exercises": [fb("m08-f1", "Laten we ___ het park afspreken. (plek)", ["in", "onder", "achter"], "in")],
                "metadata": {},
            },
            pl(
                "m08-pl2",
                "Nog 6×",
                ["vanavond", "morgen", "cafe"],
                [
                    mcq("m08-b1", "Welke zin hoort bij een uitnodiging?", ["Heb je zin om naar het café te gaan?", "Heb je zin om een dokter te zijn?", "Heb je zin om te regenen?"], "Heb je zin om naar het café te gaan?"),
                    mcq("m08-b2", "Korte bevestiging", ["Top!", "Stop!", "Hop!"], "Top!"),
                    fb("m08-b3", "Ik ben er ___ vier uur. (rond)", ["rond", "onder", "achter"], "rond"),
                    ro("m08-b4", "Zet in de juiste volgorde.", ["straks", "Zullen", "we", "bellen", "?"], "Zullen we straks bellen?"),
                    mcq("m08-b5", "Welke zin is te formeel voor een vriend?", ["Zou u morgen tijd hebben?", "Heb je morgen tijd?", "Kun je morgen?"], "Zou u morgen tijd hebben?"),
                    mcq("m08-b6", "Reden", ["Ik werk laat, dus ik kan niet vroeg.", "Ik werk laat, dus ik ben een vroeg.", "Ik werk laat, dus de maan."], "Ik werk laat, dus ik kan niet vroeg."),
                ],
                depth=True,
            ),
            {
                "id": "m08-write1",
                "type": "writing",
                "prompt": "Schrijf één korte uitnodiging",
                "content": {
                    "prompt": "Schrijf: Zullen we morgen koffie drinken? (kleine variatie mag)",
                    "acceptable": [
                        "Zullen we morgen koffie drinken",
                        "zullen we morgen koffie drinken",
                        "Zullen we morgen koffie drinken?",
                    ],
                    "modelNl": "Zullen we morgen koffie drinken?",
                    "minChars": 10,
                },
                "feedbackConfig": {"errorTags": ["grammar"]},
                "metadata": {},
            },
            {
                "id": "m08-write2",
                "type": "writing",
                "prompt": "Schrijf een reden",
                "content": {
                    "prompt": "Schrijf: Ik kan niet, want ik werk. (mag ik werk laat)",
                    "acceptable": [
                        "Ik kan niet want ik werk",
                        "Ik kan niet, want ik werk",
                        "ik kan niet want ik werk",
                        "Ik kan niet want ik werk laat",
                    ],
                    "modelNl": "Ik kan niet, want ik werk.",
                    "minChars": 8,
                },
                "metadata": {},
            },
            speak_step(
                "m08-sp1",
                "Lees je uitnodiging hardop",
                "Hoi! Zullen we straks afspreken?",
                ["Hoi zullen we straks afspreken", "Hoi! Zullen we straks afspreken?"],
                "Hoi zullen we straks afspreken",
                28,
            ),
            speak_step(
                "m08-sp2",
                "Zeg mee — vriend (nee + reden)",
                "Ik kan niet, want ik werk laat.",
                ["Ik kan niet want ik werk laat", "ik kan niet want ik werk laat"],
                "Ik kan niet want ik werk laat",
                28,
                "Rustig: *want ik werk*.",
            ),
            speak_step(
                "m08-sp3",
                "Alternatief uitspreken",
                "Misschien morgenavond?",
                ["Misschien morgenavond", "misschien morgenavond"],
                "Misschien morgenavond",
                26,
            ),
            {
                "id": "m08-recap",
                "type": "recap",
                "prompt": "Check",
                "content": {
                    "lemmas": ["straks", "want", "bericht"],
                    "tasks": [
                        {"kind": "fill_blank", "sentence": "Zullen we ___ een kopje koffie? (binnenkort)", "options": ["straks", "gisteren", "ooit"], "correctAnswer": "straks"},
                        {"kind": "reorder", "tokens": ["niet", ",", "Ik", "kan", "want", "ik", "ben", "moe", "."], "correctAnswer": "Ik kan niet, want ik ben moe."},
                        {"kind": "speak", "prompt": "Zeg: *Tot zo!*", "targetNl": "Tot zo!", "mockPass": True},
                        {"kind": "listen_mcq", "question": "Snippet:", "snippetNl": "Om half vier?", "options": ["Een tijd.", "Een adres.", "Een naam."], "correctAnswer": "Een tijd."},
                        {
                            "kind": "listen_mcq",
                            "question": "Vriend stelt een alternatief voor:",
                            "snippetNl": "Misschien morgenavond?",
                            "options": ["Nieuw moment voorstellen.", "Definitieve nee.", "Een weerbericht."],
                            "correctAnswer": "Nieuw moment voorstellen.",
                        },
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["grammar", "register"],
        "metadata": {**LM, "archetype": "writing_proxy"},
    }

    # --- L09 task meetup ---
    l09 = {
        "id": "a2-m03-l09-task-plan-meetup",
        "moduleId": MID,
        "title": "Real-life task · Plan a meetup (guided)",
        "lessonType": "task",
        "order": 8,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.1-invitations-patterns", "a2.1-questions-basics"],
        "vocabTargets": ["lemma-cafe", "lemma-hoelaat", "lemma-waar", "lemma-leuk", "lemma-afspreken"],
        "canDoStatements": [
            "I can propose a meetup, agree on time, and confirm the place.",
            "I can handle a short decline + alternative politely.",
        ],
        "steps": [
            {
                "id": "m09-preview",
                "type": "preview",
                "prompt": "Taak — 4 woorden",
                "content": {
                    "previewItems": [
                        {"id": "m09-p1", "word": "plan", "lemma": "plan", "translationEn": "plan", "emoji": "📌"},
                        {"id": "m09-p2", "word": "tijd", "lemma": "tijd", "translationEn": "time", "emoji": "⏰"},
                        {"id": "m09-p3", "word": "waar", "lemma": "waar", "translationEn": "where", "emoji": "📍"},
                        {"id": "m09-p4", "word": "afspreken", "lemma": "afspreken", "translationEn": "to meet up", "emoji": "🤝"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m09-listen",
                "type": "listening",
                "prompt": "Luister — volledig voorbeeld",
                "content": {
                    "dialogue": [
                        {"speaker": "Ravi", "nl": "Heb je zin om zondag te wandelen in het park?", "en": "Fancy a walk in the park on Sunday?"},
                        {"speaker": "Sofie", "nl": "Ja, leuk! Hoe laat?", "en": "Yes, fun! What time?"},
                        {"speaker": "Ravi", "nl": "Om elf uur bij de grote ingang?", "en": "At eleven at the main entrance?"},
                        {"speaker": "Sofie", "nl": "Perfect. Ik neem koffie mee.", "en": "Perfect. I'll bring coffee."},
                        {"speaker": "Ravi", "nl": "Top. Tot zondag!", "en": "Great. See you Sunday!"},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m09-l1", "Wat is het plan?", ["Wandelen in het park", "Naar de film", "Werken"], "Wandelen in het park"),
                    mcq("m09-l2", "Hoe laat?", ["Om elf uur", "Om middernacht", "Om zes uur 's ochtends"], "Om elf uur"),
                    mcq("m09-l3", "Waar afspreken?", ["Bij de grote ingang", "Thuis bij Ravi", "In de supermarkt"], "Bij de grote ingang"),
                    mcq("m09-l4", "Wat neemt Sofie mee?", ["Koffie", "Een fiets", "Een huis"], "Koffie"),
                ],
                "metadata": {},
            },
            pl(
                "m09-pl1",
                "Jouw beurt (keuze) — 6×",
                ["wandelen", "plek", "tijd"],
                [
                    mcq("m09-p1", "Natuurlijke uitnodiging", ["Heb je zin om te wandelen?", "Heb je zin wandelen zonder woorden?", "Zin heb je wandelen?"], "Heb je zin om te wandelen?"),
                    mcq("m09-p2", "Vraag naar tijd", ["Hoe laat?", "Hoeveel kilo?", "Hoe oud ben je?"], "Hoe laat?"),
                    ro("m09-p3", "Zet in de juiste volgorde.", ["Bij", "de", "grote", "ingang"], "Bij de grote ingang"),
                    mcq("m09-p4", "Bevestigen", ["Prima, tot zondag!", "Prima, tot gisteren!", "Prima, ik ben zondag!"], "Prima, tot zondag!"),
                    mcq("m09-p5", "Alternatief voorstellen", ["Misschien zaterdag?", "Misschien nooit?", "Misschien ben ik een park?"], "Misschien zaterdag?"),
                    mcq("m09-p6", "Plek vragen", ["Waar spreken we af?", "Waar is je schoen?", "Waar eet je de trein?"], "Waar spreken we af?"),
                ],
            ),
            speak_step("m09-sp1", "Jij nodigt uit", "Heb je zin om zondag te wandelen?", ["Heb je zin om zondag te wandelen", "heb je zin om zondag te wandelen"], "Heb je zin om zondag te wandelen", 30),
            speak_step("m09-sp2", "Reageer positief + vraag", "Ja, leuk! Hoe laat?", ["Ja leuk hoe laat", "Ja, leuk! Hoe laat?"], "Ja leuk hoe laat", 26),
            speak_step("m09-sp3", "Tijd + plek", "Om elf uur bij de grote ingang.", ["Om elf uur bij de grote ingang", "om elf uur bij de grote ingang"], "Om elf uur bij de grote ingang", 30),
            speak_step("m09-sp4", "Afsluiten", "Top. Tot zondag!", ["Top tot zondag", "top tot zondag"], "Top tot zondag"),
            pl(
                "m09-pl2",
                "Fix — 6×",
                ["omdat", "want", "maar"],
                [
                    mcq("m09-q1", "Vriendelijke weigering", ["Ik kan niet, want ik werk.", "Ik kan niet, want ik ben werk.", "Ik kan niet, en ik ben werk."], "Ik kan niet, want ik werk."),
                    mcq("m09-q2", "Tegenstelling", ["Ik wil wel, maar ik moet studeren.", "Ik wil wel want ik moet studeren.", "Ik wil wel omdat ik moet studeren."], "Ik wil wel, maar ik moet studeren."),
                    fb("m09-q3", "We treffen elkaar ___ het station. (plek)", ["bij", "maar", "want"], "bij"),
                    ro("m09-q4", "Zet in de juiste volgorde.", ["meenemen", "Ik", "neem", "koffie", "."], "Ik neem koffie mee."),
                    mcq("m09-q5", "Welke zin is een follow-up?", ["Waar zie ik je?", "Waar is je naam?", "Waar eet je?"], "Waar zie ik je?"),
                    mcq("m09-q6", "Natuurlijk Nederlands", ["Dat klinkt leuk!", "Dat klinkt traag!", "Dat ben ik leuk!"], "Dat klinkt leuk!"),
                ],
                depth=True,
            ),
            {
                "id": "m09-recap",
                "type": "recap",
                "prompt": "Check",
                "content": {
                    "lemmas": ["wandelen", "ingang", "zondag"],
                    "tasks": [
                        {"kind": "speak", "prompt": "Zeg: *Waar spreken we af?*", "targetNl": "Waar spreken we af?", "mockPass": True},
                        {"kind": "fill_blank", "sentence": "___ laat treffen we elkaar?", "options": ["Hoe", "Waar", "Wie"], "correctAnswer": "Hoe"},
                        {
                            "kind": "listen_mcq",
                            "question": "Je hoort:",
                            "snippetNl": "Ik neem koffie mee.",
                            "options": ["Iemand neemt iets mee.", "Iemand koopt een huis.", "Iemand is ziek."],
                            "correctAnswer": "Iemand neemt iets mee.",
                        },
                        {"kind": "reorder", "tokens": ["leuk", "Ja", ",", "Hoe", "laat", "?"], "correctAnswer": "Ja, leuk! Hoe laat?"},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["register", "vocab"],
        "metadata": {**LM, "archetype": "task_scaffold"},
    }

    # --- L10 full simulation ---
    l10 = {
        "id": "a2-m03-l10-task-full-conversation-simulation",
        "moduleId": MID,
        "title": "Real-life task · Full conversation simulation",
        "lessonType": "task",
        "order": 9,
        "cefrLevel": "A2",
        "durationEstimate": 16,
        "grammarTargets": ["a2.1-invitations-patterns", "a2.1-plans-time-phrases", "a2.1-linking-connectors"],
        "vocabTargets": ["lemma-vanavond", "lemma-film", "lemma-cafe", "lemma-misschien", "lemma-graag"],
        "canDoStatements": [
            "I can manage a 5–6 line chat: invite → react → time/place → reason → close.",
            "I can sound natural in informal Dutch.",
        ],
        "steps": [
            {
                "id": "m10-discovery",
                "type": "discovery",
                "prompt": "Herhaal",
                "content": {
                    "phrases": [
                        {"nl": "Laten we iets leuks doen!", "en": "Let's do something fun!", "focus": "Laten"},
                        {"nl": "Ik heb al plannen.", "en": "I already have plans.", "focus": "plannen"},
                        {"nl": "Tot vanavond!", "en": "See you tonight!", "focus": "vanavond"},
                    ]
                },
                "metadata": {},
            },
            {
                "id": "m10-listen",
                "type": "listening",
                "prompt": "Luister — hele gesprek",
                "content": {
                    "dialogue": [
                        {"speaker": "Noah", "nl": "Hé, heb je zin om vanavond naar de film te gaan?", "en": "Hey, fancy going to the cinema tonight?"},
                        {"speaker": "Lina", "nl": "Oeh, welke film?", "en": "Ooh, which film?"},
                        {"speaker": "Noah", "nl": "De nieuwe comedy om half acht.", "en": "The new comedy at half past seven."},
                        {"speaker": "Lina", "nl": "Leuk! Maar ik kan pas na achten, want ik eet nog met mijn ouders.", "en": "Nice! But I can only after eight, because I'm still eating with my parents."},
                        {"speaker": "Noah", "nl": "Geen stress. Laten we dan tickets voor negen uur nemen.", "en": "No stress. Let's take tickets for nine then."},
                        {"speaker": "Lina", "nl": "Perfect. We spreken af bij de kassa. Tot zo!", "en": "Perfect. We'll meet at the box office. See you later!"},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m10-l1", "Wat stelt Noah voor?", ["Naar de film vanavond", "Naar het ziekenhuis", "Naar de kapper"], "Naar de film vanavond"),
                    mcq("m10-l2", "Waarom kan Lina niet om half acht?", ["Want ze eet met haar ouders", "Want ze houdt niet van films", "Want ze is op reis"], "Want ze eet met haar ouders"),
                    mcq(
                        "m10-l3",
                        "Welke oplossing kiest Noah?",
                        ["Tickets om negen uur", "Geen film meer", "Morgenochtend om zes"],
                        "Tickets om negen uur",
                    ),
                    mcq("m10-l4", "Waar afspreken?", ["Bij de kassa", "Bij de bakker", "Thuis bij Lina"], "Bij de kassa"),
                    mcq("m10-l5", "Welk woord geeft een beperking bij Lina?", ["maar", "dus", "en"], "maar"),
                ],
                "metadata": {},
            },
            pl(
                "m10-pl1",
                "Jouw beurt — 6×",
                ["film", "vanavond", "maar"],
                [
                    mcq("m10-p1", "Uitnodiging naar de film", ["Heb je zin om vanavond naar de film te gaan?", "Heb je zin film vanavond zonder woorden?", "Film je zin hebben?"], "Heb je zin om vanavond naar de film te gaan?"),
                    mcq("m10-p2", "Follow-up op een voorstel", ["Welke film?", "Welke brood?", "Welke dokter?"], "Welke film?"),
                    ro("m10-p3", "Zet in de juiste volgorde.", ["stress", "Geen", "."], "Geen stress."),
                    mcq("m10-p4", "Beleefd alternatief in de tijd", ["Laten we dan tickets voor negen uur nemen.", "Laten we dan de maan nemen.", "Laten we dan nooit praten."], "Laten we dan tickets voor negen uur nemen."),
                    mcq("m10-p5", "Afsluiting", ["Tot zo!", "Tot gisteren!", "Tot de politie!"], "Tot zo!"),
                    mcq("m10-p6", "Reden met *want*", ["Ik kan niet, want ik eet nog.", "Ik kan niet, want ik ben nog.", "Ik kan niet, en ik eet nog."], "Ik kan niet, want ik eet nog."),
                ],
            ),
            speak_step(
                "m10-sp1",
                "Spreuk 1 — uitnodiging",
                "Heb je zin om vanavond naar de film te gaan?",
                ["Heb je zin om vanavond naar de film te gaan", "heb je zin om vanavond naar de film te gaan"],
                "Heb je zin om vanavond naar de film te gaan",
                32,
            ),
            speak_step("m10-sp2", "Spreuk 2 — beperking", "Ik kan pas na achten, want ik eet nog met mijn ouders.", ["Ik kan pas na achten want ik eet nog met mijn ouders", "ik kan pas na achten want ik eet nog met mijn ouders"], "Ik kan pas na achten want ik eet nog met mijn ouders", 34),
            speak_step("m10-sp3", "Spreuk 3 — oplossing", "Laten we dan tickets voor negen uur nemen.", ["Laten we dan tickets voor negen uur nemen", "laten we dan tickets voor negen uur nemen"], "Laten we dan tickets voor negen uur nemen", 32),
            speak_step("m10-sp4", "Spreuk 4 — plek + afscheid", "We spreken af bij de kassa. Tot zo!", ["We spreken af bij de kassa tot zo", "we spreken af bij de kassa tot zo"], "We spreken af bij de kassa tot zo", 32),
            pl(
                "m10-pl2",
                "Fix — 6×",
                ["want", "omdat", "laten"],
                [
                    mcq("m10-q1", "Welke zin koppelt twee ideeën met *en*?", ["We gaan eten en daarna naar de film.", "We gaan eten want daarna de film.", "We gaan eten omdat daarna film."], "We gaan eten en daarna naar de film."),
                    fb("m10-q2", "Ik heb al ___, sorry. (geen tijd voor meer)", ["plannen", "films", "kassa"], "plannen"),
                    ro("m10-q3", "Zet in de juiste volgorde.", ["Laten", "we", "iets", "leuks", "doen", "!"], "Laten we iets leuks doen!"),
                    mcq("m10-q4", "Natuurlijk compliment op het plan", ["Dat klinkt leuk!", "Dat klinkt ziek!", "Dat ben ik leuk!"], "Dat klinkt leuk!"),
                    mcq("m10-q5", "Welke vraag is een follow-up?", ["Hoe laat begint de film?", "Hoe laat is je schoen?", "Hoe laat is de maan?"], "Hoe laat begint de film?"),
                    mcq("m10-q6", "Register: vrienden", ["Geen stress.", "Geachte heer, stress.", "Mijnheer Stress."], "Geen stress."),
                ],
                depth=True,
            ),
            {
                "id": "m10-recap",
                "type": "recap",
                "prompt": "Check",
                "content": {
                    "lemmas": ["film", "want", "vanavond"],
                    "tasks": [
                        {"kind": "listen_mcq", "question": "Noah zegt:", "snippetNl": "Laten we dan tickets voor negen uur nemen.", "options": ["Een nieuw voorstel.", "Een klacht.", "Een adres."], "correctAnswer": "Een nieuw voorstel."},
                        {"kind": "fill_blank", "sentence": "Ik kan niet, ___ ik werk. (reden)", "options": ["want", "maar", "en"], "correctAnswer": "want"},
                        {"kind": "reorder", "tokens": ["We", "spreken", "af", "bij", "de", "kassa"], "correctAnswer": "We spreken af bij de kassa"},
                        {"kind": "speak", "prompt": "Zeg: *Tot vanavond!*", "targetNl": "Tot vanavond!", "mockPass": True},
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["listening", "grammar"],
        "metadata": {**LM, "archetype": "task_full"},
    }

    # --- L11 review ---
    l11 = {
        "id": "a2-m03-l11-review-plans-social-life",
        "moduleId": MID,
        "title": "Review · Plans & social life",
        "lessonType": "review",
        "order": 10,
        "cefrLevel": "A2",
        "durationEstimate": 16,
        "grammarTargets": ["a2.1-invitations-patterns", "a2.1-linking-connectors", "a2.1-plans-time-phrases"],
        "vocabTargets": ["lemma-zin", "lemma-want", "lemma-morgen", "lemma-cafe", "lemma-afspreken", "lemma-uitnodigen", "lemma-reden"],
        "canDoStatements": [
            "I can retrieve invitation, reply, and connector chunks across skills.",
            "I can self-check short plan questions and answers.",
        ],
        "steps": [
            {
                "id": "m11-preview",
                "type": "preview",
                "prompt": "Opfrissen — 3 woorden",
                "content": {
                    "previewItems": [
                        {"id": "m11-p1", "word": "uitnodiging", "lemma": "uitnodigen", "translationEn": "invitation", "emoji": "✉️"},
                        {"id": "m11-p2", "word": "reden", "lemma": "reden", "translationEn": "reason", "emoji": "💡"},
                        {"id": "m11-p3", "word": "afspraak", "lemma": "afspreken", "translationEn": "arrangement", "emoji": "📅"},
                    ]
                },
                "interactionConfig": {"requireAllPreviewPlayed": True},
                "metadata": {},
            },
            {
                "id": "m11-listen",
                "type": "listening",
                "prompt": "Luister — mix",
                "content": {
                    "dialogue": [
                        {"speaker": "Mila", "nl": "Ga je mee naar de brunch zondag?", "en": "Are you coming to brunch on Sunday?"},
                        {"speaker": "Tim", "nl": "Graag! Hoe laat?", "en": "Gladly! What time?"},
                        {"speaker": "Mila", "nl": "Om elf uur bij Eddy’s, goed?", "en": "At eleven at Eddy's, okay?"},
                        {"speaker": "Tim", "nl": "Perfect. Ik kan niet te lang blijven, want ik werk in de middag.", "en": "Perfect. I can't stay long, because I'm working in the afternoon."},
                    ],
                    "hideTranscriptUntilPlayed": True,
                },
                "feedbackConfig": {"errorTags": ["listening"]},
                "exercises": [
                    mcq("m11-l1", "Waar nodigt Mila toe uit?", ["Brunch zondag", "Naar de dokter", "Naar school"], "Brunch zondag"),
                    mcq("m11-l2", "Hoe laat?", ["Om elf uur", "Om twee uur 's nachts", "Geen tijd"], "Om elf uur"),
                    mcq("m11-l3", "Waar?", ["Bij Eddy’s", "In de trein", "Thuis bij Tim"], "Bij Eddy’s"),
                    mcq("m11-l4", "Waarom kan Tim niet lang blijven?", ["Want hij werkt in de middag", "Want hij houdt niet van brunch", "Want hij is ziek"], "Want hij werkt in de middag"),
                ],
                "metadata": {},
            },
            pl(
                "m11-pl1",
                "Mix — 6×",
                ["zin", "zullen", "want"],
                [
                    mcq("m11-a1", "Uitnodiging", ["Heb je zin om te komen?", "Heb je zin komen zonder te?", "Zin heb je komen?"], "Heb je zin om te komen?"),
                    mcq("m11-a2", "Voorstel", ["Zullen we een wandeling maken?", "Zullen we een dokter maken?", "Zullen we de maan maken?"], "Zullen we een wandeling maken?"),
                    ro("m11-a3", "Zet in de juiste volgorde.", ["je", "Ga", "mee", "?", "vandaag"], "Ga je mee vandaag?"),
                    mcq("m11-a4", "Reden", ["Ik ben moe, want ik heb gewerkt.", "Ik ben moe, maar ik heb gewerkt.", "Ik ben moe, en ik heb niet gewerkt."], "Ik ben moe, want ik heb gewerkt."),
                    mcq("m11-a5", "Tegenstelling", ["Ik wil wel, maar ik kan niet.", "Ik wil wel want ik kan niet.", "Ik wil wel omdat ik kan niet."], "Ik wil wel, maar ik kan niet."),
                    mcq("m11-a6", "Afsluiting", ["Tot zondag!", "Tot gisteren!", "Tot de brunch!"], "Tot zondag!"),
                ],
            ),
            pl(
                "m11-pl2",
                "Nog 6×",
                ["wanneer", "waar", "misschien"],
                [
                    mcq("m11-b1", "Vraag naar beschikbaarheid", ["Wanneer heb je tijd?", "Waar heb je tijd?", "Hoeveel heb je tijd?"], "Wanneer heb je tijd?"),
                    fb("m11-b2", "___ spreken we af? (plek)", ["Waar", "Wanneer", "Hoeveel"], "Waar"),
                    ro("m11-b3", "Zet in de juiste volgorde.", ["laat", "Hoe", "begint", "het", "?"], "Hoe laat begint het?"),
                    mcq("m11-b4", "Voorzichtig voorstel", ["Misschien volgende week?", "Misschien nooit?", "Misschien ben ik een week?"], "Misschien volgende week?"),
                    mcq("m11-b5", "Positieve reactie", ["Dat klinkt leuk!", "Dat klinkt traag!", "Dat ben ik leuk!"], "Dat klinkt leuk!"),
                    mcq("m11-b6", "Natuurlijk *omdat*", ["Ik ga niet, omdat ik ziek ben.", "Ik ga niet omdat ben ik ziek.", "Omdat ik ga niet, ik ben ziek."], "Ik ga niet, omdat ik ziek ben."),
                ],
                depth=True,
            ),
            speak_step("m11-sp1", "Herhaal een uitnodiging", "Heb je zin om zondag brunch te doen?", ["Heb je zin om zondag brunch te doen", "heb je zin om zondag brunch te doen"], "Heb je zin om zondag brunch te doen", 32),
            speak_step("m11-sp2", "Sluit af", "Tot zondag!", ["Tot zondag", "tot zondag"], "Tot zondag"),
            {
                "id": "m11-recap",
                "type": "recap",
                "prompt": "Laatste check",
                "content": {
                    "lemmas": ["afspreken", "want", "misschien"],
                    "tasks": [
                        {
                            "kind": "listen_mcq",
                            "question": "Tim zegt:",
                            "snippetNl": "Graag! Hoe laat?",
                            "options": ["Ja + vraag naar tijd.", "Nee + klacht.", "Een adres."],
                            "correctAnswer": "Ja + vraag naar tijd.",
                        },
                        {"kind": "fill_blank", "sentence": "Zullen we ___ koffie drinken? (dag)", "options": ["morgen", "gisteren", "ooit"], "correctAnswer": "morgen"},
                        {"kind": "reorder", "tokens": ["niet", ",", "Ik", "kan", "want", "ik", "werk", "."], "correctAnswer": "Ik kan niet, want ik werk."},
                        {"kind": "speak", "prompt": "Zeg: *Waar spreken we af?*", "targetNl": "Waar spreken we af?", "mockPass": True},
                        {"kind": "fill_blank", "sentence": "Ga je ___ naar het park? (mee)", "options": ["mee", "weg", "op"], "correctAnswer": "mee"},
                        {
                            "kind": "listen_mcq",
                            "question": "Snippet:",
                            "snippetNl": "Misschien morgen?",
                            "options": ["Een alternatief voorstel.", "Een harde nee.", "Een weerbericht."],
                            "correctAnswer": "Een alternatief voorstel.",
                        },
                    ],
                },
                "metadata": {},
            },
        ],
        "reviewItemRefs": [],
        "mistakeFocus": ["word-order", "grammar"],
        "metadata": {**LM, "archetype": "review_mixed"},
    }

    return [l03, l04, l05, l06, l07, l08, l09, l10, l11]


def main() -> None:
    all_l = lessons()

    mod = {
        "id": MID,
        "title": "Plans & social life",
        "band": "A2.1",
        "description": "A2.1 bridge to social fluency: invitations, replies, availability, simple future references (vanavond, morgen), reasons with want/omdat, and short 4–6 line chats. Stage 6 depth v2.",
        "order": 2,
        "lessons": all_l,
        "grammarTargets": GRAMMAR,
        "vocabTargets": vocab_targets()
        + [
            {
                "id": "lemma-maar",
                "word": "maar",
                "lemma": "maar",
                "translation": "but",
                "partOfSpeech": "conj",
                "metadata": {"module": MID},
            },
            {
                "id": "lemma-en",
                "word": "en",
                "lemma": "en",
                "translation": "and",
                "partOfSpeech": "conj",
                "metadata": {"module": MID},
            },
            {
                "id": "lemma-wanneer",
                "word": "wanneer",
                "lemma": "wanneer",
                "translation": "when",
                "partOfSpeech": "adv",
                "metadata": {"module": MID},
            },
            {
                "id": "lemma-uitnodigen",
                "word": "uitnodigen",
                "lemma": "uitnodigen",
                "translation": "to invite",
                "partOfSpeech": "verb",
                "metadata": {"module": MID},
            },
            {
                "id": "lemma-collega",
                "word": "collega",
                "lemma": "collega",
                "translation": "colleague",
                "partOfSpeech": "noun",
                "metadata": {"module": MID},
            },
            {
                "id": "lemma-reden",
                "word": "reden",
                "lemma": "reden",
                "translation": "reason",
                "partOfSpeech": "noun",
                "metadata": {"module": MID},
            },
        ],
        "learningGoals": [
            "Invite and respond in informal and polite registers",
            "Negotiate time and place in short exchanges",
            "Give simple reasons with want / omdat",
            "Hold a 4–6 line social conversation about plans",
        ],
        "metadata": {
            "stage6": True,
            "contentVersion": "m03-v1",
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(mod, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
