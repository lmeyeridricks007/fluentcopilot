#!/usr/bin/env python3
"""Generate content/modules/a2-m04-work-professional/module.json (Stage 6 depth, band A2.2)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

MID = "a2-m04-work-professional"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/modules/a2-m04-work-professional/module.json"

LM = {
    "stage6": True,
    "schemaPlayer": True,
    "lessonDepth": {"m04": "v1", "targetMicroInteractions": "28-38"},
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


def ro_tokens(i: str, opts: list[str], ans: str) -> dict:
    return ro(i, "Zet in de juiste volgorde.", opts, ans)


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


def writing_step(
    sid: str,
    prompt: str,
    user_prompt: str,
    acceptable: list[str],
    model: str,
    min_chars: int = 12,
) -> dict:
    return {
        "id": sid,
        "type": "writing",
        "prompt": prompt,
        "content": {
            "prompt": user_prompt,
            "acceptable": acceptable,
            "modelNl": model,
            "minChars": min_chars,
        },
        "metadata": {},
    }


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
        d["metadata"] = {"depthLayer": "m04-v1"}
    return d


def preview_step(step_id: str, prompt: str, items: list[tuple[str, str, str, str]]) -> dict:
    """(word, lemma, translationEn, emoji)"""
    pis = []
    for i, (w, l, t, e) in enumerate(items, 1):
        pis.append(
            {
                "id": f"{step_id}-p{i}",
                "word": w,
                "lemma": l,
                "translationEn": t,
                "emoji": e,
            }
        )
    return {
        "id": step_id,
        "prompt": prompt,
        "content": {"previewItems": pis},
        "interactionConfig": {"requireAllPreviewPlayed": True},
        "metadata": {},
        "type": "preview",
    }


def listening_step(
    step_id: str,
    prompt: str,
    lines: list[tuple[str, str, str]],
    mcqs: list[tuple[str, list[str], str]],
) -> dict:
    dialogue = [{"speaker": a, "nl": b, "en": c} for a, b, c in lines]
    exercises = [mcq(f"{step_id}-l{i}", q, o, a) for i, (q, o, a) in enumerate(mcqs, 1)]
    return {
        "id": step_id,
        "prompt": prompt,
        "content": {"dialogue": dialogue, "hideTranscriptUntilPlayed": True},
        "feedbackConfig": {"errorTags": ["listening"]},
        "exercises": exercises,
        "metadata": {},
        "type": "listening",
    }


def listen_read_step(
    step_id: str,
    prompt: str,
    lines: list[tuple[str, str, str]],
    mcqs: list[tuple[str, list[str], str]],
) -> dict:
    dialogue = [{"speaker": a, "nl": b, "en": c} for a, b, c in lines]
    exercises = [mcq(f"{step_id}-e{i}", q, o, a) for i, (q, o, a) in enumerate(mcqs, 1)]
    return {
        "id": step_id,
        "prompt": prompt,
        "content": {"dialogue": dialogue},
        "feedbackConfig": {"errorTags": ["listening"]},
        "exercises": exercises,
        "metadata": {},
        "type": "listen_read",
    }


def discovery_step(step_id: str, prompt: str, phrases: list[tuple[str, str, str]]) -> dict:
    ph = [{"nl": n, "en": e, "focus": f} for n, e, f in phrases]
    return {"id": step_id, "prompt": prompt, "content": {"phrases": ph}, "metadata": {}, "type": "discovery"}


def grammar_card(step_id: str, prompt: str, title: str, summary: str, examples: list[tuple[str, str]]) -> dict:
    ex = [{"nl": n, "en": e} for n, e in examples]
    return {
        "id": step_id,
        "prompt": prompt,
        "content": {"title": title, "summary": summary, "examples": ex},
        "feedbackConfig": {"hint": "Korte zinnen; zakelijk maar vriendelijk."},
        "metadata": {},
        "type": "grammar_card",
    }


def recap_step(step_id: str, prompt: str, lemmas: list[str], tasks: list[dict]) -> dict:
    return {
        "id": step_id,
        "prompt": prompt,
        "content": {"lemmas": lemmas, "tasks": tasks},
        "metadata": {},
        "type": "recap",
    }


GRAMMAR = [
    {
        "id": "a2.2-present-workplace",
        "name": "Present tense at work",
        "description": "Ik werk als … / Ik doe meestal … — simple present for role and routines.",
        "examples": [
            {"nl": "Ik werk als developer.", "en": "I work as a developer."},
            {"nl": "Ik doe meestal meetings en mails.", "en": "I mostly do meetings and emails."},
        ],
        "cefrLevel": "A2",
        "rules": {"note": "Keep subject–verb–rest in main clauses."},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-modals-workplace",
        "name": "Modals: kunnen / moeten",
        "description": "Ability and obligation in short work messages and questions.",
        "examples": [
            {"nl": "Kun je dat herhalen?", "en": "Can you repeat that?"},
            {"nl": "Ik moet dit vandaag afmaken.", "en": "I have to finish this today."},
        ],
        "cefrLevel": "A2",
        "rules": {"kunnen": "question: modal first (Kun jij …?)"},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-separable-verbs-work",
        "name": "Separable verbs at work",
        "description": "Prefix splits to end in present: afmaken, voorbereiden, meenemen, meewerken.",
        "examples": [
            {"nl": "Ik maak dit rapport af.", "en": "I'm finishing this report."},
            {"nl": "Bereid je de slides voor?", "en": "Are you preparing the slides?"},
        ],
        "cefrLevel": "A2",
        "rules": {"pattern": "V2 + … + particle at end (main clause)."},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-clarification-work",
        "name": "Clarification & confirmation",
        "description": "Kun je dat herhalen? / Wat bedoel je? / Is dat duidelijk? / Dat is duidelijk. / Geen probleem.",
        "examples": [
            {"nl": "Wat bedoel je met ‘deadline’?", "en": "What do you mean by ‘deadline’?"},
            {"nl": "Is dat zo duidelijk, of zal ik het nog een keer uitleggen?", "en": "Is that clear, or shall I explain again?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-linking-work",
        "name": "Linking: want / omdat / maar",
        "description": "Connect two short work ideas: reason, contrast.",
        "examples": [
            {"nl": "Ik ben laat, want de trein had vertraging.", "en": "I'm late because the train was delayed."},
            {"nl": "Ik wil helpen, maar ik heb geen tijd.", "en": "I want to help, but I have no time."},
        ],
        "cefrLevel": "A2",
        "rules": {"want": "coordinating", "omdat": "subclause"},
        "metadata": {"module": MID},
    },
]

VOCAB = [
    ("lemma-werken", "werken", "werken", "to work", "verb"),
    ("lemma-collega", "collega", "collega", "colleague", "noun"),
    ("lemma-teamleider", "teamleider", "teamleider", "team lead", "noun"),
    ("lemma-meeting", "meeting", "meeting", "meeting", "noun"),
    ("lemma-afdeling", "afdeling", "afdeling", "department", "noun"),
    ("lemma-verantwoordelijk", "verantwoordelijk", "verantwoordelijk", "responsible", "adj"),
    ("lemma-project", "project", "project", "project", "noun"),
    ("lemma-thuiswerken", "thuiswerken", "thuiswerken", "to work from home", "verb"),
    ("lemma-bericht", "bericht", "bericht", "message", "noun"),
    ("lemma-kantoor", "kantoor", "kantoor", "office", "noun"),
    ("lemma-taak", "taak", "taak", "task", "noun"),
    ("lemma-beschikbaar", "beschikbaar", "beschikbaar", "available", "adj"),
    ("lemma-herhalen", "herhalen", "herhalen", "to repeat", "verb"),
    ("lemma-bedoelen", "bedoelen", "bedoelen", "to mean", "verb"),
    ("lemma-duidelijk", "duidelijk", "duidelijk", "clear", "adj"),
    ("lemma-geen-probleem", "geen probleem", "geen probleem", "no problem", "phrase"),
    ("lemma-voorbereiden", "voorbereiden", "voorbereiden", "to prepare", "verb"),
    ("lemma-afmaken", "afmaken", "afmaken", "to finish", "verb"),
    ("lemma-meewerken", "meewerken", "meewerken", "to cooperate / contribute", "verb"),
    ("lemma-meenemen", "meenemen", "meenemen", "to bring along", "verb"),
    ("lemma-opstaan", "opstaan", "opstaan", "to get up", "verb"),
    ("lemma-updaten", "updaten", "updaten", "to update", "verb"),
    ("lemma-deadline", "deadline", "deadline", "deadline", "noun"),
    ("lemma-agenda", "agenda", "agenda", "calendar / agenda", "noun"),
    ("lemma-moeten", "moeten", "moeten", "must / have to", "verb"),
    ("lemma-kunnen", "kunnen", "kunnen", "can / to be able", "verb"),
    ("lemma-want", "want", "want", "because (coord.)", "conj"),
    ("lemma-maar", "maar", "maar", "but", "conj"),
    ("lemma-omdat", "omdat", "omdat", "because (subord.)", "conj"),
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


def rt_listen_mcq(q: str, snippet: str, opts: list[str], ans: str) -> dict:
    return {"kind": "listen_mcq", "question": q, "snippetNl": snippet, "options": opts, "correctAnswer": ans}


def rt_fb(sentence: str, opts: list[str], ans: str) -> dict:
    return {"kind": "fill_blank", "sentence": sentence, "options": opts, "correctAnswer": ans}


def rt_ro(tokens: list[str], ans: str) -> dict:
    return {"kind": "reorder", "tokens": tokens, "correctAnswer": ans}


def rt_speak(prompt: str, target: str) -> dict:
    return {"kind": "speak", "prompt": prompt, "targetNl": target, "mockPass": True}


# --- Lessons ---


def lesson_l01() -> dict:
    lid = "a2-m04-l01-listening-at-work-introductions"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Listening · At work · introductions",
        "lessonType": "input",
        "order": 0,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-present-workplace", "a2.2-clarification-work"],
        "vocabTargets": ["lemma-collega", "lemma-kantoor", "lemma-afdeling", "lemma-teamleider", "lemma-bericht"],
        "canDoStatements": [
            "I can follow a short first-day introduction at the office.",
            "I can pick out names, roles, and polite greetings.",
        ],
        "mistakeFocus": ["listening-gist", "register"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m04-l01-preview",
                "Warm-up — 5 woorden",
                [
                    ("collega", "collega", "colleague", "👥"),
                    ("teamleider", "teamleider", "team lead", "🧑‍💼"),
                    ("afdeling", "afdeling", "department", "🏢"),
                    ("kantoor", "kantoor", "office", "🏬"),
                    ("kennismaken", "kennismaken", "to get acquainted", "🤝"),
                ],
            ),
            listening_step(
                "m04-l01-listen",
                "Input — eerste dag op kantoor",
                [
                    (
                        "Kim",
                        "Goedemorgen, welkom! Ik ben Kim, teamleider van de afdeling Support.",
                        "Good morning, welcome! I'm Kim, team lead of Support.",
                    ),
                    (
                        "Alex",
                        "Goedemorgen Kim, leuk om kennis te maken. Ik ben Alex, ik start vandaag.",
                        "Good morning Kim, nice to meet you. I'm Alex, I start today.",
                    ),
                    (
                        "Kim",
                        "Fijn. Je zit hier bij ons op kantoor, en je collega's zitten daar.",
                        "Great. You sit here in our office, and your colleagues sit over there.",
                    ),
                    (
                        "Alex",
                        "Oké. Mag ik even een vraag stellen?",
                        "Okay. May I ask a question?",
                    ),
                    (
                        "Kim",
                        "Natuurlijk. Geen probleem.",
                        "Of course. No problem.",
                    ),
                ],
                [
                    (
                        "Waar gaat dit gesprek over?",
                        ["Eerste kennismaking op werk", "Boodschappen doen", "Een doktersbezoek"],
                        "Eerste kennismaking op werk",
                    ),
                    (
                        "Wat is Kims rol?",
                        ["Teamleider", "Klant", "Kok"],
                        "Teamleider",
                    ),
                    (
                        "Hoe heet de nieuwe collega?",
                        ["Alex", "Kim", "Sam"],
                        "Alex",
                    ),
                    (
                        "Waar zitten de collega's volgens Kim?",
                        ["Daar (ergens anders in het kantoor)", "Thuis", "In de supermarkt"],
                        "Daar (ergens anders in het kantoor)",
                    ),
                    (
                        "Hoe reageert Kim op de vraag van Alex?",
                        ["Vriendelijk: natuurlijk, geen probleem", "Boos", "Ze geeft geen antwoord"],
                        "Vriendelijk: natuurlijk, geen probleem",
                    ),
                ],
            ),
            discovery_step(
                "m04-l01-discovery",
                "Guided noticing — vaste brokken",
                [
                    ("Leuk om kennis te maken.", "Nice to meet you.", "kennis"),
                    ("Ik ben …, ik werk als …", "I'm …, I work as …", "werk als"),
                    ("Mag ik even een vraag stellen?", "May I ask a question?", "vraag"),
                    ("Geen probleem.", "No problem.", "probleem"),
                ],
            ),
            pl(
                "m04-l01-pl1",
                "Controlled practice — 6×",
                ["collega", "kantoor", "afdeling"],
                [
                    mcq(
                        "m04-l01-a1",
                        "Welke zin hoort op je eerste werkdag?",
                        [
                            "Goedemorgen, leuk om kennis te maken.",
                            "Ik wil twee kilo kaas.",
                            "Waar is het zwembad?",
                        ],
                        "Goedemorgen, leuk om kennis te maken.",
                    ),
                    fb("m04-l01-a2", "Ik ben nieuw op dit ___.", ["kantoor", "brood", "strand"], "kantoor"),
                    ro_tokens("m04-l01-a3", ["stellen?", "Mag", "ik", "een", "vraag"], "Mag ik een vraag stellen?"),
                    mcq(
                        "m04-l01-a4",
                        "Natuurlijke reactie op ‘sorry voor de storing’",
                        ["Geen probleem.", "Ik ben een printer.", "Tot volgend jaar."],
                        "Geen probleem.",
                    ),
                    mcq(
                        "m04-l01-a5",
                        "Wie is je teamleider in de tekst?",
                        ["Kim", "Alex", "De buschauffeur"],
                        "Kim",
                    ),
                    mcq(
                        "m04-l01-a6",
                        "Welke context is professioneel maar vriendelijk?",
                        [
                            "Goedemorgen, welkom bij het team.",
                            "Hé loser, waar is je stoel?",
                            "Stilte, iedereen!",
                        ],
                        "Goedemorgen, welkom bij het team.",
                    ),
                ],
            ),
            pl(
                "m04-l01-pl2",
                "Variatie — 6×",
                ["teamleider", "bericht", "afdeling"],
                [
                    mcq(
                        "m04-l01-b1",
                        "Welk woord past bij ‘afdeling’?",
                        ["Support-afdeling", "Chocoladereep", "Trein"],
                        "Support-afdeling",
                    ),
                    fb("m04-l01-b2", "Ik stuur je een ___. (via de chat)", ["bericht", "tomaat", "fiets"], "bericht"),
                    ro_tokens("m04-l01-b3", ["te", "Leuk", "maken.", "kennis"], "Leuk om kennis te maken."),
                    mcq(
                        "m04-l01-b4",
                        "Wat vraag je als iets onduidelijk is?",
                        ["Kun je dat herhalen?", "Waar is de maan?", "Ik ben moe."],
                        "Kun je dat herhalen?",
                    ),
                    mcq(
                        "m04-l01-b5",
                        "Kies de beste reactie op ‘Ik ben Lisa.’",
                        ["Aangenaam, ik ben Tom.", "Ik ben een fiets.", "Goedemorgen, brood."],
                        "Aangenaam, ik ben Tom.",
                    ),
                    mcq(
                        "m04-l01-b6",
                        "‘Ik start vandaag’ betekent ongeveer",
                        ["Ik begin vandaag met werken", "Ik stop vandaag", "Ik ben op vakantie"],
                        "Ik begin vandaag met werken",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m04-l01-sp1",
                "Production — stel je voor",
                "Goedemorgen, ik ben Alex. Leuk om kennis te maken.",
                [
                    "Goedemorgen ik ben Alex leuk om kennis te maken",
                    "Goedemorgen, ik ben Alex. Leuk om kennis te maken.",
                ],
                "Goedemorgen ik ben Alex leuk om kennis te maken",
                tips="Rustig: *ik ben* + naam.",
            ),
            speak_step(
                "m04-l01-sp2",
                "Production — beleefd dank",
                "Dank je wel, dat is duidelijk.",
                ["Dank je wel dat is duidelijk", "Dank je wel, dat is duidelijk."],
                "Dank je wel dat is duidelijk",
            ),
            speak_step(
                "m04-l01-sp3",
                "Production — geen probleem",
                "Geen probleem.",
                ["Geen probleem", "geen probleem"],
                "Geen probleem",
            ),
            speak_step(
                "m04-l01-sp4",
                "Production — beleefd vragen",
                "Mag ik even een vraag stellen?",
                ["Mag ik even een vraag stellen", "mag ik even een vraag stellen"],
                "Mag ik even een vraag stellen",
                tips="Rustig: *Mag ik* + *even* klinkt vriendelijk op kantoor.",
            ),
            recap_step(
                "m04-l01-recap",
                "Recap",
                ["collega", "kantoor", "kennismaken"],
                [
                    rt_listen_mcq(
                        "Je hoort:",
                        "Welkom! Ik ben Kim, teamleider van Support.",
                        ["Een introductie op werk", "Een weerbericht", "Een recept"],
                        "Een introductie op werk",
                    ),
                    rt_fb("Ik stuur je een ___. (chat)", ["bericht", "kaas", "trein"], "bericht"),
                    rt_ro(["probleem.", "Geen"], "Geen probleem."),
                    rt_speak("Zeg: *Leuk om kennis te maken.*", "Leuk om kennis te maken."),
                    rt_listen_mcq(
                        "Toon:",
                        "Natuurlijk. Geen probleem.",
                        ["Vriendelijk en geruststellend", "Boos", "Sarcastisch"],
                        "Vriendelijk en geruststellend",
                    ),
                    rt_fb("Mag ik een ___ stellen?", ["vraag", "brood", "fiets"], "vraag"),
                ],
            ),
        ],
    }


def lesson_l02() -> dict:
    lid = "a2-m04-l02-listen-read-jobs-responsibilities"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Listening & reading · Jobs & responsibilities",
        "lessonType": "input",
        "order": 1,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-present-workplace", "a2.2-modals-workplace"],
        "vocabTargets": ["lemma-werken", "lemma-taak", "lemma-project", "lemma-verantwoordelijk", "lemma-meeting"],
        "canDoStatements": [
            "I can read a short internal bio and understand role + tasks.",
            "I can match responsibilities to simple Dutch phrases.",
        ],
        "metadata": LM,
        "steps": [
            preview_step(
                "m04-l02-preview",
                "Warm-up — 5 woorden",
                [
                    ("taak", "taak", "task", "✅"),
                    ("project", "project", "project", "📁"),
                    ("verantwoordelijk", "verantwoordelijk", "responsible", "🎯"),
                    ("meeting", "meeting", "meeting", "📅"),
                    ("werken", "werken", "to work", "💼"),
                ],
            ),
            listen_read_step(
                "m04-l02-lr",
                "Input — korte team-bio (lezen + luisteren)",
                [
                    (
                        "Tekst",
                        "Ik ben Sofia. Ik werk als projectcoördinator. Ik ben verantwoordelijk voor planning en deadlines.",
                        "I'm Sofia. I work as a project coordinator. I'm responsible for planning and deadlines.",
                    ),
                    (
                        "Tekst",
                        "Ik doe meestal drie meetings per week. Vandaag werk ik op kantoor; morgen werk ik thuis.",
                        "I usually have three meetings per week. Today I work at the office; tomorrow I work from home.",
                    ),
                    (
                        "Tekst",
                        "Als je vragen hebt over de agenda, stuur me een berichtje. Ik ben beschikbaar tot vijf uur.",
                        "If you have questions about the calendar, send me a message. I'm available until five.",
                    ),
                ],
                [
                    (
                        "Wat is Sofias functie?",
                        ["Projectcoördinator", "Kok", "Pilot"],
                        "Projectcoördinator",
                    ),
                    (
                        "Waar is Sofia verantwoordelijk voor?",
                        ["Planning en deadlines", "Alle salarissen", "Het weer"],
                        "Planning en deadlines",
                    ),
                    (
                        "Hoe vaak heeft ze ongeveer meetings?",
                        ["Drie per week", "Nul", "Elke minuut"],
                        "Drie per week",
                    ),
                    (
                        "Waar werkt ze morgen?",
                        ["Thuis", "Op Mars", "In de supermarkt"],
                        "Thuis",
                    ),
                    (
                        "Wat moet je doen met vragen over de agenda?",
                        ["Een bericht sturen", "Niets", "Hard schreeuwen"],
                        "Een bericht sturen",
                    ),
                ],
            ),
            discovery_step(
                "m04-l02-discovery",
                "Guided noticing",
                [
                    ("Ik werk als …", "I work as …", "werk als"),
                    ("Ik ben verantwoordelijk voor …", "I'm responsible for …", "verantwoordelijk"),
                    ("Ik doe meestal …", "I usually do …", "meestal"),
                    ("Ik ben beschikbaar …", "I'm available …", "beschikbaar"),
                ],
            ),
            pl(
                "m04-l02-pl1",
                "Controlled practice — 6×",
                ["taak", "project", "meeting"],
                [
                    mcq(
                        "m04-l02-p1",
                        "Welke zin beschrijft een rol?",
                        ["Ik werk als analist.", "Het regent.", "Ik ben een koekje."],
                        "Ik werk als analist.",
                    ),
                    fb("m04-l02-p2", "Ik ben verantwoordelijk voor dit ___.", ["project", "ijs", "sok"], "project"),
                    ro_tokens("m04-l02-p3", ["week.", "drie", "Ik", "meetings", "meestal", "doe"], "Ik doe meestal drie meetings per week."),
                    mcq(
                        "m04-l02-p4",
                        "‘Ik werk thuis’ betekent",
                        ["Ik werk vanuit huis", "Ik slaap op werk", "Ik ben ziek"],
                        "Ik werk vanuit huis",
                    ),
                    mcq(
                        "m04-l02-p5",
                        "Welke modal past: ___ je me helpen? (informeel)",
                        ["Kun", "Ben", "Heb"],
                        "Kun",
                    ),
                    mcq(
                        "m04-l02-p6",
                        "Natuurlijke update",
                        ["Ik stuur je later een update.", "Ik ben de update.", "Update de maan."],
                        "Ik stuur je later een update.",
                    ),
                ],
            ),
            pl(
                "m04-l02-pl2",
                "Variatie — 6×",
                ["verantwoordelijk", "beschikbaar", "deadline"],
                [
                    fb("m04-l02-q1", "De ___ is vrijdag. (Engels leenwoord, gebruikelijk op werk)", ["deadline", "pannenkoek", "olifant"], "deadline"),
                    ro_tokens("m04-l02-q2", ["voor", "verantwoordelijk", "Ik", "ben", "de", "planning"], "Ik ben verantwoordelijk voor de planning"),
                    mcq(
                        "m04-l02-q3",
                        "Kies de beste zin voor een collega",
                        ["Ik heb een vraag over de taak.", "Ik ben een taart.", "Waar is Jupiter?"],
                        "Ik heb een vraag over de taak.",
                    ),
                    mcq(
                        "m04-l02-q4",
                        "Wat betekent *beschikbaar* hier?",
                        ["Je hebt tijd om te helpen", "Je bent weg", "Je bent boos"],
                        "Je hebt tijd om te helpen",
                    ),
                    mcq(
                        "m04-l02-q5",
                        "Welke zin is logisch?",
                        ["Vandaag werk ik op kantoor.", "Vandaag eet ik het kantoor.", "Vandaag ben ik het kantoor."],
                        "Vandaag werk ik op kantoor.",
                    ),
                    mcq(
                        "m04-l02-q6",
                        "Koppel: verantwoordelijk + voor",
                        ["Ik ben verantwoordelijk voor de klanten.", "Ik ben verantwoordelijk de klanten.", "Ik verantwoordelijk voor ben."],
                        "Ik ben verantwoordelijk voor de klanten.",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m04-l02-sp1",
                "Production — je rol",
                "Ik werk als developer. Ik doe meestal code review en meetings.",
                [
                    "Ik werk als developer ik doe meestal code review en meetings",
                    "Ik werk als developer. Ik doe meestal code review en meetings.",
                ],
                "Ik werk als developer ik doe meestal code review en meetings",
            ),
            speak_step(
                "m04-l02-sp2",
                "Production — verantwoordelijkheid",
                "Ik ben verantwoordelijk voor het project.",
                ["Ik ben verantwoordelijk voor het project", "ik ben verantwoordelijk voor het project"],
                "Ik ben verantwoordelijk voor het project",
            ),
            recap_step(
                "m04-l02-recap",
                "Recap",
                ["werk als", "verantwoordelijk", "beschikbaar"],
                [
                    rt_fb("Ik ___ als designer.", ["werk", "eet", "slaap"], "werk"),
                    rt_ro(["voor", "Ik", "ben", "verantwoordelijk", "de", "deadlines"], "Ik ben verantwoordelijk voor de deadlines"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Morgen werk ik thuis.",
                        ["Thuiswerken", "Vakantie in Spanje", "Nachtdienst in fabriek"],
                        "Thuiswerken",
                    ),
                    rt_speak("Zeg: *Ik doe meestal drie meetings per week.*", "Ik doe meestal drie meetings per week."),
                    rt_fb("Ik ben beschikbaar ___ drie uur. (tot)", ["tot", "onder", "achter"], "tot"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Stuur me een berichtje over de agenda.",
                        ["Vraag om een kort bericht", "Bestel pizza", "Koop schoenen"],
                        "Vraag om een kort bericht",
                    ),
                ],
            ),
        ],
    }


def lesson_l03() -> dict:
    lid = "a2-m04-l03-grammar-talking-about-your-job"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Grammar & patterns · Talking about your job",
        "lessonType": "pattern",
        "order": 2,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-present-workplace", "a2.2-linking-work"],
        "vocabTargets": ["lemma-werken", "lemma-taak", "lemma-meeting", "lemma-want", "lemma-maar"],
        "canDoStatements": [
            "I can form simple job statements and short linked sentences (want/maar).",
        ],
        "mistakeFocus": ["word-order", "linking"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m04-l03-preview",
                "Warm-up — 4 woorden",
                [
                    ("meestal", "meestal", "usually", "📊"),
                    ("want", "want", "because", "🔗"),
                    ("maar", "maar", "but", "↩️"),
                    ("vandaag", "vandaag", "today", "📆"),
                ],
            ),
            grammar_card(
                "m04-l03-gc",
                "Pattern card",
                "Je baan uitleggen (kort)",
                "**Ik werk als …** + **Ik doe meestal …** + reden: **want** / contrast: **maar**.",
                [
                    ("Ik werk als consultant. Ik doe meestal klanten bellen.", "I work as a consultant. I mostly call clients."),
                    ("Ik ben druk, maar ik help je graag.", "I'm busy, but I'll gladly help you."),
                ],
            ),
            listening_step(
                "m04-l03-listen-mini",
                "Input — hetzelfde patroon, andere collega's",
                [
                    (
                        "Ibrahim",
                        "Ik werk als magazijnmedewerker. Ik pak meestal orders in het magazijn, maar vandaag help ik op de balie.",
                        "I work as a warehouse worker. I usually pick orders, but today I'm helping at the counter.",
                    ),
                    (
                        "Claire",
                        "Ik kan niet mee lunchen, want ik heb om twaalf uur een afspraak met een leverancier.",
                        "I can't join lunch because I have a noon appointment with a supplier.",
                    ),
                    (
                        "Ibrahim",
                        "Oké, geen probleem. Tot straks!",
                        "Okay, no problem. See you later!",
                    ),
                ],
                [
                    (
                        "Waar werkt Ibrahim meestal?",
                        ["In het magazijn", "Alleen thuis", "In het zwembad"],
                        "In het magazijn",
                    ),
                    (
                        "Waarom gaat Claire niet mee lunchen?",
                        ["Want ze heeft om twaalf uur een afspraak", "Want ze houdt niet van soep", "Want ze is met vakantie"],
                        "Want ze heeft om twaalf uur een afspraak",
                    ),
                    (
                        "Welk woord geeft contrast in Ibrahims eerste zin?",
                        ["maar", "want", "omdat"],
                        "maar",
                    ),
                    (
                        "Wat betekent *geen probleem* hier?",
                        ["Dat is goed / geen zorgen", "Ik ben boos", "Ik stop met praten"],
                        "Dat is goed / geen zorgen",
                    ),
                    (
                        "Welke zin gebruikt een reden met *want*?",
                        ["Ik kan niet mee lunchen, want ik heb een afspraak.", "Ik ben moe, maar ik kom.", "Waar is de koffie?"],
                        "Ik kan niet mee lunchen, want ik heb een afspraak.",
                    ),
                ],
            ),
            discovery_step(
                "m04-l03-discovery",
                "Guided noticing",
                [
                    ("Ik werk vandaag thuis.", "I'm working from home today.", "thuis"),
                    ("Ik heb veel taken, maar het lukt.", "I have many tasks, but it's working out.", "maar"),
                    ("Ik kan niet mee, want ik heb een deadline.", "I can't join, because I have a deadline.", "want"),
                    ("Dat is duidelijk.", "That's clear.", "duidelijk"),
                ],
            ),
            pl(
                "m04-l03-pl1",
                "Controlled — 6×",
                ["werken", "taak", "want"],
                [
                    ro_tokens("m04-l03-a1", ["thuis.", "Ik", "werk", "vandaag"], "Ik werk vandaag thuis."),
                    mcq(
                        "m04-l03-a2",
                        "Welke zin klopt?",
                        ["Ik werk als tester.", "Ik als werk tester.", "Werk ik als tester?"],
                        "Ik werk als tester.",
                    ),
                    fb("m04-l03-a3", "Ik kan niet mee, ___ ik moet werken.", ["want", "maar", "dus"], "want"),
                    mcq(
                        "m04-l03-a4",
                        "Contrast: druk + toch helpen",
                        ["Ik ben druk, maar ik help je graag.", "Ik ben druk en de maan.", "Druk maar fiets."],
                        "Ik ben druk, maar ik help je graag.",
                    ),
                    fb("m04-l03-a5", "Ik doe meestal ___ en e-mails. (afspraken)", ["meetings", "bananen", "wolken"], "meetings"),
                    mcq(
                        "m04-l03-a6",
                        "Kies natuurlijk Nederlands",
                        ["Ik heb een vraag over mijn taak.", "Ik ben een vraag.", "Vraag de taart."],
                        "Ik heb een vraag over mijn taak.",
                    ),
                ],
            ),
            pl(
                "m04-l03-pl2",
                "Variatie — 6×",
                ["maar", "omdat", "duidelijk"],
                [
                    mcq(
                        "m04-l03-b1",
                        "Wanneer gebruik je *omdat*?",
                        ["Reden in een bijzin", "Alleen bij groeten", "Voor de tijd"],
                        "Reden in een bijzin",
                    ),
                    fb(
                        "m04-l03-b2",
                        "Ik werk laat, ___ het druk is. (subordinatie)",
                        ["omdat", "want", "maar"],
                        "omdat",
                    ),
                    ro_tokens("m04-l03-b3", ["duidelijk.", "Dat", "is"], "Dat is duidelijk."),
                    mcq(
                        "m04-l03-b4",
                        "Welke vraag is professioneel?",
                        ["Wat bedoel je met ‘prioriteit’?", "Wat ben jij?", "Waar is je sok?"],
                        "Wat bedoel je met ‘prioriteit’?",
                    ),
                    mcq(
                        "m04-l03-b5",
                        "Juiste hoofdzin",
                        ["Vandaag focus ik op één taak.", "Vandaag taak één focus ik.", "Focus taak vandaag ik."],
                        "Vandaag focus ik op één taak.",
                    ),
                    mcq(
                        "m04-l03-b6",
                        "Beste bevestiging",
                        ["Dat is duidelijk, dank je.", "Dat is onduidelijk, houd je mond.", "Dat is een trein."],
                        "Dat is duidelijk, dank je.",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m04-l03-sp1",
                "Production",
                "Ik werk als designer. Ik doe meestal prototypes en overleg.",
                ["Ik werk als designer ik doe meestal prototypes en overleg", "Ik werk als designer. Ik doe meestal prototypes en overleg."],
                "Ik werk als designer ik doe meestal prototypes en overleg",
            ),
            speak_step(
                "m04-l03-sp2",
                "Production — maar",
                "Ik wil helpen, maar ik heb weinig tijd.",
                ["Ik wil helpen maar ik heb weinig tijd", "Ik wil helpen, maar ik heb weinig tijd."],
                "Ik wil helpen maar ik heb weinig tijd",
            ),
            recap_step(
                "m04-l03-recap",
                "Recap",
                ["werk als", "want", "maar"],
                [
                    rt_fb("Ik werk ___ marketeer.", ["als", "door", "onder"], "als"),
                    rt_ro(["thuis.", "Ik", "werk", "vandaag"], "Ik werk vandaag thuis."),
                    rt_speak("Zeg: *Dat is duidelijk.*", "Dat is duidelijk."),
                    rt_fb("Ik ben druk, ___ ik stuur je een bericht. (contrast)", ["maar", "want", "omdat"], "maar"),
                    rt_listen_mcq(
                        "Toon:",
                        "Ik kan niet mee, want ik moet een deadline halen.",
                        ["Reden met want", "Weerbericht", "Recept"],
                        "Reden met want",
                    ),
                    rt_fb("___ je dat herhalen? (informeel)", ["Kun", "Ben", "Word"], "Kun"),
                ],
            ),
        ],
    }


def lesson_l04() -> dict:
    lid = "a2-m04-l04-practice-work-verbs-routines"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Controlled practice · Work verbs & routines",
        "lessonType": "practice",
        "order": 3,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-present-workplace", "a2.2-modals-workplace"],
        "vocabTargets": ["lemma-updaten", "lemma-agenda", "lemma-bericht", "lemma-meeting", "lemma-kunnen", "lemma-moeten"],
        "canDoStatements": [
            "I can choose correct work-verb chunks in short office contexts.",
        ],
        "mistakeFocus": ["modal-choice", "collocation"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m04-l04-preview",
                "Warm-up — 5 woorden",
                [
                    ("updaten", "updaten", "to update", "🔄"),
                    ("agenda", "agenda", "calendar", "🗓️"),
                    ("moeten", "moeten", "must", "⚠️"),
                    ("kunnen", "kunnen", "can", "✅"),
                    ("bericht", "bericht", "message", "💬"),
                ],
            ),
            listening_step(
                "m04-l04-listen",
                "Input — korte stand-up (kantoor + tech)",
                [
                    (
                        "Tom",
                        "Goedemorgen team. Ik moet vandaag de planning in het systeem bijwerken.",
                        "Good morning team. I have to update the planning in the system today.",
                    ),
                    (
                        "Mira",
                        "Ik kan om elf uur een kort overleg doen, of even bellen als dat beter past.",
                        "I can do a short meeting at eleven, or hop on a call if that works better.",
                    ),
                    (
                        "Tom",
                        "Prima. Kun je daarna een kort bericht sturen via Teams?",
                        "Great. Can you send a short message via Teams afterwards?",
                    ),
                    (
                        "Mira",
                        "Ja, geen probleem. Ik ben beschikbaar tot twaalf uur.",
                        "Yes, no problem. I'm available until twelve.",
                    ),
                ],
                [
                    (
                        "Wat moet Tom vandaag (ongeveer)?",
                        ["De planning bijwerken", "Vakantie boeken", "Taart bakken"],
                        "De planning bijwerken",
                    ),
                    (
                        "Wat biedt Mira om elf uur aan?",
                        ["Een kort overleg (of bellen)", "Een feest", "Niets"],
                        "Een kort overleg (of bellen)",
                    ),
                    (
                        "Waar moet Mira het bericht sturen volgens Tom?",
                        ["Via Teams", "Per post", "Met de drone"],
                        "Via Teams",
                    ),
                    (
                        "Hoe lang is Mira beschikbaar (ongeveer)?",
                        ["Tot twaalf uur", "Tot middernacht op zondag", "Oneindig"],
                        "Tot twaalf uur",
                    ),
                ],
            ),
            discovery_step(
                "m04-l04-discovery",
                "Guided noticing",
                [
                    ("Ik moet … bijwerken.", "I have to update …", "bijwerken"),
                    ("Ik kan om … een overleg doen.", "I can have a short meeting at …", "overleg"),
                    ("Ik stuur je een bericht via …", "I'll send you a message via …", "bericht"),
                    ("Geen probleem.", "No problem.", "probleem"),
                ],
            ),
            pl(
                "m04-l04-pl1",
                "Practice loop — 6×",
                ["updaten", "agenda", "kunnen"],
                [
                    mcq(
                        "m04-l04-p1",
                        "Welke vraag hoort bij een afspraak plannen?",
                        ["Heb je donderdag om tien uur tijd?", "Heb je donderdag een pizza?", "Donderdag ben jij een agenda?"],
                        "Heb je donderdag om tien uur tijd?",
                    ),
                    fb("m04-l04-p2", "Ik ___ de lijst vandaag bijwerken. (moeten: ik)", ["moet", "ben", "heb"], "moet"),
                    mcq(
                        "m04-l04-p3",
                        "Beleefde vraag",
                        ["Kun je dit voor vijf uur afmaken?", "Maak nu!", "Jij nu af!"],
                        "Kun je dit voor vijf uur afmaken?",
                    ),
                    ro_tokens("m04-l04-p4", ["bericht.", "stuur", "Ik", "je", "een"], "Ik stuur je een bericht."),
                    mcq(
                        "m04-l04-p5",
                        "Wat betekent *beschikbaar tot twaalf*?",
                        ["Tot twaalf uur kan ik reageren", "Ik slaap tot twaalf", "Ik ben weg voor altijd"],
                        "Tot twaalf uur kan ik reageren",
                    ),
                    mcq(
                        "m04-l04-p6",
                        "Kies beste update",
                        ["Ik werk vandaag thuis. Ik stuur je later een update.", "Ik ben thuis en de update is een fiets.", "Update de zon."],
                        "Ik werk vandaag thuis. Ik stuur je later een update.",
                    ),
                ],
            ),
            pl(
                "m04-l04-pl2",
                "Variatie — 6×",
                ["moeten", "meeting", "overleg"],
                [
                    fb("m04-l04-q1", "___ je morgen mee op het overleg? (kunnen: je)", ["Kun", "Ben", "Word"], "Kun"),
                    mcq(
                        "m04-l04-q2",
                        "Zelfde idee: kort afstemmen op werk",
                        ["Een kort overleg", "Een lange vakantie", "Een pizza voor het team"],
                        "Een kort overleg",
                    ),
                    ro_tokens("m04-l04-q3", ["probleem.", "Geen"], "Geen probleem."),
                    mcq(
                        "m04-l04-q4",
                        "Welke vraag is informeel?",
                        ["Kun ik een vraag stellen?", "Mag ik een vraag stellen? (beleefd)", "Word ik een vraag?"],
                        "Kun ik een vraag stellen?",
                    ),
                    mcq(
                        "m04-l04-q5",
                        "Juiste volgorde-stem: Ik ___ vandaag niet mee. (kunnen)",
                        ["kan", "moet", "ben"],
                        "kan",
                    ),
                    mcq(
                        "m04-l04-q6",
                        "Natuurlijke reactie op dank",
                        ["Graag gedaan.", "Ik ben graag.", "Graag de maan."],
                        "Graag gedaan.",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m04-l04-sp1",
                "Production",
                "Ik moet dit vandaag afmaken. Ik stuur je een bericht.",
                ["Ik moet dit vandaag afmaken ik stuur je een bericht", "Ik moet dit vandaag afmaken. Ik stuur je een bericht."],
                "Ik moet dit vandaag afmaken ik stuur je een bericht",
            ),
            speak_step(
                "m04-l04-sp2",
                "Production — modal + tijd",
                "Ik kan om elf uur. Daarna stuur ik je een bericht.",
                ["Ik kan om elf uur daarna stuur ik je een bericht", "Ik kan om elf uur. Daarna stuur ik je een bericht."],
                "Ik kan om elf uur daarna stuur ik je een bericht",
                tips="Let op: *Daarna* = daarna.",
            ),
            recap_step(
                "m04-l04-recap",
                "Recap",
                ["moeten", "kunnen", "bericht"],
                [
                    rt_fb("Ik ___ je zo een update sturen. (zullen informeel: ga)", ["ga", "ben", "word"], "ga"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Kun je daarna een kort bericht sturen via Teams?",
                        ["Vraag om een bericht via chat", "Bestel koffie", "Vraag om verlof"],
                        "Vraag om een bericht via chat",
                    ),
                    rt_ro(["vijf", "voor", "afmaken?", "Kun", "je", "dit", "uur"], "Kun je dit voor vijf uur afmaken?"),
                    rt_speak("Zeg: *Geen probleem.*", "Geen probleem."),
                    rt_fb("Ik ben beschikbaar ___ twee uur. (tot)", ["tot", "boven", "naast"], "tot"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Ik moet vandaag de planning bijwerken.",
                        ["Taak voor vandaag", "Weekendplan", "Weerbericht"],
                        "Taak voor vandaag",
                    ),
                    rt_speak("Zeg: *Ik stuur je een bericht.*", "Ik stuur je een bericht."),
                ],
            ),
        ],
    }


def lesson_l05() -> dict:
    lid = "a2-m04-l05-speaking-introduce-yourself-at-work"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Speaking · Introduce yourself at work",
        "lessonType": "speaking",
        "order": 4,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-present-workplace", "a2.2-clarification-work"],
        "vocabTargets": ["lemma-collega", "lemma-teamleider", "lemma-werken", "lemma-project", "lemma-afdeling"],
        "canDoStatements": [
            "I can introduce myself, say my role, answer one question, and ask a simple follow-up.",
        ],
        "mistakeFocus": ["register", "word-order"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m04-l05-preview",
                "Warm-up — 5 woorden",
                [
                    ("introductie", "introductie", "introduction", "🎤"),
                    ("functie", "functie", "role / position", "🪪"),
                    ("sinds", "sinds", "since", "📌"),
                    ("samenwerken", "samenwerken", "to collaborate", "🤝"),
                    ("plezier", "plezier", "pleasure", "😊"),
                ],
            ),
            listening_step(
                "m04-l05-listen",
                "Input — koffiehoek op kantoor",
                [
                    ("Noah", "Hoi, ik ben Noah van Marketing. En jij?", "Hi, I'm Noah from Marketing. And you?"),
                    ("Rana", "Hoi! Ik ben Rana. Ik werk als data-analist sinds februari.", "Hi! I'm Rana. I've worked as a data analyst since February."),
                    ("Noah", "Ah, leuk. Waar werk je meestal, thuis of op kantoor?", "Ah, nice. Where do you usually work, home or office?"),
                    ("Rana", "Meestal hybride. Ik heb nog een vraag: wie is onze teamleider hier?", "Usually hybrid. I still have a question: who is our team lead here?"),
                    ("Noah", "Dat is Lisa. Ik stuur je zo een bericht met haar naam.", "That's Lisa. I'll send you a message with her name in a bit."),
                ],
                [
                    ("Waar zijn Noah en Rana ongeveer?", ["Op kantoor (informeel)", "In een zwembad", "Op de markt"], "Op kantoor (informeel)"),
                    ("Wat is Rana's functie?", ["Data-analist", "Kok", "Piloot"], "Data-analist"),
                    ("Wat vraagt Noah over werken?", ["Thuis of op kantoor", "Je schoenmaat", "Je favoriete kleur"], "Thuis of op kantoor"),
                    ("Welke follow-up vraag stelt Rana?", ["Wie is onze teamleider?", "Waar is de maan?", "Hoeveel kost brood?"], "Wie is onze teamleider?"),
                    ("Hoe helpt Noah verder?", ["Hij stuurt een bericht met info", "Hij geeft een pizza", "Hij stopt het gesprek"], "Hij stuurt een bericht met info"),
                ],
            ),
            discovery_step(
                "m04-l05-discovery",
                "Guided noticing — spreekpatronen",
                [
                    ("Ik ben … Ik werk als …", "I'm … I work as …", "werk als"),
                    ("Ik werk hier sinds …", "I've worked here since …", "sinds"),
                    ("Ik heb nog een vraag: …", "I have another question: …", "vraag"),
                    ("Kun je dat herhalen?", "Can you repeat that?", "herhalen"),
                ],
            ),
            pl(
                "m04-l05-pl1",
                "Kies de beste reactie — 6×",
                ["collega", "teamleider", "introductie"],
                [
                    mcq(
                        "m04-l05-a1",
                        "Iemand zegt: ‘Ik ben Tom van Finance.’ Jij:",
                        ["Aangenaam, ik ben Sara van Support.", "Ik ben een fiets.", "Tot ziens, brood."],
                        "Aangenaam, ik ben Sara van Support.",
                    ),
                    mcq(
                        "m04-l05-a2",
                        "Natuurlijke vraag na een intro",
                        ["Wat doe jij precies op dit project?", "Hoeveel weeg je?", "Waar is Jupiter?"],
                        "Wat doe jij precies op dit project?",
                    ),
                    fb("m04-l05-a3", "Ik werk als ___. (international)", ["developer", "olifant", "soep"], "developer"),
                    ro_tokens("m04-l05-a4", ["vraag:", "een", "Ik", "heb", "nog"], "Ik heb nog een vraag:"),
                    mcq(
                        "m04-l05-a5",
                        "Je hoort iets te snel. Wat zeg je?",
                        ["Kun je dat herhalen?", "Ik ben de snelheid.", "Stilte maar."],
                        "Kun je dat herhalen?",
                    ),
                    mcq(
                        "m04-l05-a6",
                        "Bevestig begrip",
                        ["Dat is duidelijk, dank je.", "Dat is onduidelijk, ga weg.", "Dat is een printer."],
                        "Dat is duidelijk, dank je.",
                    ),
                ],
            ),
            pl(
                "m04-l05-pl2",
                "Variatie — 6×",
                ["sinds", "thuiswerken", "bericht"],
                [
                    mcq(
                        "m04-l05-b1",
                        "Welke zin klinkt als een expat op kantoor (goed)?",
                        ["Ik werk hier sinds maart, nog even zoeken hoe alles loopt.", "Ik ben maart sinds hier werk zoeken.", "Sinds ik maandag ben ik de koffie."],
                        "Ik werk hier sinds maart, nog even zoeken hoe alles loopt.",
                    ),
                    fb("m04-l05-b2", "Ik stuur je een ___ met de link. (chat)", ["bericht", "brood", "olifant"], "bericht"),
                    ro_tokens("m04-l05-b3", ["bedoel", "je?", "Wat"], "Wat bedoel je?"),
                    mcq(
                        "m04-l05-b4",
                        "Hoe vraag je beleefd om uitleg?",
                        ["Wat bedoel je met ‘sprint’?", "Wat ben sprint?", "Sprint jij mij?"],
                        "Wat bedoel je met ‘sprint’?",
                    ),
                    mcq(
                        "m04-l05-b5",
                        "Teamleider =",
                        ["Iemand die het team coördineert", "Iemand die koffie zet", "De lift"],
                        "Iemand die het team coördineert",
                    ),
                    mcq(
                        "m04-l05-b6",
                        "Slotzin na een fijne kennismaking",
                        ["Prettig je te ontmoeten!", "Ik haat maandag!", "Tot in de supermarkt!"],
                        "Prettig je te ontmoeten!",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m04-l05-sp1",
                "Turn 1 — voorstellen",
                "Hoi, ik ben Alex. Ik werk als developer op dit project.",
                ["Hoi ik ben Alex ik werk als developer op dit project", "Hoi, ik ben Alex. Ik werk als developer op dit project."],
                "Hoi ik ben Alex ik werk als developer op dit project",
            ),
            speak_step(
                "m04-l05-sp2",
                "Turn 2 — rol kort",
                "Ik doe meestal code schrijven en reviews.",
                ["Ik doe meestal code schrijven en reviews", "Ik doe meestal code schrijven en reviews."],
                "Ik doe meestal code schrijven en reviews",
            ),
            speak_step(
                "m04-l05-sp3",
                "Turn 3 — antwoord op vraag",
                "Meestal werk ik op kantoor, maar vrijdag thuis.",
                ["Meestal werk ik op kantoor maar vrijdag thuis", "Meestal werk ik op kantoor, maar vrijdag thuis."],
                "Meestal werk ik op kantoor maar vrijdag thuis",
            ),
            speak_step(
                "m04-l05-sp4",
                "Turn 4 — follow-up vraag",
                "Ik heb een vraag: wie is onze teamleider?",
                ["Ik heb een vraag wie is onze teamleider", "Ik heb een vraag: wie is onze teamleider?"],
                "Ik heb een vraag wie is onze teamleider",
            ),
            recap_step(
                "m04-l05-recap",
                "Recap",
                ["introductie", "werk als", "vraag"],
                [
                    rt_speak("Zeg: *Ik werk als analist.*", "Ik werk als analist."),
                    rt_ro(["herhalen?", "Kun", "je", "dat"], "Kun je dat herhalen?"),
                    rt_fb("___ bedoel je met ‘deadline’? (vragen)", ["Wat", "Hoe", "Waar"], "Wat"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Ik stuur je zo een bericht met haar naam.",
                        ["Belofte om info te sturen", "Uitnodiging voor vakantie", "Klacht over weer"],
                        "Belofte om info te sturen",
                    ),
                    rt_fb("Dat is ___, dank je. (begrip)", ["duidelijk", "traag", "duur"], "duidelijk"),
                    rt_speak("Zeg: *Prettig je te ontmoeten.*", "Prettig je te ontmoeten."),
                ],
            ),
        ],
    }


def lesson_l06() -> dict:
    lid = "a2-m04-l06-listening-meetings-workplace"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Listening · Meetings & workplace conversations",
        "lessonType": "input",
        "order": 5,
        "cefrLevel": "A2",
        "durationEstimate": 14,
        "grammarTargets": ["a2.2-modals-workplace", "a2.2-clarification-work"],
        "vocabTargets": ["lemma-meeting", "lemma-agenda", "lemma-beschikbaar", "lemma-herhalen", "lemma-duidelijk"],
        "canDoStatements": [
            "I can follow a short meeting opener: time, agenda, and action check-ins.",
        ],
        "metadata": LM,
        "steps": [
            preview_step(
                "m04-l06-preview",
                "Warm-up — 5 woorden",
                [
                    ("agendapunt", "agendapunt", "agenda item", "📋"),
                    ("besluit", "besluit", "decision", "✔️"),
                    ("volgende stappen", "volgende stappen", "next steps", "➡️"),
                    ("inzicht", "inzicht", "insight", "💡"),
                    ("kort", "kort", "brief / short", "⏱️"),
                ],
            ),
            listening_step(
                "m04-l06-listen",
                "Input — meeting start (15 min)",
                [
                    ("Lisa", "Oké team, we beginnen. Het is kwart over tien. Eerste punt: project Alpha.", "Okay team, we're starting. It's quarter past ten. First item: project Alpha."),
                    ("Jasper", "Ik geef een korte update: we zijn bijna klaar, maar we moeten nog testen.", "I'll give a short update: we're almost done, but we still have to test."),
                    ("Lisa", "Duidelijk. Wanneer is de volgende meeting?", "Clear. When is the next meeting?"),
                    ("Mila", "Donderdag om tien uur, in dezelfde vergaderruimte.", "Thursday at ten, in the same meeting room."),
                    ("Lisa", "Prima. Kun je dat nog een keer herhalen, Mila? Ik was even afgeleid.", "Great. Can you repeat that, Mila? I was distracted for a moment."),
                    ("Mila", "Ja: donderdag tien uur, hier.", "Yes: Thursday ten o'clock, here."),
                ],
                [
                    ("Waar gaat de meeting over?", ["Project Alpha + updates", "Weekendfeest", "Sport"], "Project Alpha + updates"),
                    ("Wat moet het team nog volgens Jasper?", ["Nog testen", "Niets", "Vakantie boeken"], "Nog testen"),
                    ("Wanneer is de volgende meeting?", ["Donderdag om tien uur", "Maandag om middernacht", "Geen idee in de tekst"], "Donderdag om tien uur"),
                    ("Waar is de meeting?", ["In dezelfde vergaderruimte", "Op het strand", "Thuis bij Lisa"], "In dezelfde vergaderruimte"),
                    ("Waarom vraagt Lisa om herhaling?", ["Ze was even afgeleid", "Ze is boos", "Ze wil stoppen"], "Ze was even afgeleid"),
                ],
            ),
            discovery_step(
                "m04-l06-discovery",
                "Guided noticing",
                [
                    ("Wanneer is de meeting?", "When is the meeting?", "Wanneer"),
                    ("Ik geef een korte update.", "I'll give a short update.", "update"),
                    ("Kun je dat herhalen?", "Can you repeat that?", "herhalen"),
                    ("Dat is duidelijk.", "That's clear.", "duidelijk"),
                ],
            ),
            pl(
                "m04-l06-pl1",
                "Practice — 6×",
                ["meeting", "agenda", "beschikbaar"],
                [
                    mcq(
                        "m04-l06-p1",
                        "Formele opener",
                        ["Laten we beginnen. Eerste agendapunt …", "Ik ben een agenda.", "Stilte voor altijd."],
                        "Laten we beginnen. Eerste agendapunt …",
                    ),
                    fb("m04-l06-p2", "___ is de volgende meeting? (tijd vragen)", ["Wanneer", "Waarom", "Hoeveel"], "Wanneer"),
                    ro_tokens("m04-l06-p3", ["update:", "korte", "een", "Ik", "geef"], "Ik geef een korte update:"),
                    mcq(
                        "m04-l06-p4",
                        "Je bent niet zeker wat ‘TBD’ betekent. Je zegt:",
                        ["Wat bedoel je met TBD?", "TBD ben ik.", "Ik ben TBD."],
                        "Wat bedoel je met TBD?",
                    ),
                    mcq(
                        "m04-l06-p5",
                        "Bevestigen dat je het snapt",
                        ["Oké, dat is duidelijk.", "Oké, ik ben de duidelijkheid.", "Duidelijk is een fiets."],
                        "Oké, dat is duidelijk.",
                    ),
                    mcq(
                        "m04-l06-p6",
                        "Afspraak plannen: beste zin",
                        ["Ik ben beschikbaar om tien uur te bellen.", "Ik ben beschikbaar de maan.", "Beschikbaar ik om tien."],
                        "Ik ben beschikbaar om tien uur te bellen.",
                    ),
                ],
            ),
            pl(
                "m04-l06-pl2",
                "Variatie — 6×",
                ["herhalen", "volgende", "kort"],
                [
                    mcq(
                        "m04-l06-q1",
                        "Synoniem voor ‘nog een keer zeggen’",
                        ["Herhalen", "Vergeten", "Rennen"],
                        "Herhalen",
                    ),
                    fb("m04-l06-q2", "Kun je dat ___, alsjeblieft? (herhalen)", ["herhalen", "slapen", "zwemmen"], "herhalen"),
                    ro_tokens("m04-l06-q3", ["is", "de", "Wanneer", "meeting", "?"], "Wanneer is de meeting?"),
                    mcq(
                        "m04-l06-q4",
                        "Korte check-in",
                        ["Even kort: waar staan we?", "Even lang: vertel je leven.", "Waar is mijn kat?"],
                        "Even kort: waar staan we?",
                    ),
                    mcq(
                        "m04-l06-q5",
                        "Als je iets mist in de agenda",
                        ["Ik heb een vraag over punt drie.", "Ik ben punt drie.", "Punt drie is lekker."],
                        "Ik heb een vraag over punt drie.",
                    ),
                    mcq(
                        "m04-l06-q6",
                        "Geen tijd meer",
                        ["Laten we dit morgen afmaken.", "Laten we dit nooit meer zien.", "Morgen is een pizza."],
                        "Laten we dit morgen afmaken.",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m04-l06-sp1",
                "Production",
                "Wanneer is de meeting? Ik ben beschikbaar op donderdag.",
                ["Wanneer is de meeting ik ben beschikbaar op donderdag", "Wanneer is de meeting? Ik ben beschikbaar op donderdag."],
                "Wanneer is de meeting ik ben beschikbaar op donderdag",
            ),
            speak_step(
                "m04-l06-sp2",
                "Production — herhaling vragen",
                "Sorry, kun je dat herhalen?",
                ["Sorry kun je dat herhalen", "Sorry, kun je dat herhalen?"],
                "Sorry kun je dat herhalen",
            ),
            speak_step(
                "m04-l06-sp3",
                "Production — update",
                "Ik geef een korte update: we zijn bijna klaar.",
                ["Ik geef een korte update we zijn bijna klaar", "Ik geef een korte update: we zijn bijna klaar."],
                "Ik geef een korte update we zijn bijna klaar",
            ),
            recap_step(
                "m04-l06-recap",
                "Recap",
                ["meeting", "herhalen", "duidelijk"],
                [
                    rt_ro(["meeting?", "Wanneer", "is", "de"], "Wanneer is de meeting?"),
                    rt_speak("Zeg: *Dat is duidelijk.*", "Dat is duidelijk."),
                    rt_fb("Kun je dat ___? (nog een keer)", ["herhalen", "kopen", "bakken"], "herhalen"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Kun je dat nog een keer herhalen?",
                        ["Vraag om herhaling", "Uitnodiging voor feest", "Bestelling brood"],
                        "Vraag om herhaling",
                    ),
                    rt_fb("Ik ben beschikbaar ___ vier uur. (vanaf)", ["vanaf", "onder", "achter"], "vanaf"),
                    rt_speak("Zeg: *Ik geef een korte update.*", "Ik geef een korte update."),
                    rt_listen_mcq(
                        "Snippet:",
                        "Wanneer is de volgende meeting?",
                        ["Planning / tijd vragen", "Bestellen bij de bakker", "Sportschool"],
                        "Planning / tijd vragen",
                    ),
                ],
            ),
        ],
    }


def lesson_l07() -> dict:
    lid = "a2-m04-l07-grammar-separable-verbs"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Grammar & patterns · Separable verbs",
        "lessonType": "pattern",
        "order": 6,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-separable-verbs-work", "a2.2-modals-workplace"],
        "vocabTargets": ["lemma-afmaken", "lemma-voorbereiden", "lemma-meenemen", "lemma-meewerken", "lemma-opstaan"],
        "canDoStatements": [
            "I can place separable particles correctly in simple work sentences.",
        ],
        "mistakeFocus": ["separable-verb", "word-order"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m04-l07-preview",
                "Warm-up — 5 woorden",
                [
                    ("afmaken", "afmaken", "to finish", "🏁"),
                    ("voorbereiden", "voorbereiden", "to prepare", "📝"),
                    ("meenemen", "meenemen", "to bring along", "🎒"),
                    ("meewerken", "meewerken", "to cooperate", "🧩"),
                    ("opstaan", "opstaan", "to get up", "⏰"),
                ],
            ),
            grammar_card(
                "m04-l07-gc",
                "Scheidbare werkwoorden (werk)",
                "Partikel naar het einde",
                "In de tegenwoordige tijd staat het **werkwoord op V2** en het **voorzetsel/partikel aan het eind** (hoofdzin).",
                [
                    ("Ik maak dit vandaag af.", "I'm finishing this today."),
                    ("Bereid je de slides voor?", "Are you preparing the slides?"),
                    ("Neem je je laptop mee?", "Are you bringing your laptop?"),
                ],
            ),
            discovery_step(
                "m04-l07-discovery",
                "Guided noticing",
                [
                    ("Ik werk vandaag mee aan de workshop.", "I'm participating in the workshop today.", "mee"),
                    ("Ik moet het rapport afmaken.", "I have to finish the report.", "afmaken"),
                    ("Kun je de documenten meenemen?", "Can you bring the documents?", "meenemen"),
                    ("Ik sta elke dag vroeg op.", "I get up early every day.", "opstaan"),
                ],
            ),
            pl(
                "m04-l07-pl1",
                "Transform / kies — 6×",
                ["afmaken", "voorbereiden", "meenemen"],
                [
                    mcq(
                        "m04-l07-a1",
                        "Welke zin is goed?",
                        ["Ik maak de taak vandaag af.", "Ik af maak de taak vandaag.", "Maak ik af de taak vandaag."],
                        "Ik maak de taak vandaag af.",
                    ),
                    ro_tokens("m04-l07-a2", ["voor?", "Bereid", "je", "de", "meeting"], "Bereid je de meeting voor?"),
                    fb("m04-l07-a3", "Neem je je notities ___? (meenemen)", ["mee", "af", "op"], "mee"),
                    mcq(
                        "m04-l07-a4",
                        "Vraagzin met meewerken",
                        ["Wil je morgen meewerken aan de test?", "Wil je morgen werken mee aan de test?", "Mee wil je morgen werken test?"],
                        "Wil je morgen meewerken aan de test?",
                    ),
                    ro_tokens("m04-l07-a5", ["af.", "Ik", "moet", "dit", "rapport"], "Ik moet dit rapport afmaken."),
                    mcq(
                        "m04-l07-a6",
                        "Lichte referentie: opstaan",
                        ["Ik sta meestal om zeven uur op.", "Ik op sta meestal om zeven.", "Sta ik op zeven meestal."],
                        "Ik sta meestal om zeven uur op.",
                    ),
                ],
            ),
            pl(
                "m04-l07-pl2",
                "Variatie — 6×",
                ["meewerken", "kunnen", "moeten"],
                [
                    fb("m04-l07-b1", "___ je dit voor de stand-up afmaken? (kunnen: je)", ["Kun", "Ben", "Word"], "Kun"),
                    mcq(
                        "m04-l07-b2",
                        "Juiste volgorde-stem",
                        ["We moeten het plan vandaag afmaken.", "We afmaken moeten het plan vandaag.", "Moeten we af het plan vandaag maken."],
                        "We moeten het plan vandaag afmaken.",
                    ),
                    ro_tokens("m04-l07-b3", ["meeting.", "voor", "de", "Ik", "bereid"], "Ik bereid de meeting voor."),
                    mcq(
                        "m04-l07-b4",
                        "Meenemen in een mailtje",
                        ["Kun je de charger meenemen?", "Kun je meenemen de charger?", "Meenemen kun charger?"],
                        "Kun je de charger meenemen?",
                    ),
                    mcq(
                        "m04-l07-b5",
                        "Werk + mee (betekenis)",
                        ["Samen helpen / meedoen", "Alleen slapen", "Naar huis zonder reden"],
                        "Samen helpen / meedoen",
                    ),
                    mcq(
                        "m04-l07-b6",
                        "Fout herkennen",
                        ["Ik voorbereid de slides vandaag.", "Ik bereid de slides vandaag voor.", "Ik bereid voor de slides vandaag."],
                        "Ik bereid de slides vandaag voor.",
                    ),
                ],
                depth=True,
            ),
            pl(
                "m04-l07-pl3",
                "Extra drill — 6×",
                ["afmaken", "meenemen", "voorbereiden"],
                [
                    mcq(
                        "m04-l07-c1",
                        "Kies natuurlijk",
                        ["Laten we dit punt snel afmaken.", "Laten we dit punt snel maken af.", "Afmaken laten snel punt."],
                        "Laten we dit punt snel afmaken.",
                    ),
                    fb("m04-l07-c2", "Ik neem morgen mijn laptop ___. (meenemen)", ["mee", "af", "op"], "mee"),
                    ro_tokens("m04-l07-c3", ["afmaken.", "moet", "Ik", "dit", "vandaag"], "Ik moet dit vandaag afmaken."),
                    mcq(
                        "m04-l07-c4",
                        "Modal + scheidbaar",
                        ["Je moet de slides vandaag afmaken.", "Je moet afmaken de slides vandaag.", "Je afmaken moet slides vandaag."],
                        "Je moet de slides vandaag afmaken.",
                    ),
                    mcq(
                        "m04-l07-c5",
                        "Context: collega vraagt laptop",
                        ["Neem je je laptop mee naar de meeting?", "Neem je mee je laptop naar de meeting?", "Mee neem je laptop meeting?"],
                        "Neem je je laptop mee naar de meeting?",
                    ),
                    mcq(
                        "m04-l07-c6",
                        "Simpele check",
                        ["Ik werk mee aan dit project.", "Ik mee werk aan dit project.", "Werk ik mee project dit aan."],
                        "Ik werk mee aan dit project.",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m04-l07-sp1",
                "Production",
                "Ik moet dit rapport vandaag afmaken.",
                ["Ik moet dit rapport vandaag afmaken", "ik moet dit rapport vandaag afmaken"],
                "Ik moet dit rapport vandaag afmaken",
            ),
            speak_step(
                "m04-l07-sp2",
                "Production — meenemen",
                "Neem je je laptop mee?",
                ["Neem je je laptop mee", "neem je je laptop mee"],
                "Neem je je laptop mee",
            ),
            recap_step(
                "m04-l07-recap",
                "Recap",
                ["afmaken", "voorbereiden", "meenemen"],
                [
                    rt_ro(["af.", "Ik", "maak", "deze", "taak"], "Ik maak deze taak af."),
                    rt_fb("Bereid je de slides ___? (voorbereiden)", ["voor", "af", "mee"], "voor"),
                    rt_speak("Zeg: *Neem je je notities mee?*", "Neem je je notities mee?"),
                    rt_listen_mcq(
                        "Snippet:",
                        "We moeten het plan vandaag afmaken.",
                        ["Afmaken = afsluiten / klaarmaken", "Nieuwe baan zoeken", "Pizza bestellen"],
                        "Afmaken = afsluiten / klaarmaken",
                    ),
                    rt_fb("Ik sta meestal om zeven uur ___. (opstaan)", ["op", "af", "mee"], "op"),
                    rt_ro(["meeting?", "de", "voor", "Bereid", "je"], "Bereid je de meeting voor?"),
                ],
            ),
        ],
    }


def lesson_l08() -> dict:
    lid = "a2-m04-l08-writing-short-work-messages"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Writing · Short work messages",
        "lessonType": "writing",
        "order": 7,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-present-workplace", "a2.2-modals-workplace"],
        "vocabTargets": ["lemma-bericht", "lemma-thuiswerken", "lemma-updaten", "lemma-meeting", "lemma-beschikbaar"],
        "canDoStatements": [
            "I can write short work-chat updates (Teams/e-mail) and simple scheduling lines.",
        ],
        "mistakeFocus": ["register", "punctuation"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m04-l08-preview",
                "Warm-up — 4 woorden",
                [
                    ("cc", "cc", "CC (kopie)", "📧"),
                    ("groet", "groet", "greeting", "👋"),
                    ("update", "update", "update", "📣"),
                    ("thuiswerken", "thuiswerken", "WFH", "🏠"),
                ],
            ),
            grammar_card(
                "m04-l08-gc",
                "Korte werkberichten",
                "Teamchat / e-mail (kort)",
                "**Regel 1:** 1–2 zinnen. **Regel 2:** wie/wat/wanneer. **Regel 3:** beleefd afsluiten.",
                [
                    ("Ik werk vandaag thuis. Ik stuur je later een update.", "I'm WFH today. I'll send you an update later."),
                    ("Kun je om 14:00 even bellen? Ik heb een korte vraag.", "Can you call at 2pm? I have a quick question."),
                ],
            ),
            listen_read_step(
                "m04-l08-lr",
                "Voorbeeld — thread",
                [
                    (
                        "Noa",
                        "Hoi team, ik werk vandaag thuis. Ik ben op Teams bereikbaar tot vijf uur.",
                        "Hi team, I'm working from home today. I'm reachable on Teams until five.",
                    ),
                    (
                        "Levi",
                        "Top, dank je! Kun je voor vijf uur de slides bijwerken?",
                        "Great, thanks! Can you update the slides before five?",
                    ),
                    ("Noa", "Ja, geen probleem. Ik stuur om vier uur een bericht als het klaar is.", "Yes, no problem. I'll send a message at four when it's done."),
                ],
                [
                    ("Waar werkt Noa vandaag?", ["Thuis", "Op het strand", "In de trein"], "Thuis"),
                    ("Wat vraagt Levi?", ["De slides voor vijf uur bijwerken", "Pizza", "Verlof"], "De slides voor vijf uur bijwerken"),
                    ("Hoe reageert Noa?", ["Ja + concrete belofte", "Nee, nooit", "Boos"], "Ja + concrete belofte"),
                    ("Hoe laat stuurt Noa een bericht (ongeveer)?", ["Om vier uur", "Om middernacht", "Volgend jaar"], "Om vier uur"),
                    ("Welke zin is professioneel en kort?", ["Ik stuur om vier uur een bericht.", "Ik stuur een vier uur en een bericht maan.", "Bericht vier stuur ik uur om."], "Ik stuur om vier uur een bericht."),
                ],
            ),
            discovery_step(
                "m04-l08-discovery",
                "Guided noticing",
                [
                    ("Ik werk vandaag thuis.", "I'm working from home today.", "thuis"),
                    ("Ik stuur je een bericht.", "I'll send you a message.", "bericht"),
                    ("Geen probleem.", "No problem.", "probleem"),
                    ("Kun je … bijwerken?", "Can you update …?", "bijwerken"),
                ],
            ),
            pl(
                "m04-l08-pl1",
                "Kies / vul — 6×",
                ["bericht", "thuiswerken", "beschikbaar"],
                [
                    mcq(
                        "m04-l08-p1",
                        "Beste openingszin voor de teamchat",
                        ["Hoi, kleine update:", "Hoi ik ben de update.", "Update hoi kleine de."],
                        "Hoi, kleine update:",
                    ),
                    fb("m04-l08-p2", "Ik ben beschikbaar ___ 17:00. (tot)", ["tot", "onder", "achter"], "tot"),
                    ro_tokens("m04-l08-p3", ["thuis.", "Ik", "werk", "vandaag"], "Ik werk vandaag thuis."),
                    mcq(
                        "m04-l08-p4",
                        "Beleefd en duidelijk",
                        ["Kun je dit voor woensdag afmaken?", "Maak woensdag!", "Woensdag jij!"],
                        "Kun je dit voor woensdag afmaken?",
                    ),
                    mcq(
                        "m04-l08-p5",
                        "Welke zin hoort bij thuiswerken?",
                        ["Ik ben online op Teams.", "Ik ben offline voor altijd.", "Ik ben de Teams."],
                        "Ik ben online op Teams.",
                    ),
                    mcq(
                        "m04-l08-p6",
                        "Slot",
                        ["Groet, Noa", "Groet de maan", "Ik ben groet"],
                        "Groet, Noa",
                    ),
                ],
            ),
            pl(
                "m04-l08-pl2",
                "Variatie — 6×",
                ["update", "meeting", "mail"],
                [
                    mcq(
                        "m04-l08-q1",
                        "E-mailstijl (licht formeler)",
                        ["Goedemiddag, ik heb een korte vraag over de deadline.", "Hoi pizza deadline!", "Deadline ben ik."],
                        "Goedemiddag, ik heb een korte vraag over de deadline.",
                    ),
                    fb("m04-l08-q2", "Ik stuur je zo een ___. (chat)", ["bericht", "olifant", "fiets"], "bericht"),
                    ro_tokens("m04-l08-q3", ["update.", "later", "een", "Ik", "stuur", "je"], "Ik stuur je later een update."),
                    mcq(
                        "m04-l08-q4",
                        "Wanneer gebruik je *cc*?",
                        ["Iemand in de kopie zetten", "Koffie halen", "Een meeting starten"],
                        "Iemand in de kopie zetten",
                    ),
                    mcq(
                        "m04-l08-q5",
                        "Duidelijke actie",
                        ["Kun je de agenda delen?", "Kun je de agenda eten?", "Agenda kun jij?"],
                        "Kun je de agenda delen?",
                    ),
                    mcq(
                        "m04-l08-q6",
                        "Fout herkennen",
                        ["Ik werk vandaag thuis en ik ben bereikbaar.", "Ik werk thuis vandaag en bereikbaar ben ik.", "Thuis werk ik vandaag bereikbaar en."],
                        "Ik werk vandaag thuis en ik ben bereikbaar.",
                    ),
                ],
                depth=True,
            ),
            writing_step(
                "m04-l08-w1",
                "Guided writing 1",
                "Schrijf: Ik werk vandaag thuis. Ik stuur je later een update.",
                [
                    "Ik werk vandaag thuis ik stuur je later een update",
                    "Ik werk vandaag thuis. Ik stuur je later een update.",
                    "ik werk vandaag thuis ik stuur je later een update",
                ],
                "Ik werk vandaag thuis. Ik stuur je later een update.",
                min_chars=20,
            ),
            writing_step(
                "m04-l08-w2",
                "Guided writing 2",
                "Schrijf: Kun je dat herhalen? Ik was even afgeleid.",
                [
                    "Kun je dat herhalen ik was even afgeleid",
                    "Kun je dat herhalen? Ik was even afgeleid.",
                ],
                "Kun je dat herhalen? Ik was even afgeleid.",
                min_chars=15,
            ),
            writing_step(
                "m04-l08-w3",
                "Guided writing 3",
                "Schrijf: Geen probleem. Ik maak het voor vijf uur af.",
                [
                    "Geen probleem ik maak het voor vijf uur af",
                    "Geen probleem. Ik maak het voor vijf uur af.",
                ],
                "Geen probleem. Ik maak het voor vijf uur af.",
                min_chars=15,
            ),
            recap_step(
                "m04-l08-recap",
                "Recap",
                ["bericht", "thuis", "update"],
                [
                    rt_fb("Ik werk vandaag ___. (thuiswerken kort)", ["thuis", "strand", "maan"], "thuis"),
                    rt_ro(["bericht.", "stuur", "Ik", "je", "een"], "Ik stuur je een bericht."),
                    rt_speak("Zeg: *Geen probleem.*", "Geen probleem."),
                    rt_listen_mcq(
                        "Snippet:",
                        "Ik ben op Teams bereikbaar tot vijf uur.",
                        ["Beschikbaarheid + kanaal", "Koffiebestelling", "Treinvertraging"],
                        "Beschikbaarheid + kanaal",
                    ),
                    rt_fb("Kun je de slides ___? (bijwerken)", ["bijwerken", "slapen", "zwemmen"], "bijwerken"),
                    rt_fb("___ je dat herhalen? (informeel)", ["Kun", "Ben", "Word"], "Kun"),
                ],
            ),
        ],
    }


def lesson_l09() -> dict:
    lid = "a2-m04-l09-task-ask-clarification"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Real-life task · Ask for help / clarification",
        "lessonType": "task",
        "order": 8,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-clarification-work", "a2.2-modals-workplace"],
        "vocabTargets": ["lemma-herhalen", "lemma-bedoelen", "lemma-duidelijk", "lemma-geen-probleem", "lemma-taak"],
        "canDoStatements": [
            "I can ask to repeat, ask what something means, and confirm understanding politely.",
        ],
        "mistakeFocus": ["question-form", "register"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m04-l09-preview",
                "Warm-up — 4 woorden",
                [
                    ("helaas", "helaas", "unfortunately", "😕"),
                    ("even", "even", "just / a moment", "⏸️"),
                    ("langzamer", "langzamer", "more slowly", "🐢"),
                    ("samenvatten", "samenvatten", "to summarise", "📌"),
                ],
            ),
            listening_step(
                "m04-l09-listen",
                "Scenario — snelle uitleg van je teamleider",
                [
                    ("Eva", "Oké, we doen de release dinsdag, maar alleen als de tests groen zijn.", "Okay, we do the release Tuesday, but only if the tests are green."),
                    ("Jij", "Sorry, ik begreep het niet helemaal. Kun je dat herhalen?", "Sorry, I didn't quite get it. Can you repeat that?"),
                    ("Eva", "Ja: release dinsdag, als de tests goed zijn.", "Yes: release Tuesday, if the tests are good."),
                    ("Jij", "Wat bedoel je met ‘groen’ in dit team?", "What do you mean by ‘green’ in this team?"),
                    (
                        "Eva",
                        "Groen betekent hier: alle automatische tests slagen. Is dat zo duidelijk?",
                        "Green means here: all automated tests pass. Is that clear enough?",
                    ),
                    ("Jij", "Ja, dat is duidelijk. Dank je!", "Yes, that's clear. Thanks!"),
                ],
                [
                    ("Wat wil Eva met de release?", ["Dinsdag, als tests oké zijn", "Vandaag, altijd", "Nooit"], "Dinsdag, als tests oké zijn"),
                    ("Wat vraag je eerst als je het niet hoort?", ["Kun je dat herhalen?", "Waar is de maan?", "Ik ben moe."], "Kun je dat herhalen?"),
                    ("Waarom vraag je ‘Wat bedoel je met groen’?", ["Jargon checken", "Kleur van Eva's jas", "Weerbericht"], "Jargon checken"),
                    ("Hoe sluit je positief af?", ["Dat is duidelijk. Dank je!", "Ik haat dinsdag.", "Groen is lelijk."], "Dat is duidelijk. Dank je!"),
                    ("Welke toon is oké op werk (informeel team)?", ["Sorry, even langzamer?", "Jij bent dom.", "Zwijg."], "Sorry, even langzamer?"),
                ],
            ),
            discovery_step(
                "m04-l09-discovery",
                "Guided noticing",
                [
                    ("Kun je dat herhalen?", "Can you repeat that?", "herhalen"),
                    ("Wat bedoel je met …?", "What do you mean by …?", "bedoelen"),
                    ("Is dat zo duidelijk?", "Is that clear (enough)?", "duidelijk"),
                    ("Dat is duidelijk.", "That's clear.", "duidelijk"),
                ],
            ),
            pl(
                "m04-l09-pl1",
                "Simulatie — beste repliek — 6×",
                ["herhalen", "bedoelen", "duidelijk"],
                [
                    mcq(
                        "m04-l09-a1",
                        "Te snel gesproken",
                        ["Sorry, kun je dat herhalen?", "Sorry, jij bent snel.", "Snelheid is een fiets."],
                        "Sorry, kun je dat herhalen?",
                    ),
                    mcq(
                        "m04-l09-a2",
                        "Onbekende afkorting ‘KR’",
                        ["Wat bedoel je met KR?", "KR ben ik.", "KR is een brood."],
                        "Wat bedoel je met KR?",
                    ),
                    ro_tokens("m04-l09-a3", ["duidelijk.", "Dat", "is"], "Dat is duidelijk."),
                    mcq(
                        "m04-l09-a3b",
                        "Bevestiging vragen",
                        ["Dus de deadline is vrijdag, klopt dat?", "Dus vrijdag is een pizza?", "Deadline ben ik vrijdag."],
                        "Dus de deadline is vrijdag, klopt dat?",
                    ),
                    mcq(
                        "m04-l09-a4",
                        "Als je hulp nodig hebt",
                        ["Ik heb een vraag over deze taak.", "Ik ben deze taak.", "Taart vraag."],
                        "Ik heb een vraag over deze taak.",
                    ),
                    mcq(
                        "m04-l09-a5",
                        "Reactie op ‘Geen probleem’",
                        ["Super, dank je wel!", "Probleem is groot.", "Ik ben super."],
                        "Super, dank je wel!",
                    ),
                ],
            ),
            pl(
                "m04-l09-pl2",
                "Variatie — 6×",
                ["geen probleem", "kunnen", "even"],
                [
                    fb("m04-l09-b1", "___ je dat in één zin samenvatten? (kunnen: je)", ["Kun", "Ben", "Word"], "Kun"),
                    mcq(
                        "m04-l09-b2",
                        "Als je het nog steeds niet snapt",
                        ["Kun je het nog een keer uitlegen, maar iets langzamer?", "Kun je stoppen met praten voor altijd?", "Langzamer ben ik."],
                        "Kun je het nog een keer uitlegen, maar iets langzamer?",
                    ),
                    ro_tokens("m04-l09-b3", ["bedoel", "je?", "Wat", "met", "‘scope’"], "Wat bedoel je met ‘scope’?"),
                    mcq(
                        "m04-l09-b3b",
                        "Politeness",
                        ["Mag ik even storen? Ik heb een korte vraag.", "Stoor ik nooit.", "Ik ben even."],
                        "Mag ik even storen? Ik heb een korte vraag.",
                    ),
                    mcq(
                        "m04-l09-b4",
                        "Geen probleem — wanneer?",
                        ["Als iemand sorry zegt voor een kleine fout", "Als iemand ontslag neemt", "Als de zon opgaat"],
                        "Als iemand sorry zegt voor een kleine fout",
                    ),
                    mcq(
                        "m04-l09-b5",
                        "Check: begrip",
                        ["Snap ik het goed dat jij de review doet?", "Snap ik het goed dat jij een pizza bent?", "Snap goed ik review?"],
                        "Snap ik het goed dat jij de review doet?",
                    ),
                    mcq(
                        "m04-l09-b6",
                        "Bedankt na uitleg",
                        ["Top, dank je!", "Top, ik haat uitleg.", "Dank je is een fiets."],
                        "Top, dank je!",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m04-l09-sp1",
                "Production — herhalen",
                "Sorry, kun je dat herhalen? Ik was even afgeleid.",
                ["Sorry kun je dat herhalen ik was even afgeleid", "Sorry, kun je dat herhalen? Ik was even afgeleid."],
                "Sorry kun je dat herhalen ik was even afgeleid",
            ),
            speak_step(
                "m04-l09-sp2",
                "Production — betekenis",
                "Wat bedoel je met ‘prioriteit’ in dit project?",
                ["Wat bedoel je met prioriteit in dit project", "Wat bedoel je met ‘prioriteit’ in dit project?"],
                "Wat bedoel je met prioriteit in dit project",
            ),
            speak_step(
                "m04-l09-sp3",
                "Production — bevestigen",
                "Oké, dat is duidelijk. Dank je wel.",
                ["Oké dat is duidelijk dank je wel", "Oké, dat is duidelijk. Dank je wel."],
                "Oké dat is duidelijk dank je wel",
            ),
            speak_step(
                "m04-l09-sp4",
                "Production — hulp",
                "Ik heb een vraag: kun je me even helpen met deze taak?",
                ["Ik heb een vraag kun je me even helpen met deze taak", "Ik heb een vraag: kun je me even helpen met deze taak?"],
                "Ik heb een vraag kun je me even helpen met deze taak",
            ),
            recap_step(
                "m04-l09-recap",
                "Recap",
                ["herhalen", "bedoelen", "duidelijk"],
                [
                    rt_ro(["herhalen?", "Kun", "je", "dat"], "Kun je dat herhalen?"),
                    rt_speak("Zeg: *Wat bedoel je met ‘deadline’?*", "Wat bedoel je met ‘deadline’?"),
                    rt_fb("Dat is ___, dank je.", ["duidelijk", "traag", "duur"], "duidelijk"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Wat bedoel je met ‘groen’ in dit team?",
                        ["Clarificatie van jargon", "Kledingadvies", "Verkeerslicht"],
                        "Clarificatie van jargon",
                    ),
                    rt_fb("___ probleem. (geen)", ["Geen", "Veel", "Klein"], "Geen"),
                    rt_speak("Zeg: *Mag ik even storen?*", "Mag ik even storen?"),
                ],
            ),
        ],
    }


def lesson_l10() -> dict:
    lid = "a2-m04-l10-task-simple-meeting-interaction"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Real-life task · Simple meeting interaction",
        "lessonType": "task",
        "order": 9,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-modals-workplace", "a2.2-separable-verbs-work", "a2.2-clarification-work"],
        "vocabTargets": ["lemma-meeting", "lemma-agenda", "lemma-afmaken", "lemma-voorbereiden", "lemma-beschikbaar"],
        "canDoStatements": [
            "I can schedule, confirm a time, ask for repetition, and promise a short follow-up.",
        ],
        "mistakeFocus": ["separable-verb", "question-form"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m04-l10-preview",
                "Warm-up — 4 woorden",
                [
                    ("inbellen", "inbellen", "to dial in", "📞"),
                    ("uitstellen", "uitstellen", "to postpone", "⏭️"),
                    ("notulen", "notulen", "minutes (notes)", "📝"),
                    ("actiepunt", "actiepunt", "action item", "✅"),
                ],
            ),
            listen_read_step(
                "m04-l10-lr",
                "Scenario — uitnodiging + reactie",
                [
                    (
                        "Sanne",
                        "Hoi, kun je morgen om tien uur even afstemmen over de planning? We moeten die nog afmaken.",
                        "Hi, can we align tomorrow at ten about the planning? We still need to finish it.",
                    ),
                    (
                        "Jij",
                        "Ja, dat lukt. Kun je de agenda sturen? Ik bereid twee punten voor.",
                        "Yes, that works. Can you send the agenda? I'm preparing two items.",
                    ),
                    (
                        "Sanne",
                        "Top, ik stuur zo een bericht. Als iets niet lukt, laat het even weten.",
                        "Great, I'll send a message in a bit. If something doesn't work, let me know.",
                    ),
                ],
                [
                    ("Wanneer stemmen ze af?", ["Morgen om tien uur", "Gisteren", "Over een jaar"], "Morgen om tien uur"),
                    ("Wat moeten ze afmaken?", ["De planning", "De lunch", "De lift"], "De planning"),
                    ("Wat vraag jij aan Sanne?", ["De agenda sturen", "Een pizza", "Een auto"], "De agenda sturen"),
                    ("Wat beloof jij?", ["Twee punten voorbereiden", "Twee pizza's eten", "Niets"], "Twee punten voorbereiden"),
                    ("Wat zegt Sanne als backup?", ["Als iets niet lukt, laat het weten", "Ga weg", "Zwijg"], "Als iets niet lukt, laat het weten"),
                ],
            ),
            discovery_step(
                "m04-l10-discovery",
                "Guided noticing",
                [
                    ("Kun je morgen even afstemmen?", "Can you align briefly tomorrow?", "afstemmen"),
                    ("Ik bereid … voor.", "I'm preparing …", "voorbereiden"),
                    ("We moeten … afmaken.", "We have to finish …", "afmaken"),
                    ("Ik stuur zo een bericht.", "I'll send a message shortly.", "bericht"),
                ],
            ),
            pl(
                "m04-l10-pl1",
                "Simulatie — 6×",
                ["meeting", "agenda", "afmaken"],
                [
                    mcq(
                        "m04-l10-a1",
                        "Bevestigen + voorstel",
                        ["Ja, tien uur is goed. Kun je een link sturen?", "Nee, ik ben een link.", "Tien uur is een pizza."],
                        "Ja, tien uur is goed. Kun je een link sturen?",
                    ),
                    ro_tokens(
                        "m04-l10-a2",
                        ["voorbereiden?", "het", "Kun", "je", "overleg"],
                        "Kun je het overleg voorbereiden?",
                    ),
                    fb("m04-l10-a3", "We moeten dit vandaag ___. (afmaken)", ["afmaken", "opstaan", "meenemen"], "afmaken"),
                    mcq(
                        "m04-l10-a4",
                        "Als je geen tijd hebt",
                        ["Helaas, ik kan niet om tien uur. Kan het om elf uur?", "Helaas, ik ben tien uur.", "Tien uur ben ik een fiets."],
                        "Helaas, ik kan niet om tien uur. Kan het om elf uur?",
                    ),
                    mcq(
                        "m04-l10-a5",
                        "Actie na de meeting",
                        ["Ik stuur je de notities vanmiddag.", "Ik stuur je de maan.", "Notities ben ik."],
                        "Ik stuur je de notities vanmiddag.",
                    ),
                    mcq(
                        "m04-l10-a6",
                        "Separable check",
                        ["Ik maak de actiepunten morgen af.", "Ik af maak de actiepunten morgen.", "Maak ik af morgen actiepunten."],
                        "Ik maak de actiepunten morgen af.",
                    ),
                ],
            ),
            pl(
                "m04-l10-pl2",
                "Variatie — 6×",
                ["beschikbaar", "bericht", "Wanneer"],
                [
                    mcq(
                        "m04-l10-b1",
                        "Planning",
                        [
                            "Wanneer is de meeting voor jou het beste?",
                            "Wanneer is de meeting voor jou het slechtst?",
                            "Wanneer ben jij een meeting?",
                        ],
                        "Wanneer is de meeting voor jou het beste?",
                    ),
                    fb("m04-l10-b2", "Ik ben beschikbaar ___ twee uur. (vanaf)", ["vanaf", "onder", "achter"], "vanaf"),
                    ro_tokens("m04-l10-b3", ["stuur", "Ik", "je", "zo", "een", "bericht."], "Ik stuur je zo een bericht."),
                    mcq(
                        "m04-l10-b4",
                        "Beleefd checken",
                        [
                            "Kun je bevestigen of je de uitnodiging hebt gezien?",
                            "Kun je bevestigen of je een pizza bent?",
                            "Bevestig jij de maan?",
                        ],
                        "Kun je bevestigen of je de uitnodiging hebt gezien?",
                    ),
                    mcq(
                        "m04-l10-b5",
                        "Separable in vraag",
                        [
                            "Kun je de slides vandaag afmaken?",
                            "Kun je afmaken de slides vandaag?",
                            "Kun slides afmaken je?",
                        ],
                        "Kun je de slides vandaag afmaken?",
                    ),
                    mcq(
                        "m04-l10-b6",
                        "Slot",
                        ["Prettige meeting alvast!", "Prettige pizza alvast!", "Meeting is lelijk!"],
                        "Prettige meeting alvast!",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m04-l10-sp1",
                "Turn 1 — akkoord",
                "Ja, morgen om tien uur is goed voor mij.",
                ["Ja morgen om tien uur is goed voor mij", "Ja, morgen om tien uur is goed voor mij."],
                "Ja morgen om tien uur is goed voor mij",
            ),
            speak_step(
                "m04-l10-sp2",
                "Turn 2 — agenda",
                "Kun je de agenda sturen? Ik bereid twee punten voor.",
                ["Kun je de agenda sturen ik bereid twee punten voor", "Kun je de agenda sturen? Ik bereid twee punten voor."],
                "Kun je de agenda sturen ik bereid twee punten voor",
            ),
            speak_step(
                "m04-l10-sp3",
                "Turn 3 — herhaling",
                "Sorry, wanneer is de meeting nog een keer?",
                ["Sorry wanneer is de meeting nog een keer", "Sorry, wanneer is de meeting nog een keer?"],
                "Sorry wanneer is de meeting nog een keer",
            ),
            speak_step(
                "m04-l10-sp4",
                "Turn 4 — follow-up",
                "Ik stuur je na de meeting een kort bericht met de acties.",
                ["Ik stuur je na de meeting een kort bericht met de acties", "Ik stuur je na de meeting een kort bericht met de acties."],
                "Ik stuur je na de meeting een kort bericht met de acties",
            ),
            recap_step(
                "m04-l10-recap",
                "Recap",
                ["meeting", "afmaken", "bericht"],
                [
                    rt_ro(["Kun", "je", "morgen", "om", "tien", "uur?"], "Kun je morgen om tien uur?"),
                    rt_speak("Zeg: *Ik bereid twee punten voor.*", "Ik bereid twee punten voor."),
                    rt_fb("We moeten de planning ___. (afmaken)", ["afmaken", "opstaan", "meenemen"], "afmaken"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Top, ik stuur zo een bericht.",
                        ["Korte belofte om te mailen/chatten", "Koop een auto", "Stop de meeting"],
                        "Korte belofte om te mailen/chatten",
                    ),
                    rt_ro(["meeting?", "de", "Wanneer", "is"], "Wanneer is de meeting?"),
                    rt_speak("Zeg: *Geen probleem.*", "Geen probleem."),
                ],
            ),
        ],
    }


def lesson_l11() -> dict:
    lid = "a2-m04-l11-review-work-professional"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Review · Work & professional life",
        "lessonType": "review",
        "order": 10,
        "cefrLevel": "A2",
        "durationEstimate": 16,
        "grammarTargets": [
            "a2.2-present-workplace",
            "a2.2-modals-workplace",
            "a2.2-separable-verbs-work",
            "a2.2-clarification-work",
        ],
        "vocabTargets": [
            "lemma-werken",
            "lemma-collega",
            "lemma-meeting",
            "lemma-bericht",
            "lemma-afmaken",
            "lemma-herhalen",
            "lemma-thuiswerken",
        ],
        "canDoStatements": [
            "I can retrieve job phrases, modals, separable verbs, and clarification chunks.",
        ],
        "metadata": LM,
        "steps": [
            preview_step(
                "m04-l11-preview",
                "Opfrissen — 4 woorden",
                [
                    ("werkplek", "werkplek", "workplace", "🖥️"),
                    ("samenwerking", "samenwerking", "collaboration", "🤝"),
                    ("communicatie", "communicatie", "communication", "💬"),
                    ("structuur", "structuur", "structure", "🧱"),
                ],
            ),
            listening_step(
                "m04-l11-listen",
                "Mixed retrieval — kantoorsnippet",
                [
                    ("Tim", "Hoi, ik ben Tim. Ik werk als support engineer en ik doe meestal tickets en meetings.", "Hi, I'm Tim. I work as a support engineer and I mostly do tickets and meetings."),
                    ("Yara", "Prima. Kun je morgen meewerken aan de training?", "Great. Can you contribute to the training tomorrow?"),
                    ("Tim", "Ja, maar ik moet eerst een rapport afmaken. Ik stuur je een bericht als ik klaar ben.", "Yes, but first I have to finish a report. I'll send you a message when I'm done."),
                    ("Yara", "Top. Wanneer is de training?", "Great. When is the training?"),
                    ("Tim", "Om twee uur, in vergaderzaal B.", "At two, in meeting room B."),
                ],
                [
                    ("Wat is Tims rol?", ["Support engineer", "Kok", "Piloot"], "Support engineer"),
                    ("Wat moet Tim eerst?", ["Een rapport afmaken", "Vakantie", "Schoenen poetsen"], "Een rapport afmaken"),
                    ("Hoe laat is de training?", ["Om twee uur", "Om middernacht", "Onbekend"], "Om twee uur"),
                    ("Waar?", ["Vergaderzaal B", "Op het strand", "Thuis bij Yara"], "Vergaderzaal B"),
                    ("Welke belofte geeft Tim?", ["Bericht sturen als hij klaar is", "Pizza brengen", "Niets"], "Bericht sturen als hij klaar is"),
                ],
            ),
            discovery_step(
                "m04-l11-discovery",
                "Snel herkennen",
                [
                    ("Ik werk als …", "I work as …", "werk als"),
                    ("Ik moet … afmaken.", "I have to finish …", "afmaken"),
                    ("Kun je dat herhalen?", "Can you repeat that?", "herhalen"),
                    ("Wanneer is de meeting?", "When is the meeting?", "Wanneer"),
                ],
            ),
            pl(
                "m04-l11-pl1",
                "Mix — 6×",
                ["meewerken", "thuiswerken", "duidelijk"],
                [
                    mcq(
                        "m04-l11-a1",
                        "Juiste zin",
                        ["Ik werk vandaag thuis.", "Ik thuis werk vandaag.", "Vandaag thuis ik werk."],
                        "Ik werk vandaag thuis.",
                    ),
                    ro_tokens("m04-l11-a2", ["af.", "Ik", "moet", "dit", "vandaag"], "Ik moet dit vandaag afmaken."),
                    mcq(
                        "m04-l11-a3",
                        "Clarification",
                        ["Wat bedoel je met ‘impact’?", "Impact ben jij?", "Wat is een bedoel?"],
                        "Wat bedoel je met ‘impact’?",
                    ),
                    fb("m04-l11-a4", "___ je dat herhalen? (informeel)", ["Kun", "Ben", "Word"], "Kun"),
                    mcq(
                        "m04-l11-a5",
                        "Separable",
                        ["Neem je je laptop mee?", "Neem je mee je laptop?", "Mee neem je laptop?"],
                        "Neem je je laptop mee?",
                    ),
                    mcq(
                        "m04-l11-a6",
                        "Linking",
                        ["Ik kan niet mee, want ik heb een afspraak.", "Ik kan niet mee ik want afspraak.", "Want ik kan niet mee, ik heb een afspraak."],
                        "Ik kan niet mee, want ik heb een afspraak.",
                    ),
                ],
            ),
            pl(
                "m04-l11-pl2",
                "Mix — 6×",
                ["bericht", "beschikbaar", "agenda"],
                [
                    mcq(
                        "m04-l11-b1",
                        "Scheduling",
                        ["Ik ben beschikbaar om drie uur te bellen.", "Ik ben beschikbaar de maan te bellen.", "Beschikbaar ik om drie."],
                        "Ik ben beschikbaar om drie uur te bellen.",
                    ),
                    ro_tokens("m04-l11-b2", ["bericht.", "stuur", "Ik", "je", "een"], "Ik stuur je een bericht."),
                    mcq(
                        "m04-l11-b3",
                        "Professioneel",
                        ["Mag ik een vraag stellen over de agenda?", "Mag ik de agenda opeten?", "Agenda vraag ik?"],
                        "Mag ik een vraag stellen over de agenda?",
                    ),
                    mcq(
                        "m04-l11-b4",
                        "Bevestigen",
                        ["Oké, dat is duidelijk.", "Oké, dat is een printer.", "Duidelijk ben ik oké."],
                        "Oké, dat is duidelijk.",
                    ),
                    fb("m04-l11-b5", "Ik bereid de slides ___. (voorbereiden)", ["voor", "af", "mee"], "voor"),
                    mcq(
                        "m04-l11-b6",
                        "Kies beste reactie in de teamchat",
                        ["Geen probleem, ik pak dit op.", "Geen probleem, ik ben dit.", "Probleem geen op pak ik."],
                        "Geen probleem, ik pak dit op.",
                    ),
                ],
                depth=True,
            ),
            pl(
                "m04-l11-pl3",
                "Laatste ronde — 6×",
                ["collega", "meeting", "update"],
                [
                    mcq(
                        "m04-l11-c1",
                        "Intro",
                        ["Hoi, ik ben nieuw hier. Ik werk op de marketingafdeling.", "Hoi, ik ben hier nieuw marketing.", "Nieuw ben ik marketing hier."],
                        "Hoi, ik ben nieuw hier. Ik werk op de marketingafdeling.",
                    ),
                    mcq(
                        "m04-l11-c2",
                        "Modal fout herkennen",
                        ["Kun je helpen met deze taak?", "Kun helpen je met deze taak?", "Je kun helpen deze taak?"],
                        "Kun je helpen met deze taak?",
                    ),
                    ro_tokens("m04-l11-c3", ["meeting?", "is", "Wanneer", "de"], "Wanneer is de meeting?"),
                    mcq(
                        "m04-l11-c4",
                        "Update",
                        ["Ik geef een korte update: we zijn op schema.", "Ik geef een korte update: we zijn een trein.", "Update kort ik schema op."],
                        "Ik geef een korte update: we zijn op schema.",
                    ),
                    fb("m04-l11-c5", "Ik stuur je later een ___.", ["update", "olifant", "regen"], "update"),
                    mcq(
                        "m04-l11-c6",
                        "Collega-tonen",
                        ["Prettig je te ontmoeten!", "Ik haat collega's!", "Collega ben jij lelijk!"],
                        "Prettig je te ontmoeten!",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m04-l11-sp1",
                "Production — mini pitch",
                "Ik werk als consultant. Ik doe meestal klantgesprekken en korte updates.",
                [
                    "Ik werk als consultant ik doe meestal klantgesprekken en korte updates",
                    "Ik werk als consultant. Ik doe meestal klantgesprekken en korte updates.",
                ],
                "Ik werk als consultant ik doe meestal klantgesprekken en korte updates",
                tips="Rustig: *ik werk als* + rol.",
            ),
            recap_step(
                "m04-l11-recap",
                "Module recap",
                ["werk", "meeting", "duidelijk"],
                [
                    rt_speak("Zeg: *Ik werk als consultant.*", "Ik werk als consultant."),
                    rt_ro(["afmaken.", "moet", "Ik", "dit", "vandaag"], "Ik moet dit vandaag afmaken."),
                    rt_fb("___ je dat herhalen?", ["Kun", "Ben", "Word"], "Kun"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Geen probleem. Ik stuur je zo een bericht.",
                        ["Vriendelijke toezegging", "Boze mail", "Sportuitslag"],
                        "Vriendelijke toezegging",
                    ),
                    rt_fb("Wat ___ je met ‘scope’? (betekenis vragen)", ["bedoel", "eet", "slaap"], "bedoel"),
                    rt_speak("Zeg: *Wanneer is de meeting?*", "Wanneer is de meeting?"),
                ],
            ),
        ],
    }


def lessons() -> list[dict]:
    return [
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


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    mod = {
        "id": MID,
        "title": "Work & professional life",
        "band": "A2.2",
        "description": "A2.2 workplace Dutch for expats: introductions, roles, tasks, clarification, short messages, meetings, separable verbs, and modals — Stage 6 depth.",
        "order": 3,
        "lessons": lessons(),
        "grammarTargets": GRAMMAR,
        "vocabTargets": vocab_targets(),
        "learningGoals": [
            "Introduce yourself and describe your job in simple Dutch",
            "Ask for repetition and meaning; confirm understanding",
            "Use separable verbs and modals in short work sentences",
            "Schedule and follow basic meeting talk; write short work-chat updates",
        ],
        "metadata": {
            **LM,
            "contentVersion": "m04-v1",
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        },
    }
    OUT.write_text(json.dumps(mod, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
