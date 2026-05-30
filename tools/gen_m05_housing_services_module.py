#!/usr/bin/env python3
"""Generate content/modules/a2-m05-housing-services/module.json (Stage 6 depth, band A2.2)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

MID = "a2-m05-housing-services"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/modules/a2-m05-housing-services/module.json"

LM = {
    "stage6": True,
    "schemaPlayer": True,
    "lessonDepth": {"m05": "v1", "targetMicroInteractions": "28-38"},
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


def match_ex(i: str, q: str, pairs: list[tuple[str, str]], corr: dict[str, str]) -> dict:
    return {
        "id": i,
        "question": q,
        "difficulty": "A2_low",
        "metadata": {},
        "type": "match",
        "options": [{"left": a, "right": b} for a, b in pairs],
        "correctAnswer": corr,
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
        d["metadata"] = {"depthLayer": "m05-v1"}
    return d


def preview_step(step_id: str, prompt: str, items: list[tuple[str, str, str, str]]) -> dict:
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


def scenario_chat_step(
    step_id: str,
    prompt: str,
    lines: list[tuple[str, str, str]],
    mcqs: list[tuple[str, list[str], str]],
) -> dict:
    dialogue = [{"speaker": a, "nl": b, "en": c} for a, b, c in lines]
    exercises = [mcq(f"{step_id}-s{i}", q, o, a) for i, (q, o, a) in enumerate(mcqs, 1)]
    return {
        "id": step_id,
        "prompt": prompt,
        "content": {"dialogue": dialogue},
        "feedbackConfig": {"errorTags": ["listening"]},
        "exercises": exercises,
        "metadata": {},
        "type": "scenario_chat",
        "interactionConfig": {"mode": "text_only"},
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
        "feedbackConfig": {"hint": "Kort en duidelijk. Bij verhuurder en service: vaak *u* + alstublieft."},
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
        "id": "a2.2-housing-living",
        "name": "Describing where you live",
        "description": "Ik woon in een appartement/huis. Ik huur / Ik heb … kamers.",
        "examples": [
            {"nl": "Ik woon in een appartement op de tweede verdieping.", "en": "I live in a flat on the second floor."},
            {"nl": "We hebben een klein balkon.", "en": "We have a small balcony."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-reporting-problems",
        "name": "Reporting housing problems",
        "description": "Er is een probleem met … / Het is kapot of stuk. Mijn verwarming werkt niet.",
        "examples": [
            {"nl": "Er is een lekkage in de badkamer.", "en": "There's a leak in the bathroom."},
            {"nl": "Mijn internet doet het niet.", "en": "My internet isn't working."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-polite-u-housing",
        "name": "Polite requests (u)",
        "description": "Kunt u mij helpen? Zou u kunnen …? … alstublieft.",
        "examples": [
            {"nl": "Kunt u morgen langskomen?", "en": "Can you come by tomorrow?"},
            {"nl": "Zou u dat kunnen repareren, alstublieft?", "en": "Could you repair that, please?"},
        ],
        "cefrLevel": "A2",
        "rules": {"note": "Kunt u / Zou u + infinitive at end in main question."},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-perfectum-light",
        "name": "Perfectum (light, practical)",
        "description": "Ik heb gebeld. Hij heeft het gerepareerd. — past result, simple forms only.",
        "examples": [
            {"nl": "Ik heb gisteren naar de verhuurder gebeld.", "en": "I called the landlord yesterday."},
            {"nl": "De monteur heeft de boiler al gecontroleerd.", "en": "The technician already checked the boiler."},
        ],
        "cefrLevel": "A2",
        "rules": {"pattern": "hebben/zijn + voltooid deelwoord (high-frequency verbs only)."},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-separable-housing",
        "name": "Separable verbs: aan / uit / op (utilities)",
        "description": "Ik zet de verwarming aan. Zet het licht uit. Ik bel de verhuurder op.",
        "examples": [
            {"nl": "Kun je de boiler even aanzetten?", "en": "Can you turn the boiler on for a moment?"},
            {"nl": "Ik bel zo de service op.", "en": "I'll call the service in a bit."},
        ],
        "cefrLevel": "A2",
        "rules": {"pattern": "Particle at end in present main clause."},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-linking-housing",
        "name": "Want / omdat (housing)",
        "description": "Reason and contrast in short problem explanations.",
        "examples": [
            {"nl": "Het is koud, want de verwarming doet het niet.", "en": "It's cold because the heating isn't working."},
            {"nl": "Ik blijf thuis, omdat ik op de monteur wacht.", "en": "I'm staying home because I'm waiting for the technician."},
        ],
        "cefrLevel": "A2",
        "rules": {"want": "coordinating", "omdat": "subclause"},
        "metadata": {"module": MID},
    },
]

VOCAB = [
    ("lemma-woon", "wonen", "wonen", "to live / reside", "verb"),
    ("lemma-appartement", "appartement", "appartement", "apartment / flat", "noun"),
    ("lemma-huis", "huis", "huis", "house", "noun"),
    ("lemma-huur", "huur", "huur", "rent", "noun"),
    ("lemma-verhuurder", "verhuurder", "verhuurder", "landlord / lessor", "noun"),
    ("lemma-sleutel", "sleutel", "sleutel", "key", "noun"),
    ("lemma-verwarming", "verwarming", "verwarming", "heating", "noun"),
    ("lemma-lekkage", "lekkage", "lekkage", "leak", "noun"),
    ("lemma-kapot", "kapot", "kapot", "broken", "adj"),
    ("lemma-stuk", "stuk", "stuk", "broken (het is stuk)", "adj"),
    ("lemma-repareren", "repareren", "repareren", "to repair", "verb"),
    ("lemma-afspraak", "afspraak", "afspraak", "appointment", "noun"),
    ("lemma-monteur", "monteur", "monteur", "technician / repair person", "noun"),
    ("lemma-internet", "internet", "internet", "internet", "noun"),
    ("lemma-stroom", "stroom", "stroom", "power / electricity", "noun"),
    ("lemma-dringend", "dringend", "dringend", "urgent", "adj"),
    ("lemma-alstublieft", "alstublieft", "alstublieft", "please (formal)", "phrase"),
    ("lemma-bellen", "bellen", "bellen", "to call / phone", "verb"),
    ("lemma-langskomen", "langskomen", "langskomen", "to come by", "verb"),
    ("lemma-beschikbaar", "beschikbaar", "beschikbaar", "available", "adj"),
    ("lemma-probleem", "probleem", "probleem", "problem", "noun"),
    ("lemma-helpen", "helpen", "helpen", "to help", "verb"),
    ("lemma-badkamer", "badkamer", "badkamer", "bathroom", "noun"),
    ("lemma-keuken", "keuken", "keuken", "kitchen", "noun"),
    ("lemma-balkon", "balkon", "balkon", "balcony", "noun"),
    ("lemma-boiler", "boiler", "boiler", "boiler / water heater", "noun"),
    ("lemma-want-m5", "want", "want", "because (coord.)", "conj"),
    ("lemma-omdat-m5", "omdat", "omdat", "because (subord.)", "conj"),
    ("lemma-bericht-m5", "bericht", "bericht", "message", "noun"),
    ("lemma-gebeld", "gebeld", "bellen", "called (past participle)", "verb_form"),
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


def lesson_l01() -> dict:
    lid = "a2-m05-l01-listening-at-home-situations"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Listening · At home · understanding situations",
        "lessonType": "input",
        "order": 0,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-housing-living", "a2.2-reporting-problems"],
        "vocabTargets": ["lemma-appartement", "lemma-verhuurder", "lemma-lekkage", "lemma-verwarming", "lemma-probleem"],
        "canDoStatements": [
            "I can follow a short neighbour or housemate chat about something wrong at home.",
        ],
        "mistakeFocus": ["listening-gist", "vocab"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m05-l01-preview",
                "Warm-up — 5 woorden",
                [
                    ("appartement", "appartement", "flat / apartment", "🏢"),
                    ("verhuurder", "verhuurder", "landlord", "🔑"),
                    ("lekkage", "lekkage", "leak", "💧"),
                    ("verwarming", "verwarming", "heating", "🌡️"),
                    ("sleutel", "sleutel", "key", "🗝️"),
                ],
            ),
            listening_step(
                "m05-l01-listen",
                "Input — buurman belt aan",
                [
                    (
                        "Sam",
                        "Hoi, ik ben Sam van boven. Ik hoor water in jullie badkamer. Is alles oké?",
                        "Hi, I'm Sam from upstairs. I hear water in your bathroom. Is everything okay?",
                    ),
                    (
                        "Joy",
                        "Oh nee, er is een lekkage. De douche loopt niet goed weg.",
                        "Oh no, there's a leak. The shower isn't draining properly.",
                    ),
                    (
                        "Sam",
                        "Dat is vervelend. Bel je de verhuurder al?",
                        "That's annoying. Are you calling the landlord already?",
                    ),
                    (
                        "Joy",
                        "Ja, ik bel zo. En de verwarming deed het gisteren ook al niet goed.",
                        "Yes, I'll call in a bit. And the heating wasn't working well yesterday either.",
                    ),
                    (
                        "Sam",
                        "Oké. Laat maar weten als je hulp nodig hebt.",
                        "Okay. Let me know if you need help.",
                    ),
                ],
                [
                    ("Waar komt het geluid vandaan volgens Sam?", ["Bij de badkamer van Joy", "In de keuken", "Op straat"], "Bij de badkamer van Joy"),
                    ("Wat is het probleem?", ["Lekkage / douche loopt niet goed weg", "De deur is weg", "De kat is weg"], "Lekkage / douche loopt niet goed weg"),
                    ("Wat raadt Sam aan?", ["Bel de verhuurder", "Koop een boot", "Zwijg"], "Bel de verhuurder"),
                    ("Welk tweede probleem noemt Joy?", ["Verwarming", "Internet", "De lift"], "Verwarming"),
                    ("Hoe reageert Sam op het eind?", ["Biedt hulp aan", "Wordt boos", "Hangt op"], "Biedt hulp aan"),
                ],
            ),
            discovery_step(
                "m05-l01-discovery",
                "Probleem → eerste stap",
                [
                    ("Ik woon in een appartement.", "I live in a flat.", "woon"),
                    ("Er is een probleem met …", "There is a problem with …", "probleem"),
                    ("Bel de verhuurder of meld het via de app.", "Call the landlord or report via the app.", "oplossing"),
                    ("Kunt u mij helpen?", "Can you help me? (formal)", "helpen"),
                ],
            ),
            pl(
                "m05-l01-pl1",
                "Practice — 6×",
                ["lekkage", "badkamer", "verhuurder"],
                [
                    mcq(
                        "m05-l01-a1",
                        "Welke zin hoort bij een probleem thuis?",
                        ["Er is een lekkage in de badkamer.", "Er is een pizza in de badkamer.", "De badkamer is een trein."],
                        "Er is een lekkage in de badkamer.",
                    ),
                    fb("m05-l01-a2", "Ik woon in een klein ___.", ["appartement", "olifant", "strand"], "appartement"),
                    ro_tokens("m05-l01-r1", ["verhuurder.", "bel", "Ik", "de"], "Ik bel de verhuurder."),
                    mcq(
                        "m05-l01-a3",
                        "‘Het is stuk’ betekent ongeveer",
                        ["Het werkt niet / het is kapot", "Het is nieuw", "Het is gratis"],
                        "Het werkt niet / het is kapot",
                    ),
                    mcq(
                        "m05-l01-a4",
                        "Natuurlijke vraag aan de verhuurder",
                        ["Kunt u morgen langskomen?", "Kunt u een pizza bakken?", "U bent een lift."],
                        "Kunt u morgen langskomen?",
                    ),
                    mcq(
                        "m05-l01-a5",
                        "Waar woon je? (zin)",
                        ["Ik woon op de tweede verdieping.", "Ik woon op de tweede pizza.", "Verdieping woon ik tweede."],
                        "Ik woon op de tweede verdieping.",
                    ),
                ],
            ),
            pl(
                "m05-l01-pl2",
                "Variatie — 6×",
                ["verwarming", "dringend", "alstublieft"],
                [
                    fb("m05-l01-b1", "Mijn ___ werkt niet. (warmte in huis)", ["verwarming", "balkon", "sleutel"], "verwarming"),
                    ro_tokens("m05-l01-r2", ["niet.", "internet", "Mijn", "doet"], "Mijn internet doet het niet."),
                    mcq(
                        "m05-l01-b2",
                        "Als het snel moet",
                        ["Het is dringend.", "Het is rustig.", "Het is een vakantie."],
                        "Het is dringend.",
                    ),
                    mcq(
                        "m05-l01-b3",
                        "Beleefd einde van een vraag",
                        ["… alstublieft?", "… nu meteen of nooit?", "… en ik ben boos?"],
                        "… alstublieft?",
                    ),
                    mcq(
                        "m05-l01-b4",
                        "Er is + probleem",
                        ["Er is een probleem met de stroom.", "Er is een probleem met de maan.", "Probleem er is stroom."],
                        "Er is een probleem met de stroom.",
                    ),
                    mcq(
                        "m05-l01-b5",
                        "Wie repareert vaak in een huurhuis?",
                        ["Vaak de verhuurder of een monteur", "Alleen de buurman, altijd", "Niemand, nooit"],
                        "Vaak de verhuurder of een monteur",
                    ),
                    mcq(
                        "m05-l01-b6",
                        "Kies de beste repliek naar de buur",
                        ["Dank je, ik bel de verhuurder.", "Dank je, ik verhuis vannacht.", "Buurman is altijd fout."],
                        "Dank je, ik bel de verhuurder.",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m05-l01-sp1",
                "Production",
                "Ik woon in een appartement met twee kamers.",
                ["Ik woon in een appartement met twee kamers", "ik woon in een appartement met twee kamers"],
                "Ik woon in een appartement met twee kamers",
            ),
            speak_step(
                "m05-l01-sp2",
                "Production — probleem",
                "Er is een lekkage in de badkamer.",
                ["Er is een lekkage in de badkamer", "er is een lekkage in de badkamer"],
                "Er is een lekkage in de badkamer",
            ),
            speak_step(
                "m05-l01-sp3",
                "Production — beleefd",
                "Kunt u mij helpen, alstublieft?",
                ["Kunt u mij helpen alstublieft", "Kunt u mij helpen, alstublieft?"],
                "Kunt u mij helpen alstublieft",
            ),
            speak_step(
                "m05-l01-sp4",
                "Production — naar de buur",
                "Dank je, ik bel zo de verhuurder.",
                ["Dank je ik bel zo de verhuurder", "Dank je, ik bel zo de verhuurder."],
                "Dank je ik bel zo de verhuurder",
            ),
            recap_step(
                "m05-l01-recap",
                "Recap",
                ["lekkage", "verhuurder", "helpen"],
                [
                    rt_fb("Ik woon in een ___.", ["appartement", "fiets", "strand"], "appartement"),
                    rt_ro(["badkamer.", "de", "in", "lekkage", "Een", "is", "Er"], "Er is een lekkage in de badkamer."),
                    rt_speak("Zeg: *Het is dringend.*", "Het is dringend."),
                    rt_listen_mcq(
                        "Snippet:",
                        "Bel je de verhuurder al?",
                        ["Vraag of Joy al belt", "Vraag om pizza", "Stop het gesprek"],
                        "Vraag of Joy al belt",
                    ),
                    rt_fb("Kunt u morgen ___? (langskomen)", ["langskomen", "zwemmen", "slapen"], "langskomen"),
                    rt_speak("Zeg: *Mijn verwarming werkt niet.*", "Mijn verwarming werkt niet."),
                ],
            ),
        ],
    }


def lesson_l02() -> dict:
    lid = "a2-m05-l02-listen-read-housing-descriptions"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Listening & reading · Housing descriptions",
        "lessonType": "input",
        "order": 1,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-housing-living", "a2.2-linking-housing"],
        "vocabTargets": ["lemma-huis", "lemma-huur", "lemma-balkon", "lemma-keuken", "lemma-sleutel"],
        "canDoStatements": [
            "I can read a short housing note and pick out type of home, rent, and rules.",
        ],
        "metadata": LM,
        "steps": [
            preview_step(
                "m05-l02-preview",
                "Warm-up — 5 woorden",
                [
                    ("huur", "huur", "rent", "💶"),
                    ("balkon", "balkon", "balcony", "🪴"),
                    ("keuken", "keuken", "kitchen", "🍳"),
                    ("afspraak", "afspraak", "appointment", "📅"),
                    ("sleutel", "sleutel", "key", "🔑"),
                ],
            ),
            listen_read_step(
                "m05-l02-lr",
                "Input — mail van verhuurder + jouw antwoord",
                [
                    (
                        "Verhuurder",
                        "Beste mevrouw Smit, uw huur is 950 euro per maand. Het appartement heeft een woonkamer, slaapkamer en een klein balkon. De sleutel haalt u bij de beheerder op maandag.",
                        "Dear Ms Smit, your rent is 950 euros per month. The flat has a living room, bedroom and small balcony. You collect the key from the building manager on Monday.",
                    ),
                    (
                        "Jij",
                        "Dank u wel. Ik heb nog een vraag: mag ik een kat in het appartement?",
                        "Thank you. I have another question: may I have a cat in the flat?",
                    ),
                    (
                        "Verhuurder",
                        "Kleine huisdieren zijn toegestaan, mits u de buren respecteert.",
                        "Small pets are allowed, provided you respect the neighbours.",
                    ),
                ],
                [
                    ("Hoeveel is de huur per maand?", ["950 euro", "95 euro", "9500 euro"], "950 euro"),
                    ("Wat heeft het appartement?", ["Woonkamer + slaapkamer + balkon", "Alleen een kelder", "Een zwembad"], "Woonkamer + slaapkamer + balkon"),
                    ("Waar haal je de sleutel?", ["Bij de beheerder op maandag", "Bij de bakker", "In de bus"], "Bij de beheerder op maandag"),
                    ("Wat vraag jij?", ["Of een kat mag", "Of je een auto mag", "Of je mag zingen"], "Of een kat mag"),
                    ("Wat zegt de verhuurder over huisdieren?", ["Kleine huisdieren mogen, met respect voor buren", "Geen dieren ooit", "Alleen olifanten"], "Kleine huisdieren mogen, met respect voor buren"),
                    ("Wat is de voorwaarde voor een huisdier?", ["Buren respecteren", "Geen buren", "Alleen op zondag"], "Buren respecteren"),
                ],
            ),
            discovery_step(
                "m05-l02-discovery",
                "Mail lezen: feit → vraag → antwoord",
                [
                    ("Ik huur een appartement.", "I rent a flat.", "huur"),
                    ("De huur is … per maand.", "The rent is … per month.", "maand"),
                    ("Ik heb een vraag: …", "I have a question: …", "vraag"),
                    ("Dank u wel.", "Thank you (formal).", "Dank"),
                ],
            ),
            pl(
                "m05-l02-pl1",
                "Practice — 6×",
                ["huur", "balkon", "sleutel"],
                [
                    mcq(
                        "m05-l02-p1",
                        "Welke zin is beleefd naar de verhuurder?",
                        ["Dank u wel voor de informatie.", "Hé, geef geld.", "Jij nu mail."],
                        "Dank u wel voor de informatie.",
                    ),
                    fb("m05-l02-p2", "We hebben een klein ___. (buiten, bij appartement)", ["balkon", "strand", "trein"], "balkon"),
                    ro_tokens("m05-l02-r1", ["maand.", "per", "euro", "De", "huur", "is", "850"], "De huur is 850 euro per maand."),
                    mcq(
                        "m05-l02-p3",
                        "Link: reden",
                        ["Ik stuur een mail, want ik heb een vraag.", "Ik stuur een mail want ik heb een vraag zonder komma", "Mail ik want vraag heb."],
                        "Ik stuur een mail, want ik heb een vraag.",
                    ),
                    mcq(
                        "m05-l02-p4",
                        "‘Slaapkamer’ =",
                        ["Kamer om te slapen", "Kamer voor auto", "Kamer zonder deur"],
                        "Kamer om te slapen",
                    ),
                    mcq(
                        "m05-l02-p5",
                        "Waar haal je vaak de sleutel bij nieuwbouw/complex?",
                        ["Bij de beheerder of receptie", "Bij de dierenwinkel", "In het zwembad"],
                        "Bij de beheerder of receptie",
                    ),
                ],
            ),
            pl(
                "m05-l02-pl2",
                "Variatie — 6×",
                ["keuken", "omdat", "beschikbaar"],
                [
                    mcq(
                        "m05-l02-q1",
                        "Omdat-zin (simpel)",
                        ["Ik blijf thuis, omdat de monteur komt.", "Ik blijf thuis omdat komt monteur.", "Thuis blijf ik omdat monteur."],
                        "Ik blijf thuis, omdat de monteur komt.",
                    ),
                    fb("m05-l02-q2", "De ___ is nieuw. (koken)", ["keuken", "balkon", "sleutel"], "keuken"),
                    ro_tokens("m05-l02-r2", ["vraag.", "een", "Ik", "heb", "nog"], "Ik heb nog een vraag."),
                    mcq(
                        "m05-l02-q3",
                        "Hoe vraag je formeel om hulp?",
                        ["Zou u mij kunnen helpen?", "Jij help nu!", "Help jij mij nu direct?"],
                        "Zou u mij kunnen helpen?",
                    ),
                    mcq(
                        "m05-l02-q4",
                        "Ik woon in een huis vs appartement",
                        ["Een huis heeft vaak geen buren boven je", "Een huis is altijd gratis", "Een appartement is altijd een boot"],
                        "Een huis heeft vaak geen buren boven je",
                    ),
                    mcq(
                        "m05-l02-q5",
                        "‘Beschikbaar’ in een mail",
                        ["Ik ben dinsdag beschikbaar voor een afspraak.", "Ik ben beschikbaar een pizza.", "Beschikbaar ik dinsdag."],
                        "Ik ben dinsdag beschikbaar voor een afspraak.",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m05-l02-sp1",
                "Production",
                "Ik huur een appartement met een balkon.",
                ["Ik huur een appartement met een balkon", "ik huur een appartement met een balkon"],
                "Ik huur een appartement met een balkon",
            ),
            speak_step(
                "m05-l02-sp2",
                "Production",
                "Dank u wel. Ik heb nog een vraag over de huur.",
                ["Dank u wel ik heb nog een vraag over de huur", "Dank u wel. Ik heb nog een vraag over de huur."],
                "Dank u wel ik heb nog een vraag over de huur",
            ),
            speak_step(
                "m05-l02-sp3",
                "Production — beleefd doorvragen",
                "Mag ik een kat in het appartement?",
                ["Mag ik een kat in het appartement", "mag ik een kat in het appartement"],
                "Mag ik een kat in het appartement",
            ),
            speak_step(
                "m05-l02-sp4",
                "Production",
                "Dank u wel voor uw antwoord.",
                ["Dank u wel voor uw antwoord", "Dank u wel voor uw antwoord."],
                "Dank u wel voor uw antwoord",
            ),
            recap_step(
                "m05-l02-recap",
                "Recap",
                ["huur", "sleutel", "vraag"],
                [
                    rt_fb("De ___ is 900 euro per maand.", ["huur", "kat", "zon"], "huur"),
                    rt_speak("Zeg: *Ik heb nog een vraag.*", "Ik heb nog een vraag."),
                    rt_listen_mcq(
                        "Snippet:",
                        "De sleutel haalt u bij de beheerder op maandag.",
                        ["Praktische afspraak over sleutel", "Recept voor koekjes", "Treinschema"],
                        "Praktische afspraak over sleutel",
                    ),
                    rt_ro(["wel.", "Dank", "u"], "Dank u wel."),
                    rt_fb("Zou u dat ___ doen, alstublieft? (kunnen: zou u)", ["kunnen", "eten", "zwemmen"], "kunnen"),
                    rt_speak("Zeg: *Mag ik een kat in het appartement?*", "Mag ik een kat in het appartement?"),
                ],
            ),
        ],
    }


def lesson_l03() -> dict:
    lid = "a2-m05-l03-grammar-talking-about-your-home"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Grammar & patterns · Talking about your home",
        "lessonType": "pattern",
        "order": 2,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-housing-living", "a2.2-reporting-problems"],
        "vocabTargets": ["lemma-woon", "lemma-appartement", "lemma-badkamer", "lemma-balkon", "lemma-huur"],
        "canDoStatements": ["I can describe rooms and simple features with short correct sentences."],
        "mistakeFocus": ["word-order", "article"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m05-l03-preview",
                "Warm-up — 4 woorden",
                [("slaapkamer", "slaapkamer", "bedroom", "🛏️"), ("woonkamer", "woonkamer", "living room", "🛋️"), ("verdieping", "verdieping", "floor", "⬆️"), ("ruim", "ruim", "spacious", "📐")],
            ),
            grammar_card(
                "m05-l03-gc",
                "Patroon",
                "Je huis kort beschrijven",
                "**Ik woon in** + type woning + **met** + kenmerken. **We hebben** + kamers/meubels. **Er is** + probleem/object.",
                [
                    ("Ik woon in een appartement met twee slaapkamers.", "I live in a flat with two bedrooms."),
                    ("We hebben een grote woonkamer en een kleine keuken.", "We have a big living room and a small kitchen."),
                ],
            ),
            listening_step(
                "m05-l03-listen-mini",
                "Input — hetzelfde patroon",
                [
                    ("Ravi", "Ik woon in een rijtjeshuis. We hebben drie kamers en een kleine tuin.", "I live in a terraced house. We have three rooms and a small garden."),
                    ("Ravi", "De badkamer is nieuw, maar de deur sluit niet goed.", "The bathroom is new, but the door doesn't close properly."),
                    ("Lisa", "Dan moet je dat melden bij de verhuurder.", "Then you should report that to the landlord."),
                ],
                [
                    ("Wat voor woning?", ["Rijtjeshuis", "Kasteel", "Boot"], "Rijtjeshuis"),
                    ("Wat is het probleem?", ["De badkamerdeur sluit niet goed", "De tuin is te groot", "Er is geen dak"], "De badkamerdeur sluit niet goed"),
                    ("Wat adviseert Lisa?", ["Melden bij verhuurder", "Niets doen", "De deur schilderen"], "Melden bij verhuurder"),
                    ("Welk contrastwoord hoort bij *nieuw, … deur*?", ["maar", "want", "omdat"], "maar"),
                    ("Hoeveel kamers noemt Ravi?", ["Drie", "Tien", "Eén"], "Drie"),
                ],
            ),
            discovery_step(
                "m05-l03-discovery",
                "Guided noticing",
                [
                    ("Ik woon in een … met …", "I live in a … with …", "met"),
                    ("We hebben …", "We have …", "hebben"),
                    ("Er is een probleem met …", "There is a problem with …", "Er is"),
                    ("Het is kapot.", "It's broken.", "kapot"),
                ],
            ),
            pl(
                "m05-l03-pl1",
                "Practice — 6×",
                ["woonkamer", "slaapkamer", "tuin"],
                [
                    mcq(
                        "m05-l03-a1",
                        "Juiste zin",
                        ["Ik woon in een huis met een tuin.", "Ik woon in een tuin met een huis.", "Woon ik tuin huis in."],
                        "Ik woon in een huis met een tuin.",
                    ),
                    fb("m05-l03-a2", "We hebben twee ___. (slapen)", ["slaapkamers", "olifanten", "stranden"], "slaapkamers"),
                    ro_tokens("m05-l03-r1", ["keuken.", "kleine", "een", "Hebben", "we"], "We hebben een kleine keuken."),
                    mcq(
                        "m05-l03-a3",
                        "Er is …",
                        ["Er is geen warm water.", "Er is geen warme maan.", "Warm water er is geen."],
                        "Er is geen warm water.",
                    ),
                    mcq(
                        "m05-l03-a4",
                        "Transform: informeel probleem",
                        ["Het toilet is stuk.", "Het toilet is een feest.", "Toilet stuk het is."],
                        "Het toilet is stuk.",
                    ),
                    mcq(
                        "m05-l03-a5",
                        "Verdieping",
                        ["Ik woon op de derde verdieping.", "Ik woon in de derde pizza.", "Derde woon ik verdieping op."],
                        "Ik woon op de derde verdieping.",
                    ),
                    mcq(
                        "m05-l03-a6",
                        "Kamer + meubel",
                        ["In de woonkamer staat een bank en een tafel.", "In de woonkamer staat een olifant.", "Woonkamer bank tafel staat."],
                        "In de woonkamer staat een bank en een tafel.",
                    ),
                ],
            ),
            pl(
                "m05-l03-pl2",
                "Variatie — 6×",
                ["kapot", "probleem", "melden"],
                [
                    mcq(
                        "m05-l03-b1",
                        "Wat betekent *melden* hier?",
                        ["Doorgeven aan verhuurder/service", "Een brief verbranden", "Zwijgen"],
                        "Doorgeven aan verhuurder/service",
                    ),
                    fb("m05-l03-b2", "Het raam is ___.", ["kapot", "blij", "zoet"], "kapot"),
                    ro_tokens("m05-l03-r2", ["met", "probleem", "het", "Er", "is", "een", "stroom"], "Er is een probleem met de stroom."),
                    mcq(
                        "m05-l03-b3",
                        "Kies natuurlijk Nederlands",
                        ["Mijn balkon is klein maar fijn.", "Mijn balkon is klein en fijn maar.", "Balkon klein fijn is."],
                        "Mijn balkon is klein maar fijn.",
                    ),
                    mcq(
                        "m05-l03-b4",
                        "Vergelijking appartement",
                        ["In een appartement hoor je soms de buren.", "In een appartement ben je altijd alleen op een eiland.", "Appartement is altijd gratis."],
                        "In een appartement hoor je soms de buren.",
                    ),
                    mcq(
                        "m05-l03-b5",
                        "Welke vraag past bij woning?",
                        ["Hoeveel vierkante meter is het?", "Hoeveel kilo bent u?", "Wat is uw lievelingskleur?"],
                        "Hoeveel vierkante meter is het?",
                    ),
                    mcq(
                        "m05-l03-b6",
                        "Samenvatting probleem",
                        ["Ik wil melden dat de deur niet dichtgaat.", "Ik wil melden dat de maan valt.", "Melden deur ik maan."],
                        "Ik wil melden dat de deur niet dichtgaat.",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m05-l03-sp1",
                "Production",
                "Ik woon in een appartement met een woonkamer en een slaapkamer.",
                ["Ik woon in een appartement met een woonkamer en een slaapkamer", "ik woon in een appartement met een woonkamer en een slaapkamer"],
                "Ik woon in een appartement met een woonkamer en een slaapkamer",
            ),
            speak_step(
                "m05-l03-sp2",
                "Production",
                "Er is een probleem met de verwarming.",
                ["Er is een probleem met de verwarming", "er is een probleem met de verwarming"],
                "Er is een probleem met de verwarming",
            ),
            speak_step(
                "m05-l03-sp3",
                "Production — oplossing",
                "Dan moet ik dat melden bij de verhuurder.",
                ["Dan moet ik dat melden bij de verhuurder", "dan moet ik dat melden bij de verhuurder"],
                "Dan moet ik dat melden bij de verhuurder",
            ),
            recap_step(
                "m05-l03-recap",
                "Recap",
                ["woon", "probleem", "met"],
                [
                    rt_fb("Ik ___ in een huis met een tuin.", ["woon", "eet", "slaap"], "woon"),
                    rt_ro(["kamers.", "twee", "We", "hebben"], "We hebben twee kamers."),
                    rt_speak("Zeg: *Het is kapot.*", "Het is kapot."),
                    rt_listen_mcq(
                        "Snippet:",
                        "Dan moet je dat melden bij de verhuurder.",
                        ["Advies: melden", "Advies: verhuizen naar Spanje", "Advies: niets zeggen"],
                        "Advies: melden",
                    ),
                    rt_fb("Er is een ___ met de boiler. (probleem)", ["probleem", "feest", "lied"], "probleem"),
                    rt_speak("Zeg: *We hebben een kleine keuken.*", "We hebben een kleine keuken."),
                ],
            ),
        ],
    }


def lesson_l04() -> dict:
    lid = "a2-m05-l04-practice-problems-basic-sentences"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Controlled practice · Problems & basic sentences",
        "lessonType": "practice",
        "order": 3,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-reporting-problems", "a2.2-polite-u-housing"],
        "vocabTargets": ["lemma-internet", "lemma-stroom", "lemma-boiler", "lemma-dringend", "lemma-repareren", "lemma-monteur"],
        "canDoStatements": ["I can pick correct problem sentences and polite fixes."],
        "mistakeFocus": ["polite-form", "separable"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m05-l04-preview",
                "Warm-up — 5 woorden",
                [("storing", "storing", "malfunction / outage", "⚡"), ("monteur", "monteur", "technician", "🧰"), ("internet", "internet", "internet", "📶"), ("boiler", "boiler", "boiler", "♨️"), ("dringend", "dringend", "urgent", "‼️")],
            ),
            listening_step(
                "m05-l04-listen",
                "Input — storingsdienst",
                [
                    ("Agent", "Goedemiddag, storingsdienst, waarmee kan ik u helpen?", "Good afternoon, faults line, how can I help?"),
                    ("Jij", "Goedemiddag. Ik heb geen stroom in de keuken. Alleen daar.", "Good afternoon. I have no power in the kitchen. Only there."),
                    ("Agent", "Oké. Kunt u de groep in de meterkast controleren?", "Okay. Can you check the circuit in the meter cupboard?"),
                    ("Jij", "Ik heb dat gedaan. Het is nog steeds uit.", "I've done that. It's still off."),
                    ("Agent", "Dan stuur ik een monteur. Morgen tussen tien en twaalf. Is dat goed?", "Then I'll send a technician. Tomorrow between ten and twelve. Is that okay?"),
                ],
                [
                    ("Waar is het probleem?", ["In de keuken: geen stroom", "In de tuin: geen pizza", "Overal: feest"], "In de keuken: geen stroom"),
                    ("Wat vraagt de agent eerst?", ["Meterkast controleren", "Koffie zetten", "Naar Spanje verhuizen"], "Meterkast controleren"),
                    ("Wat belooft de agent?", ["Monteur morgen tussen tien en twaalf", "Niets", "Een nieuwe keuken gratis"], "Monteur morgen tussen tien en twaalf"),
                    ("Hoe reageer jij op het voorstel?", ["Is dat goed? → akkoord in context", "Je weigert altijd", "Je hangt op"], "Is dat goed? → akkoord in context"),
                    ("Welke toon past bij de agent?", ["Professioneel en rustig", "Boos", "Grappig alleen"], "Professioneel en rustig"),
                ],
            ),
            discovery_step(
                "m05-l04-discovery",
                "Guided noticing",
                [
                    ("Ik heb geen stroom / internet.", "I have no power / internet.", "geen"),
                    ("Kunt u … controleren?", "Can you check …?", "Kunt u"),
                    ("Het is nog steeds uit.", "It's still off.", "uit"),
                    ("Dat is dringend.", "That's urgent.", "dringend"),
                ],
            ),
            pl(
                "m05-l04-pl1",
                "Practice + match — 6×",
                ["stroom", "internet", "repareren"],
                [
                    mcq(
                        "m05-l04-p1",
                        "Welke zin meldt een storing?",
                        ["Mijn internet doet het niet sinds vanochtend.", "Mijn internet is een vriend.", "Internet doet ik niet."],
                        "Mijn internet doet het niet sinds vanochtend.",
                    ),
                    match_ex(
                        "m05-l04-p2",
                        "Koppel probleem → oplossing (typisch)",
                        [
                            ("Lekkage", "Monteur / loodgieter"),
                            ("Geen stroom", "Elektricien / meterkast"),
                            ("Geen warm water", "Boiler / verwarming"),
                        ],
                        {"Lekkage": "Monteur / loodgieter", "Geen stroom": "Elektricien / meterkast", "Geen warm water": "Boiler / verwarming"},
                    ),
                    fb("m05-l04-p3", "Kunt u dat ___ alstublieft? (werkwoord: repareren)", ["repareren", "zwemmen", "zingen"], "repareren"),
                    ro_tokens("m05-l04-r1", ["niet.", "werkt", "verwarming", "Mijn"], "Mijn verwarming werkt niet."),
                    mcq(
                        "m05-l04-p4",
                        "Beleefd verzoek",
                        ["Zou u vandaag nog langs kunnen komen?", "Kom nu onmiddellijk!", "Jij nu hier!"],
                        "Zou u vandaag nog langs kunnen komen?",
                    ),
                    mcq(
                        "m05-l04-p5",
                        "‘Het is kapot’ vs ‘het werkt niet’",
                        ["Beide kunnen een probleem zeggen", "Alleen ‘kapot’ mag in het Nederlands", "Ze betekenen altijd vakantie"],
                        "Beide kunnen een probleem zeggen",
                    ),
                    mcq(
                        "m05-l04-p6",
                        "Oplossing in zin",
                        ["De monteur repareert de boiler vandaag.", "De monteur eet de boiler.", "Monteur boiler vandaag repareren de."],
                        "De monteur repareert de boiler vandaag.",
                    ),
                ],
            ),
            pl(
                "m05-l04-pl2",
                "Variatie — 6×",
                ["alstublieft", "monteur", "afspraak"],
                [
                    mcq(
                        "m05-l04-q1",
                        "Afspraak plannen",
                        ["Ik heb een afspraak nodig met een monteur.", "Ik heb een monteur als huisdier.", "Afspraak ben ik monteur."],
                        "Ik heb een afspraak nodig met een monteur.",
                    ),
                    fb("m05-l04-q2", "___ laat bent u beschikbaar? (vragen)", ["Hoe", "Waar", "Wie"], "Hoe"),
                    ro_tokens("m05-l04-r2", ["helpen?", "mij", "Kunt", "u"], "Kunt u mij helpen?"),
                    mcq(
                        "m05-l04-q3",
                        "Dringend mailtje",
                        ["Dit is dringend: er komt water onder de deur.", "Dit is dringend: ik wil taart.", "Dringend is een kleur."],
                        "Dit is dringend: er komt water onder de deur.",
                    ),
                    mcq(
                        "m05-l04-q4",
                        "Juiste beleefdheid",
                        ["Kunt u mij bellen, alstublieft?", "Bel mij nu, jij!", "U bent een telefoon."],
                        "Kunt u mij bellen, alstublieft?",
                    ),
                    mcq(
                        "m05-l04-q5",
                        "Wanneer komt u langs?",
                        ["Vraag naar tijd van bezoek", "Vraag naar schoenmaat", "Vraag naar weer op Mars"],
                        "Vraag naar tijd van bezoek",
                    ),
                    mcq(
                        "m05-l04-q6",
                        "Bevestiging afspraak",
                        ["Prima, dan zie ik u morgen om tien uur.", "Prima, dan eet ik de monteur.", "Prima morgen zie ik u nooit."],
                        "Prima, dan zie ik u morgen om tien uur.",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m05-l04-sp1",
                "Production",
                "Mijn internet doet het niet. Kunt u mij helpen, alstublieft?",
                ["Mijn internet doet het niet kunt u mij helpen alstublieft", "Mijn internet doet het niet. Kunt u mij helpen, alstublieft?"],
                "Mijn internet doet het niet kunt u mij helpen alstublieft",
            ),
            speak_step(
                "m05-l04-sp2",
                "Production",
                "Het is dringend. Ik heb geen warm water.",
                ["Het is dringend ik heb geen warm water", "Het is dringend. Ik heb geen warm water."],
                "Het is dringend ik heb geen warm water",
            ),
            recap_step(
                "m05-l04-recap",
                "Recap",
                ["stroom", "monteur", "dringend"],
                [
                    rt_fb("Ik heb geen ___ in de keuken. (elektriciteit)", ["stroom", "pizza", "zon"], "stroom"),
                    rt_speak("Zeg: *Kunt u dat repareren?*", "Kunt u dat repareren?"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Dan stuur ik een monteur. Morgen tussen tien en twaalf.",
                        ["Afspraak + tijdsslot", "Uitnodiging feest", "Weerbericht"],
                        "Afspraak + tijdsslot",
                    ),
                    rt_ro(["uit.", "Het", "is", "nog", "steeds"], "Het is nog steeds uit."),
                    rt_fb("Zou u dat ___ kunnen doen? (beleefd)", ["kunnen", "eten", "slapen"], "kunnen"),
                    rt_speak("Zeg: *Ik heb een afspraak nodig.*", "Ik heb een afspraak nodig."),
                ],
            ),
        ],
    }


def lesson_l05() -> dict:
    lid = "a2-m05-l05-speaking-describe-living-situation"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Speaking · Describe your living situation",
        "lessonType": "speaking",
        "order": 4,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-housing-living", "a2.2-polite-u-housing"],
        "vocabTargets": ["lemma-appartement", "lemma-huur", "lemma-badkamer", "lemma-probleem", "lemma-helpen"],
        "canDoStatements": [
            "I can describe my home, name one problem, ask for help, and confirm a detail.",
        ],
        "mistakeFocus": ["register", "word-order"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m05-l05-preview",
                "Warm-up — 4 woorden",
                [("buur", "buur", "neighbour", "🏘️"), ("geluid", "geluid", "noise", "🔊"), ("veilig", "veilig", "safe", "🔒"), ("rustig", "rustig", "quiet", "🤫")],
            ),
            listening_step(
                "m05-l05-listen",
                "Input — intake telefoon verhuurder (probleem → vervolgstap)",
                [
                    ("Vera", "Hallo, u spreekt met Vera van het Vastgoedkantoor. Waar woont u precies?", "Hello, you're speaking with Vera from the property office. Where exactly do you live?"),
                    ("Jij", "Ik woon in appartement 12B aan de Dorpstraat.", "I live in flat 12B on Dorpstraat."),
                    ("Vera", "Oké. Wat is het probleem?", "Okay. What's the problem?"),
                    ("Jij", "Er is een lekkage onder de wastafel. De vloer wordt nat.", "There's a leak under the sink. The floor is getting wet."),
                    ("Vera", "Duidelijk. Kunt u mij een foto sturen, alstublieft? Dan bel ik u terug.", "Clear. Can you send me a photo, please? Then I'll call you back."),
                ],
                [
                    ("Wat vraagt Vera eerst?", ["Waar woont u", "Wat is uw hobby", "Hoeveel weegt u"], "Waar woont u"),
                    ("Welk adres noem jij?", ["12B aan de Dorpstraat", "12B, Mars", "Geen adres"], "12B aan de Dorpstraat"),
                    ("Waar is de lekkage?", ["Onder de wastafel", "In de koelkast", "Op het dak van de buur"], "Onder de wastafel"),
                    ("Wat is de volgende stap van Vera?", ["Een foto, dan belt zij terug", "Ze stuurt meteen een monteur zonder info", "Ze vraagt om huurverhoging"], "Een foto, dan belt zij terug"),
                    ("Wat vraagt Vera over de foto?", ["Kunt u … sturen, alstublieft?", "Geef nu geld", "Stuur een pizza"], "Kunt u … sturen, alstublieft?"),
                    ("Welke toon?", ["Zakelijk en duidelijk", "Boos", "Onhoorbaar"], "Zakelijk en duidelijk"),
                ],
            ),
            discovery_step(
                "m05-l05-discovery",
                "Spreekpatronen",
                [
                    ("Ik woon op … / in appartement …", "I live at … / in flat …", "woon"),
                    ("Er is een probleem met …", "There is a problem with …", "probleem"),
                    ("Kunt u …, alstublieft?", "Can you …, please?", "Kunt u"),
                    ("Dat is duidelijk.", "That's clear.", "duidelijk"),
                ],
            ),
            pl(
                "m05-l05-pl1",
                "Simulatie — 6×",
                ["lekkage", "foto", "bellen"],
                [
                    mcq(
                        "m05-l05-a1",
                        "Bevestigen adres",
                        ["Ik woon in appartement 4C.", "Ik woon in appartement maan.", "Appartement woon ik 4C in."],
                        "Ik woon in appartement 4C.",
                    ),
                    mcq(
                        "m05-l05-a2",
                        "Probleem kort",
                        ["Het raam zit niet goed dicht.", "Het raam is een vis.", "Raam goed niet zit."],
                        "Het raam zit niet goed dicht.",
                    ),
                    ro_tokens("m05-l05-r1", ["terug?", "u", "bel", "Ik", "Dan"], "Dan bel ik u terug."),
                    mcq(
                        "m05-l05-a3",
                        "Na uitleg",
                        ["Dat is duidelijk, dank u wel.", "Dat is onduidelijk, zwijg.", "Duidelijk ben ik."],
                        "Dat is duidelijk, dank u wel.",
                    ),
                    mcq(
                        "m05-l05-a4",
                        "Hulp vragen",
                        ["Kunt u vandaag langskomen?", "Kom nu of nooit!", "U bent een kalender."],
                        "Kunt u vandaag langskomen?",
                    ),
                    mcq(
                        "m05-l05-a5",
                        "Geluidsoverlast (buur)",
                        ["Ik hoor veel geluid van boven.", "Ik hoor veel geluid van pizza.", "Geluid hoor ik boven veel."],
                        "Ik hoor veel geluid van boven.",
                    ),
                ],
            ),
            pl(
                "m05-l05-pl2",
                "Variatie — 6×",
                ["huur", "sleutel", "dringend"],
                [
                    fb("m05-l05-b1", "Ik heb mijn ___ vergeten binnen. (toegang)", ["sleutel", "kat", "regen"], "sleutel"),
                    mcq(
                        "m05-l05-b2",
                        "Escalatie netjes",
                        ["Het is echt dringend, want er komt water bij de stopcontacten.", "Het is dringend, want ik wil chips.", "Dringend water chips."],
                        "Het is echt dringend, want er komt water bij de stopcontacten.",
                    ),
                    ro_tokens("m05-l05-r2", ["nodig.", "een", "heb", "Ik", "afspraak"], "Ik heb een afspraak nodig."),
                    mcq(
                        "m05-l05-b3",
                        "Foto + mail",
                        ["Ik stuur u zo een foto per mail.", "Ik stuur u een foto van de maan.", "Foto stuur ik u zo per trein."],
                        "Ik stuur u zo een foto per mail.",
                    ),
                    mcq(
                        "m05-l05-b4",
                        "Polite slot",
                        ["Met vriendelijke groet,", "Groetjes loser,", "Doei voor altijd,"],
                        "Met vriendelijke groet,",
                    ),
                    mcq(
                        "m05-l05-b5",
                        "Check: wie belt wie",
                        ["U belt de verhuurder over een defect", "U belt de pizzeria voor verwarming", "U belt nooit"],
                        "U belt de verhuurder over een defect",
                    ),
                    mcq(
                        "m05-l05-b6",
                        "Bevestigen tijd",
                        ["Prima, morgen om elf uur is goed voor mij.", "Prima, morgen om elf pizza.", "Morgen elf goed is prima."],
                        "Prima, morgen om elf uur is goed voor mij.",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m05-l05-sp1",
                "Turn 1 — waar woon je",
                "Ik woon in een appartement op de eerste verdieping.",
                ["Ik woon in een appartement op de eerste verdieping", "ik woon in een appartement op de eerste verdieping"],
                "Ik woon in een appartement op de eerste verdieping",
            ),
            speak_step(
                "m05-l05-sp2",
                "Turn 2 — probleem",
                "Er is een probleem met de boiler. Ik heb geen warm water.",
                ["Er is een probleem met de boiler ik heb geen warm water", "Er is een probleem met de boiler. Ik heb geen warm water."],
                "Er is een probleem met de boiler ik heb geen warm water",
            ),
            speak_step(
                "m05-l05-sp3",
                "Turn 3 — hulp",
                "Kunt u een monteur sturen, alstublieft?",
                ["Kunt u een monteur sturen alstublieft", "Kunt u een monteur sturen, alstublieft?"],
                "Kunt u een monteur sturen alstublieft",
            ),
            speak_step(
                "m05-l05-sp4",
                "Turn 4 — bevestigen",
                "Ja, dat klopt. Morgen om tien uur is goed.",
                ["Ja dat klopt morgen om tien uur is goed", "Ja, dat klopt. Morgen om tien uur is goed."],
                "Ja dat klopt morgen om tien uur is goed",
            ),
            recap_step(
                "m05-l05-recap",
                "Recap",
                ["woon", "probleem", "foto"],
                [
                    rt_speak("Zeg: *Ik woon in appartement 12B.*", "Ik woon in appartement 12B."),
                    rt_ro(["lekkage.", "een", "is", "Er"], "Er is een lekkage."),
                    rt_fb("Kunt u mij ___, alstublieft? (helpen)", ["helpen", "zwemmen", "koken"], "helpen"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Kunt u mij een foto sturen, alstublieft?",
                        ["Vraag om bewijs / foto", "Vraag om recept", "Vraag om sokken"],
                        "Vraag om bewijs / foto",
                    ),
                    rt_speak("Zeg: *Dat is duidelijk.*", "Dat is duidelijk."),
                    rt_fb("Het is ___, want er is water op de grond. (dringend)", ["dringend", "koud", "traag"], "dringend"),
                ],
            ),
        ],
    }


def lesson_l06() -> dict:
    lid = "a2-m05-l06-listening-service-conversations-repairs"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Listening · Service conversations (repairs)",
        "lessonType": "input",
        "order": 5,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-reporting-problems", "a2.2-polite-u-housing", "a2.2-perfectum-light"],
        "vocabTargets": ["lemma-monteur", "lemma-afspraak", "lemma-repareren", "lemma-boiler", "lemma-dringend"],
        "canDoStatements": [
            "I can follow a repair booking call and pick times, actions, and polite requests.",
        ],
        "mistakeFocus": ["listening-gist", "polite-form"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m05-l06-preview",
                "Warm-up — 5 woorden",
                [
                    ("storingsdienst", "storingsdienst", "faults / repairs line", "📞"),
                    ("onderdelen", "onderdelen", "parts", "🔩"),
                    ("garantie", "garantie", "warranty", "🧾"),
                    ("terugbellen", "terugbellen", "to call back", "🔁"),
                    ("tijdslot", "tijdslot", "time slot", "⏱️"),
                ],
            ),
            listening_step(
                "m05-l06-listen",
                "Input — monteur plannen",
                [
                    (
                        "Agent",
                        "Goedemorgen, technische dienst. Waarmee kan ik u helpen?",
                        "Good morning, technical service. How can I help?",
                    ),
                    (
                        "Jij",
                        "Goedemorgen. Mijn boiler werkt niet. Ik heb geen warm water.",
                        "Good morning. My boiler isn't working. I have no hot water.",
                    ),
                    (
                        "Agent",
                        "Oké. Kunt u de boiler even uitzetten en weer aanzetten? Soms helpt dat.",
                        "Okay. Can you turn the boiler off and on again? Sometimes that helps.",
                    ),
                    (
                        "Jij",
                        "Ik heb dat gisteren al gedaan. Het helpt niet.",
                        "I did that yesterday already. It doesn't help.",
                    ),
                    (
                        "Agent",
                        "Begrijpelijk. Ik plan een monteur. Morgen tussen half tien en half twaalf. Is dat goed?",
                        "Understood. I'll schedule a technician. Tomorrow between 9:30 and 11:30. Is that okay?",
                    ),
                    (
                        "Jij",
                        "Ja, dat is goed. Zou u mij een bevestiging kunnen sturen, alstublieft?",
                        "Yes, that's fine. Could you send me a confirmation, please?",
                    ),
                ],
                [
                    ("Wat is het hoofdprobleem?", ["Geen warm water / boiler", "Geen balkon", "Geen buren"], "Geen warm water / boiler"),
                    ("Wat vraagt de agent eerst?", ["Uit- en aanzetten", "Verhuizen", "Taart bakken"], "Uit- en aanzetten"),
                    ("Wat zeg jij over die tip?", ["Ik heb dat gisteren al gedaan", "Ik weiger alles", "Ik ben de boiler"], "Ik heb dat gisteren al gedaan"),
                    ("Wanneer komt de monteur?", ["Morgen tussen half tien en half twaalf", "Over een jaar", "Nooit"], "Morgen tussen half tien en half twaalf"),
                    ("Wat vraag je op het eind?", ["Bevestiging sturen", "Pizza", "Nieuwe boiler gratis"], "Bevestiging sturen"),
                    ("Welke vorm is extra beleefd?", ["Zou u … kunnen …, alstublieft?", "Doe nu!", "Jij stuur!"], "Zou u … kunnen …, alstublieft?"),
                ],
            ),
            discovery_step(
                "m05-l06-discovery",
                "Perfectum: alleen simpel (heb + gebeld / gedaan)",
                [
                    ("Ik heb … gedaan.", "I have done … (fixed phrases only).", "heb"),
                    ("Ik heb al gebeld.", "I've already called.", "gebeld"),
                    ("Kunt u … aanzetten / uitzetten?", "Can you switch on/off?", "aan"),
                    ("Zou u … kunnen sturen?", "Could you send …?", "Zou u"),
                    ("Is dat goed?", "Is that okay?", "goed"),
                ],
            ),
            pl(
                "m05-l06-pl1",
                "Practice — 6×",
                ["boiler", "monteur", "bevestiging"],
                [
                    mcq(
                        "m05-l06-a1",
                        "Symptoom",
                        ["Ik heb geen warm water.", "Ik heb geen warme schoenen.", "Warm water heb ik warm."],
                        "Ik heb geen warm water.",
                    ),
                    fb("m05-l06-a2", "Ik ___ gisteren al gebeld. (hebben: ik)", ["heb", "ben", "word"], "heb"),
                    ro_tokens("m05-l06-r1", ["sturen?", "mij", "Kunt", "u", "een", "sms"], "Kunt u mij een sms sturen?"),
                    mcq(
                        "m05-l06-a3",
                        "Juiste beleefdheid",
                        ["Zou u morgen langs kunnen komen?", "Kom morgen of ik word boos!", "Morgen kom jij nu!"],
                        "Zou u morgen langs kunnen komen?",
                    ),
                    mcq(
                        "m05-l06-a4",
                        "Wat betekent *tussen half tien en half twaalf*?",
                        ["Een tijdsvenster", "Een adres", "Een kleur"],
                        "Een tijdsvenster",
                    ),
                    match_ex(
                        "m05-l06-a5",
                        "Koppel vraag → antwoord (service)",
                        [
                            ("Wanneer komt u?", "Morgen tussen tien en twaalf"),
                            ("Is het dringend?", "Ja, ik heb geen warm water"),
                            ("Kunt u bevestigen?", "Ja, ik stuur een mail"),
                        ],
                        {
                            "Wanneer komt u?": "Morgen tussen tien en twaalf",
                            "Is het dringend?": "Ja, ik heb geen warm water",
                            "Kunt u bevestigen?": "Ja, ik stuur een mail",
                        },
                    ),
                    mcq(
                        "m05-l06-a6",
                        "Perfectum: natuurlijk",
                        ["Ik heb de storingsdienst al gebeld.", "Ik heb al gebeld de storingsdienst.", "Gebeld ik heb storingsdienst."],
                        "Ik heb de storingsdienst al gebeld.",
                    ),
                ],
            ),
            pl(
                "m05-l06-pl2",
                "Variatie — 6×",
                ["uitzetten", "aanzetten", "dringend"],
                [
                    mcq(
                        "m05-l06-b1",
                        "Separable in instructie",
                        ["Zet de boiler even uit en daarna weer aan.", "Zet uit de boiler even en aan daarna weer.", "Boiler zet uit aan even."],
                        "Zet de boiler even uit en daarna weer aan.",
                    ),
                    fb("m05-l06-b2", "Het is ___, want er is een kind in huis. (spoed)", ["dringend", "grappig", "traag"], "dringend"),
                    ro_tokens("m05-l06-r2", ["repareren?", "dat", "Kunt", "u"], "Kunt u dat repareren?"),
                    mcq(
                        "m05-l06-b3",
                        "Als de lijn slecht is",
                        ["Sorry, kunt u dat herhalen?", "Sorry, ik hang op altijd.", "Herhaal jij nooit."],
                        "Sorry, kunt u dat herhalen?",
                    ),
                    mcq(
                        "m05-l06-b4",
                        "Oplossing na bezoek",
                        ["Hij heeft het vandaag gerepareerd.", "Hij heeft vandaag gerepareerd het.", "Hij repareren heeft het."],
                        "Hij heeft het vandaag gerepareerd.",
                    ),
                    mcq(
                        "m05-l06-b5",
                        "Bevestigen afspraak",
                        ["Prima, ik ben thuis in dat tijdslot.", "Prima, ik ben een tijdslot.", "Thuis ben ik tijdslot in."],
                        "Prima, ik ben thuis in dat tijdslot.",
                    ),
                    mcq(
                        "m05-l06-b6",
                        "Escalatie zonder grof te zijn",
                        ["Het lukt nog steeds niet na uw tip.", "Het lukt nooit, u bent slecht!", "Tip uw na slecht."],
                        "Het lukt nog steeds niet na uw tip.",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m05-l06-sp1",
                "Production",
                "Mijn boiler werkt niet. Ik heb geen warm water.",
                ["Mijn boiler werkt niet ik heb geen warm water", "Mijn boiler werkt niet. Ik heb geen warm water."],
                "Mijn boiler werkt niet ik heb geen warm water",
            ),
            speak_step(
                "m05-l06-sp2",
                "Production",
                "Zou u een monteur kunnen sturen, alstublieft?",
                ["Zou u een monteur kunnen sturen alstublieft", "Zou u een monteur kunnen sturen, alstublieft?"],
                "Zou u een monteur kunnen sturen alstublieft",
            ),
            speak_step(
                "m05-l06-sp3",
                "Production",
                "Ik heb dat al gedaan. Het helpt niet.",
                ["Ik heb dat al gedaan het helpt niet", "Ik heb dat al gedaan. Het helpt niet."],
                "Ik heb dat al gedaan het helpt niet",
            ),
            recap_step(
                "m05-l06-recap",
                "Recap",
                ["boiler", "monteur", "bevestiging"],
                [
                    rt_fb("Ik heb geen ___ water. (warm)", ["warm", "koud", "zoet"], "warm"),
                    rt_speak("Zeg: *Is dat goed voor u?*", "Is dat goed voor u?"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Ik plan een monteur. Morgen tussen half tien en half twaalf.",
                        ["Tijdslot voor bezoek", "Openingstijden supermarkt", "Treinschema"],
                        "Tijdslot voor bezoek",
                    ),
                    rt_ro(["gedaan.", "dat", "Ik", "heb", "al"], "Ik heb dat al gedaan."),
                    rt_fb("Zou u mij een ___ kunnen sturen? (bevestiging)", ["bevestiging", "pizza", "auto"], "bevestiging"),
                    rt_speak("Zeg: *Kunt u de boiler even uitzetten?*", "Kunt u de boiler even uitzetten?"),
                ],
            ),
        ],
    }


def lesson_l07() -> dict:
    lid = "a2-m05-l07-grammar-separable-verbs-utilities"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Grammar & patterns · Separable verbs (aan / uit / op)",
        "lessonType": "pattern",
        "order": 6,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-separable-housing", "a2.2-linking-housing", "a2.2-polite-u-housing"],
        "vocabTargets": ["lemma-verwarming", "lemma-bellen", "lemma-internet", "lemma-stroom", "lemma-alstublieft"],
        "canDoStatements": [
            "I can place aan/uit/op particles correctly in short utility and phone sentences.",
        ],
        "mistakeFocus": ["separable-verb", "word-order"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m05-l07-preview",
                "Warm-up — 4 woorden",
                [
                    ("aanzetten", "aanzetten", "to switch on", "▶️"),
                    ("uitzetten", "uitzetten", "to switch off", "⏹️"),
                    ("opbellen", "opbellen", "to call up", "📲"),
                    ("meterkast", "meterkast", "fuse box / meter cupboard", "⚙️"),
                ],
            ),
            grammar_card(
                "m05-l07-gc",
                "Patroon",
                "Scheidbare werkwoorden (thuis)",
                "**In de hoofdzin** staat het voorzetsel **aan het eind**: *Ik zet de verwarming **aan***. *Zet het licht **uit***. *Ik bel de service **op***.",
                [
                    ("Ik zet de boiler aan, want het is koud.", "I turn the boiler on because it's cold."),
                    ("Zet de stroom in de keuken niet uit, alstublieft.", "Please don't switch off the power in the kitchen."),
                ],
            ),
            listen_read_step(
                "m05-l07-lr",
                "Input — huisgenoot + storing",
                [
                    (
                        "Noah",
                        "Kun je de verwarming even aanzetten? Het is koud in de gang.",
                        "Can you turn the heating on for a moment? It's cold in the hall.",
                    ),
                    (
                        "Jij",
                        "Ja, maar het lampje op de boiler brandt niet. Ik bel zo de verhuurder op.",
                        "Yes, but the light on the boiler isn't on. I'll call the landlord in a bit.",
                    ),
                    (
                        "Noah",
                        "Top. Zet ondertussen het licht in de kelder uit, dan besparen we stroom.",
                        "Great. Meanwhile switch off the light in the basement, then we save power.",
                    ),
                ],
                [
                    ("Wat vraagt Noah eerst?", ["Verwarming aanzetten", "Internet kopen", "De deur schilderen"], "Verwarming aanzetten"),
                    ("Wat ga jij doen?", ["De verhuurder opbellen", "De verhuurder opeten", "Bell op verhuurder"], "De verhuurder opbellen"),
                    ("Wat vraagt Noah over de kelder?", ["Licht uitzetten", "Licht aanzetten", "Kelder verven"], "Licht uitzetten"),
                    ("Waarom zetten jullie het licht uit?", ["Stroom besparen", "Omdat het donker leuk is", "Geen reden"], "Stroom besparen"),
                    ("Welke zin heeft een scheidbaar werkwoord goed?", ["Ik zet de verwarming aan.", "Ik aan zet de verwarming.", "Zet ik aan verwarming de."], "Ik zet de verwarming aan."),
                ],
            ),
            discovery_step(
                "m05-l07-discovery",
                "Guided noticing",
                [
                    ("… aanzetten", "to switch on (particle at end)", "aan"),
                    ("… uitzetten", "to switch off", "uit"),
                    ("… opbellen", "to call (up)", "op"),
                    ("want / omdat", "reason (short link)", "want"),
                ],
            ),
            pl(
                "m05-l07-pl1",
                "Practice — 6×",
                ["aanzetten", "uitzetten", "opbellen"],
                [
                    ro_tokens("m05-l07-p1r", ["aan.", "Ik", "zet", "de", "verwarming"], "Ik zet de verwarming aan."),
                    mcq(
                        "m05-l07-a1",
                        "Kies de goede zin",
                        ["Zet het licht in de badkamer uit.", "Zet uit het licht in de badkamer.", "Licht zet badkamer uit in."],
                        "Zet het licht in de badkamer uit.",
                    ),
                    mcq(
                        "m05-l07-a2",
                        "Opbellen: natuurlijk",
                        ["Ik bel zo de storingsdienst op.", "Ik op bel de storingsdienst zo.", "Bel ik op zo storingsdienst."],
                        "Ik bel zo de storingsdienst op.",
                    ),
                    mcq(
                        "m05-l07-a3",
                        "Router (formeel)",
                        ["Kunt u de router even uitzetten?", "Kunt u uitzetten de router even?", "Router u kunt uitzetten?"],
                        "Kunt u de router even uitzetten?",
                    ),
                    mcq(
                        "m05-l07-a4",
                        "Want-zin",
                        ["Het is donker, want het licht staat uit.", "Het is donker want licht staat uit", "Donker is want licht."],
                        "Het is donker, want het licht staat uit.",
                    ),
                    mcq(
                        "m05-l07-a5",
                        "Modal + scheidbaar (infinitief)",
                        ["Zou u de verwarming even kunnen aanzetten?", "Zou u aanzetten de verwarming even kunnen?", "Zou verwarming zet aan?"],
                        "Zou u de verwarming even kunnen aanzetten?",
                    ),
                ],
            ),
            pl(
                "m05-l07-pl2",
                "Variatie — 6×",
                ["stroom", "internet", "alstublieft"],
                [
                    ro_tokens("m05-l07-p2r", ["op.", "bel", "Ik", "de", "verhuurder"], "Ik bel de verhuurder op."),
                    mcq(
                        "m05-l07-b1",
                        "Fout → goed",
                        ["Ik zet aan de boiler. → Ik zet de boiler aan.", "Ik zet aan de boiler. → Aan zet ik boiler.", "Fout is goed."],
                        "Ik zet aan de boiler. → Ik zet de boiler aan.",
                    ),
                    fb("m05-l07-b2", "___ u het raam dichtdoen? (formeel: kunnen)", ["Kunt", "Ben", "Word"], "Kunt"),
                    mcq(
                        "m05-l07-b3",
                        "Meerdere acties",
                        ["Zet de boiler uit en bel daarna de service op.", "Zet uit boiler en op bel service daarna.", "Boiler zet en bel op."],
                        "Zet de boiler uit en bel daarna de service op.",
                    ),
                    mcq(
                        "m05-l07-b4",
                        "Praktisch",
                        ["Ik heb geen wifi: ik zet de router even uit en weer aan.", "Ik heb geen wifi: ik eet de router.", "Wifi router uit ik."],
                        "Ik heb geen wifi: ik zet de router even uit en weer aan.",
                    ),
                    match_ex(
                        "m05-l07-b5",
                        "Koppel werkwoord → voorbeeldzin",
                        [
                            ("aanzetten", "Ik zet de verwarming aan."),
                            ("uitzetten", "Zet het licht uit."),
                            ("opbellen", "Ik bel je straks op."),
                        ],
                        {
                            "aanzetten": "Ik zet de verwarming aan.",
                            "uitzetten": "Zet het licht uit.",
                            "opbellen": "Ik bel je straks op.",
                        },
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m05-l07-sp1",
                "Production",
                "Ik zet de verwarming aan, want het is koud.",
                ["Ik zet de verwarming aan want het is koud", "Ik zet de verwarming aan, want het is koud."],
                "Ik zet de verwarming aan want het is koud",
            ),
            speak_step(
                "m05-l07-sp2",
                "Production",
                "Ik bel zo de verhuurder op over de lekkage.",
                ["Ik bel zo de verhuurder op over de lekkage", "ik bel zo de verhuurder op over de lekkage"],
                "Ik bel zo de verhuurder op over de lekkage",
            ),
            speak_step(
                "m05-l07-sp3",
                "Production",
                "Zet het licht in de gang uit, alstublieft.",
                ["Zet het licht in de gang uit alstublieft", "Zet het licht in de gang uit, alstublieft."],
                "Zet het licht in de gang uit alstublieft",
            ),
            recap_step(
                "m05-l07-recap",
                "Recap",
                ["aan", "uit", "op"],
                [
                    rt_ro(["aan.", "zet", "Ik", "de", "verwarming"], "Ik zet de verwarming aan."),
                    rt_speak("Zeg: *Ik bel je zo op.*", "Ik bel je zo op."),
                    rt_fb("Het is warm, ___ ik heb het raam open. (want)", ["want", "omdat", "dus"], "want"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Zet ondertussen het licht in de kelder uit.",
                        ["Aanwijzing: licht uit", "Aanwijzing: kelder schilderen", "Bestel pizza"],
                        "Aanwijzing: licht uit",
                    ),
                    rt_fb("Ik blijf thuis, ___ de monteur komt. (omdat)", ["omdat", "want", "maar"], "omdat"),
                    rt_speak("Zeg: *Kunt u de router even uitzetten?*", "Kunt u de router even uitzetten?"),
                ],
            ),
        ],
    }


def lesson_l08() -> dict:
    lid = "a2-m05-l08-writing-report-problem-short-message"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Writing · Report a problem (short message)",
        "lessonType": "writing",
        "order": 7,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-reporting-problems", "a2.2-polite-u-housing", "a2.2-perfectum-light"],
        "vocabTargets": ["lemma-bericht-m5", "lemma-lekkage", "lemma-dringend", "lemma-verhuurder", "lemma-boiler"],
        "canDoStatements": [
            "I can write a short polite message or email about a housing problem.",
        ],
        "mistakeFocus": ["register", "word-order"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m05-l08-preview",
                "Warm-up — 5 woorden",
                [
                    ("onderwerp", "onderwerp", "subject line", "✉️"),
                    ("bijlage", "bijlage", "attachment", "📎"),
                    ("met vriendelijke groet", "groet", "kind regards (set phrase)", "🖊️"),
                    ("spoed", "spoed", "urgent matter", "⏰"),
                    ("melding", "melding", "report / notification", "📋"),
                ],
            ),
            listen_read_step(
                "m05-l08-lr",
                "Input — voorbeeldmail + korte reactie (probleem → actie)",
                [
                    (
                        "Onderwerp",
                        "Probleem met boiler — appartement 12B",
                        "Subject: Boiler problem — flat 12B",
                    ),
                    (
                        "Jij (mail)",
                        "Beste mevrouw Jansen, ik wil melden dat er een probleem is met de boiler. Ik heb sinds gisteren geen warm water meer. Kunt u een monteur sturen, alstublieft? Het is een beetje dringend. Met vriendelijke groet, Nadia.",
                        "Dear Ms Jansen, I want to report that there is a problem with the boiler. I haven't had hot water since yesterday. Could you send a technician, please? It's a bit urgent. Kind regards, Nadia.",
                    ),
                    (
                        "Verhuurder (kort)",
                        "Dank voor uw mail. Ik geef het door en laat u zo snel mogelijk weten.",
                        "Thanks for your email. I'll pass it on and let you know as soon as possible.",
                    ),
                ],
                [
                    ("Waar gaat de mail over?", ["Boiler / geen warm water", "Huurverhoging", "Huisdier"], "Boiler / geen warm water"),
                    ("Welke beleefdheid zie je?", ["Kunt u … alstublieft?", "Doe nu!", "Jij stuur!"], "Kunt u … alstublieft?"),
                    ("Wat vraag je?", ["Een monteur", "Een pizza", "Een auto"], "Een monteur"),
                    ("Hoe sluit Nadia af?", ["Met vriendelijke groet", "Groetjes loser", "Dag weg"], "Met vriendelijke groet"),
                    ("Welk woord geeft urgentie zonder paniek?", ["een beetje dringend", "catastrofe nu", "nooit dringend"], "een beetje dringend"),
                    ("Wat belooft de verhuurder?", ["Doorgeven + snel reactie", "Geen antwoord", "Alleen pizza"], "Doorgeven + snel reactie"),
                ],
            ),
            discovery_step(
                "m05-l08-discovery",
                "Mail: probleem zeggen → wat u wilt → slot",
                [
                    ("Ik wil melden dat …", "I want to report that …", "melden"),
                    ("Ik heb sinds gisteren geen … meer.", "I haven't had … since yesterday.", "sinds"),
                    ("Kunt u … sturen, alstublieft?", "Can you send …, please?", "Kunt u"),
                    ("Met vriendelijke groet,", "Kind regards,", "groet"),
                ],
            ),
            pl(
                "m05-l08-pl1",
                "Practice — 6×",
                ["mail", "probleem", "monteur"],
                [
                    mcq(
                        "m05-l08-a1",
                        "Goede onderwerpregel",
                        ["Lekkage badkamer — 12B", "Pizza bestellen", "Hoi lol"],
                        "Lekkage badkamer — 12B",
                    ),
                    ro_tokens(
                        "m05-l08-a2",
                        ["water.", "geen", "warm", "Ik", "heb"],
                        "Ik heb geen warm water.",
                    ),
                    fb("m05-l08-a3", "Ik heb gisteren naar u ___. (bellen: voltooid)", ["gebeld", "bel", "bellen"], "gebeld"),
                    mcq(
                        "m05-l08-a4",
                        "WhatsApp-stijl (kort)",
                        ["Hoi, ik heb geen internet. Kunt u mij helpen?", "Hoi internet weg jij fix", "Internet ben ik."],
                        "Hoi, ik heb geen internet. Kunt u mij helpen?",
                    ),
                    mcq(
                        "m05-l08-a5",
                        "Zin transformeren: netter",
                        ["Er is een lekkage onder de wastafel.", "Lekkage wastafel onder er is.", "Wastafel is lekkage."],
                        "Er is een lekkage onder de wastafel.",
                    ),
                    mcq(
                        "m05-l08-a6",
                        "Welke zin hoort niet in een formele mail?",
                        ["Hé, fix dit nu!!!", "Zou u dit kunnen regelen?", "Ik hoor graag van u."],
                        "Hé, fix dit nu!!!",
                    ),
                ],
            ),
            pl(
                "m05-l08-pl2",
                "Variatie — 6×",
                ["stroom", "afspraak", "foto"],
                [
                    mcq(
                        "m05-l08-b1",
                        "Stroomstoring",
                        ["Ik heb geen stroom in de slaapkamer.", "Ik heb geen stroom in mijn droom.", "Stroom slaap ik."],
                        "Ik heb geen stroom in de slaapkamer.",
                    ),
                    fb("m05-l08-b2", "Ik heb een ___ nodig voor de reparatie. (afspraak)", ["afspraak", "pizza", "feest"], "afspraak"),
                    ro_tokens(
                        "m05-l08-b3",
                        ["sturen?", "foto", "Kunt", "u", "een", "mij"],
                        "Kunt u mij een foto sturen?",
                    ),
                    mcq(
                        "m05-l08-b4",
                        "Al geprobeerd (zelfde idee als bij de boiler)",
                        ["Ik heb dat al geprobeerd.", "Ik heb al geprobeerd dat verkeerd.", "Geprobeerd ik heb dat."],
                        "Ik heb dat al geprobeerd.",
                    ),
                    match_ex(
                        "m05-l08-b5",
                        "Koppel doel → zin in bericht",
                        [
                            ("Tijd vragen", "Wanneer kunt u langskomen?"),
                            ("Dringend", "Het is dringend: er komt water."),
                            ("Beleefd slot", "Alvast bedankt."),
                        ],
                        {
                            "Tijd vragen": "Wanneer kunt u langskomen?",
                            "Dringend": "Het is dringend: er komt water.",
                            "Beleefd slot": "Alvast bedankt.",
                        },
                    ),
                    mcq(
                        "m05-l08-b6",
                        "Kies beste slotzin",
                        ["Ik hoor graag van u.", "Ik hoor nooit iets.", "Hoor ik u graag nooit."],
                        "Ik hoor graag van u.",
                    ),
                ],
                depth=True,
            ),
            writing_step(
                "m05-l08-w1",
                "Guided writing — mail",
                "Schrijf een korte mail (2 zinnen): *ik wil melden* dat er geen warm water is + *Kunt u een monteur sturen, alstublieft?*",
                [
                    "Beste mevrouw ik wil melden dat er geen warm water is kunt u een monteur sturen alstublieft",
                    "Beste mevrouw, ik wil melden dat er geen warm water is. Kunt u een monteur sturen, alstublieft?",
                ],
                "Beste mevrouw, ik wil melden dat er geen warm water is. Kunt u een monteur sturen, alstublieft?",
                min_chars=25,
            ),
            speak_step(
                "m05-l08-sp1",
                "Production — hardop",
                "Ik meld een probleem met de boiler in appartement 12B.",
                ["Ik meld een probleem met de boiler in appartement 12B", "ik meld een probleem met de boiler in appartement 12b"],
                "Ik meld een probleem met de boiler in appartement 12B",
            ),
            speak_step(
                "m05-l08-sp2",
                "Production",
                "Zou u mij kunnen terugbellen, alstublieft?",
                ["Zou u mij kunnen terugbellen alstublieft", "Zou u mij kunnen terugbellen, alstublieft?"],
                "Zou u mij kunnen terugbellen alstublieft",
            ),
            speak_step(
                "m05-l08-sp3",
                "Production — slot",
                "Ik hoor graag van u. Met vriendelijke groet.",
                ["Ik hoor graag van u met vriendelijke groet", "Ik hoor graag van u. Met vriendelijke groet."],
                "Ik hoor graag van u met vriendelijke groet",
            ),
            recap_step(
                "m05-l08-recap",
                "Recap",
                ["melden", "monteur", "groet"],
                [
                    rt_fb("Ik wil ___ dat de deur niet dichtgaat. (melden)", ["melden", "eten", "zwemmen"], "melden"),
                    rt_ro(["groet,", "vriendelijke", "Met"], "Met vriendelijke groet,"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Kunt u een monteur sturen, alstublieft?",
                        ["Beleefd verzoek", "Bevel", "Grap"],
                        "Beleefd verzoek",
                    ),
                    rt_speak("Zeg: *Ik heb geen warm water.*", "Ik heb geen warm water."),
                    rt_fb("Ik heb gisteren al ___. (bellen: voltooid)", ["gebeld", "gegeten", "gezwommen"], "gebeld"),
                    rt_speak("Zeg: *Het is een beetje dringend.*", "Het is een beetje dringend."),
                ],
            ),
        ],
    }


def lesson_l09() -> dict:
    lid = "a2-m05-l09-task-call-landlord-guided"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Real-life task · Call the landlord (guided)",
        "lessonType": "task",
        "order": 8,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-polite-u-housing", "a2.2-reporting-problems", "a2.2-perfectum-light"],
        "vocabTargets": ["lemma-verhuurder", "lemma-lekkage", "lemma-afspraak", "lemma-langskomen", "lemma-alstublieft"],
        "canDoStatements": [
            "I can explain a problem, ask for help, answer a clarifying question, and confirm a time on the phone.",
        ],
        "mistakeFocus": ["polite-form", "listening-gist"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m05-l09-preview",
                "Warm-up — 4 woorden",
                [
                    ("meldkamer", "meldkamer", "reporting desk (fig.)", "☎️"),
                    ("toegang", "toegang", "access", "🚪"),
                    ("nummer", "nummer", "number", "#️⃣"),
                    ("notitie", "notitie", "note", "📝"),
                ],
            ),
            scenario_chat_step(
                "m05-l09-scenario",
                "Simulatie — gesprek (tekst) met verhuurder",
                [
                    (
                        "Verhuurder",
                        "Hallo, met Van Dijk Vastgoed. Waarmee kan ik u helpen?",
                        "Hello, Van Dijk Property. How can I help?",
                    ),
                    (
                        "Jij",
                        "Goedemiddag. Ik bel over een probleem in mijn appartement.",
                        "Good afternoon. I'm calling about a problem in my flat.",
                    ),
                    (
                        "Verhuurder",
                        "Oké. Wat is er precies aan de hand?",
                        "Okay. What's exactly going on?",
                    ),
                    (
                        "Jij",
                        "Er is een lekkage bij de radiator in de slaapkamer. De muur wordt nat.",
                        "There's a leak at the radiator in the bedroom. The wall is getting wet.",
                    ),
                    (
                        "Verhuurder",
                        "Begrijpelijk. Kunt u vandaag thuis blijven tussen vier en zes?",
                        "Understood. Can you stay home today between four and six?",
                    ),
                    (
                        "Jij",
                        "Ja, dat lukt. Kunt u bevestigen per mail, alstublieft?",
                        "Yes, that works. Can you confirm by email, please?",
                    ),
                ],
                [
                    ("Wie neemt op?", ["Een verhuurder / vastgoed", "Een pizzeria", "De politie"], "Een verhuurder / vastgoed"),
                    ("Wat meld je eerst?", ["Een probleem in het appartement", "Een feest", "Een vakantie"], "Een probleem in het appartement"),
                    ("Waar is de lekkage?", ["Bij de radiator in de slaapkamer", "In de koelkast", "Op school"], "Bij de radiator in de slaapkamer"),
                    ("Wat vraagt de verhuurder over je tijd?", ["Thuis blijven tussen vier en zes", "Naar het buitenland", "Pizza halen"], "Thuis blijven tussen vier en zes"),
                    ("Wat vraag jij op het eind?", ["Bevestiging per mail", "Gratis vakantie", "Nieuwe auto"], "Bevestiging per mail"),
                    ("Welke zin is het meest beleefd?", ["Kunt u … alstublieft?", "Doe nu mail!", "Jij mail!"], "Kunt u … alstublieft?"),
                ],
            ),
            discovery_step(
                "m05-l09-discovery",
                "Guided noticing",
                [
                    ("Ik bel over …", "I'm calling about …", "bel"),
                    ("Er is een lekkage bij …", "There's a leak at …", "lekkage"),
                    ("Dat lukt.", "That works / I can do that.", "lukt"),
                    ("Kunt u bevestigen …?", "Can you confirm …?", "bevestigen"),
                ],
            ),
            pl(
                "m05-l09-pl1",
                "Simulatie — 6×",
                ["thuis", "dringend", "bevestigen"],
                [
                    mcq(
                        "m05-l09-a1",
                        "Openen van het gesprek",
                        ["Goedemiddag, ik bel over een probleem met de verwarming.", "Hé, luister!", "Probleem ben ik."],
                        "Goedemiddag, ik bel over een probleem met de verwarming.",
                    ),
                    ro_tokens(
                        "m05-l09-a2",
                        ["hand?", "aan", "de", "Wat", "is", "er", "precies"],
                        "Wat is er precies aan de hand?",
                    ),
                    mcq(
                        "m05-l09-a3",
                        "Als je de vraag niet hoort",
                        ["Sorry, kunt u dat herhalen?", "Sorry, ik weg.", "Herhaal nooit."],
                        "Sorry, kunt u dat herhalen?",
                    ),
                    mcq(
                        "m05-l09-a4",
                        "Bevestigen tijd",
                        ["Ja, ik ben thuis tussen twee en vier.", "Ja, ik ben een klok.", "Thuis ben ik tussen."],
                        "Ja, ik ben thuis tussen twee en vier.",
                    ),
                    mcq(
                        "m05-l09-a5",
                        "Escalatie netjes",
                        ["Het wordt steeds erger, want er komt meer water.", "Het wordt erger, jij bent slecht!", "Water komt steeds jij."],
                        "Het wordt steeds erger, want er komt meer water.",
                    ),
                    mcq(
                        "m05-l09-a6",
                        "Slot",
                        ["Dank u wel voor uw hulp.", "Dank u nooit.", "U bent hulp."],
                        "Dank u wel voor uw hulp.",
                    ),
                ],
            ),
            pl(
                "m05-l09-pl2",
                "Variatie — 6×",
                ["sleutel", "toegang", "monteur"],
                [
                    fb("m05-l09-b1", "De monteur heeft geen ___ tot de kelder. (toegang)", ["toegang", "pizza", "rust"], "toegang"),
                    mcq(
                        "m05-l09-b2",
                        "Toegang regelen",
                        ["Ik laat de sleutel bij de buur achter.", "Ik eet de sleutel.", "Sleutel is een kat."],
                        "Ik laat de sleutel bij de buur achter.",
                    ),
                    ro_tokens(
                        "m05-l09-b3",
                        ["langskomen?", "Wanneer", "kunt", "u"],
                        "Wanneer kunt u langskomen?",
                    ),
                    mcq(
                        "m05-l09-b4",
                        "Perfectum in gesprek",
                        ["Ik heb al drie emmers neergezet.", "Ik heb al drie emmers neer zet.", "Emmers ik heb neergezet."],
                        "Ik heb al drie emmers neergezet.",
                    ),
                    mcq(
                        "m05-l09-b5",
                        "Beleefd alternatief voor *moet*",
                        ["Zou u vandaag nog langs kunnen komen?", "U moet nu komen!", "Kom nu of ik bel politie!"],
                        "Zou u vandaag nog langs kunnen komen?",
                    ),
                    mcq(
                        "m05-l09-b6",
                        "Check begrip",
                        ["Dus de monteur komt morgenochtend, klopt dat?", "Dus morgen bent u een monteur?", "Monteur morgen klopt?"],
                        "Dus de monteur komt morgenochtend, klopt dat?",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m05-l09-sp1",
                "Turn 1 — opening",
                "Goedemiddag, ik bel over een lekkage in mijn appartement.",
                ["Goedemiddag ik bel over een lekkage in mijn appartement", "Goedemiddag, ik bel over een lekkage in mijn appartement."],
                "Goedemiddag ik bel over een lekkage in mijn appartement",
            ),
            speak_step(
                "m05-l09-sp2",
                "Turn 2 — probleem (zelfde als in de simulatie)",
                "Er is een lekkage bij de radiator. De muur wordt nat.",
                ["Er is een lekkage bij de radiator de muur wordt nat", "Er is een lekkage bij de radiator. De muur wordt nat."],
                "Er is een lekkage bij de radiator de muur wordt nat",
            ),
            speak_step(
                "m05-l09-sp3",
                "Turn 3 — tijd",
                "Ja, ik kan thuis blijven tussen vier en zes.",
                ["Ja ik kan thuis blijven tussen vier en zes", "Ja, ik kan thuis blijven tussen vier en zes."],
                "Ja ik kan thuis blijven tussen vier en zes",
            ),
            speak_step(
                "m05-l09-sp4",
                "Turn 4 — bevestiging",
                "Kunt u dat bevestigen per mail, alstublieft?",
                ["Kunt u dat bevestigen per mail alstublieft", "Kunt u dat bevestigen per mail, alstublieft?"],
                "Kunt u dat bevestigen per mail alstublieft",
            ),
            recap_step(
                "m05-l09-recap",
                "Recap",
                ["bel", "lekkage", "bevestigen"],
                [
                    rt_speak("Zeg: *Ik bel over een probleem.*", "Ik bel over een probleem."),
                    rt_ro(["radiator.", "de", "bij", "lekkage", "Een", "is", "Er"], "Er is een lekkage bij de radiator."),
                    rt_listen_mcq(
                        "Snippet:",
                        "Kunt u vandaag thuis blijven tussen vier en zes?",
                        ["Vraag om aanwezigheid", "Vraag om recept", "Vraag om kat"],
                        "Vraag om aanwezigheid",
                    ),
                    rt_fb("Kunt u dat ___ per mail? (bevestigen)", ["bevestigen", "eten", "zwemmen"], "bevestigen"),
                    rt_speak("Zeg: *Dat lukt.*", "Dat lukt."),
                    rt_speak("Zeg: *Dank u wel.*", "Dank u wel."),
                ],
            ),
        ],
    }


def lesson_l10() -> dict:
    lid = "a2-m05-l10-task-book-repair-appointment"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Real-life task · Book a repair appointment",
        "lessonType": "task",
        "order": 9,
        "cefrLevel": "A2",
        "durationEstimate": 15,
        "grammarTargets": ["a2.2-polite-u-housing", "a2.2-separable-housing", "a2.2-reporting-problems"],
        "vocabTargets": ["lemma-afspraak", "lemma-monteur", "lemma-beschikbaar", "lemma-internet", "lemma-bericht-m5"],
        "canDoStatements": [
            "I can book a slot, ask when someone is available, and confirm details in chat style.",
        ],
        "mistakeFocus": ["question-form", "separable-verb"],
        "metadata": LM,
        "steps": [
            preview_step(
                "m05-l10-preview",
                "Warm-up — 5 woorden",
                [
                    ("planning", "planning", "schedule / planning", "🗓️"),
                    ("venster", "venster", "window (time window)", "🪟"),
                    ("bevestigen", "bevestigen", "to confirm", "✅"),
                    ("adres", "adres", "address", "📫"),
                    ("toestel", "toestel", "appliance / unit", "🔌"),
                ],
            ),
            listening_step(
                "m05-l10-listen",
                "Input — afspraak met loodgieter",
                [
                    (
                        "Planner",
                        "Goedemorgen, loodgietersbedrijf Van den Berg. Waarmee kan ik u helpen?",
                        "Good morning, Van den Berg plumbing. How can I help?",
                    ),
                    (
                        "Jij",
                        "Hallo. Ik heb een lekkage onder de gootsteen. Ik wil graag een afspraak.",
                        "Hello. I have a leak under the sink. I'd like an appointment.",
                    ),
                    (
                        "Planner",
                        "Oké. Hoe laat bent u morgen beschikbaar?",
                        "Okay. What time are you available tomorrow?",
                    ),
                    (
                        "Jij",
                        "Ik ben beschikbaar vanaf negen uur 's ochtends.",
                        "I'm available from nine in the morning.",
                    ),
                    (
                        "Planner",
                        "Prima. Dan plan ik tien uur. Ik stuur een sms ter bevestiging.",
                        "Great. I'll schedule ten o'clock. I'll send an SMS for confirmation.",
                    ),
                    (
                        "Jij",
                        "Dank u wel. Tot morgen.",
                        "Thank you. See you tomorrow.",
                    ),
                ],
                [
                    ("Wat wil je plannen?", ["Afspraak voor lekkage", "Afspraak voor vakantie", "Geen afspraak"], "Afspraak voor lekkage"),
                    ("Waar is het probleem?", ["Onder de gootsteen", "Op het dak van de supermarkt", "In je broekzak"], "Onder de gootsteen"),
                    ("Wat vraagt de planner?", ["Uw beschikbaarheid morgen", "Uw schoenmaat", "Uw lievelingskleur"], "Uw beschikbaarheid morgen"),
                    ("Welk tijdstip kies je in het gesprek?", ["Vanaf negen uur 's ochtends", "Om middernacht alleen", "Nooit"], "Vanaf negen uur 's ochtends"),
                    ("Wat belooft de planner?", ["Sms ter bevestiging", "Pizza", "Niets"], "Sms ter bevestiging"),
                    ("Hoe sluit jij af?", ["Dank + tot morgen", "Boos ophangen", "Zwijgen"], "Dank + tot morgen"),
                ],
            ),
            discovery_step(
                "m05-l10-discovery",
                "Guided noticing",
                [
                    ("Ik wil graag een afspraak.", "I'd like an appointment.", "afspraak"),
                    ("Hoe laat bent u beschikbaar?", "What time are you available?", "beschikbaar"),
                    ("Ik stuur een sms ter bevestiging.", "I'll send an SMS to confirm.", "bevestiging"),
                    ("Vanaf negen uur.", "From nine o'clock.", "vanaf"),
                ],
            ),
            pl(
                "m05-l10-pl1",
                "Simulatie — 6×",
                ["afspraak", "beschikbaar", "sms"],
                [
                    mcq(
                        "m05-l10-a1",
                        "Start netjes",
                        ["Hallo, ik wil een afspraak maken voor een reparatie.", "Hé, kom nu!", "Afspraak ben ik."],
                        "Hallo, ik wil een afspraak maken voor een reparatie.",
                    ),
                    fb("m05-l10-a2", "Hoe ___ bent u morgen beschikbaar? (tijd vragen)", ["laat", "veel", "lang"], "laat"),
                    ro_tokens(
                        "m05-l10-a3",
                        ["nodig.", "afspraak", "een", "heb", "Ik"],
                        "Ik heb een afspraak nodig.",
                    ),
                    mcq(
                        "m05-l10-a4",
                        "Bevestigen",
                        ["Dus morgen om tien uur, klopt dat?", "Dus tien uur bent u een klok?", "Morgen klopt tien?"],
                        "Dus morgen om tien uur, klopt dat?",
                    ),
                    mcq(
                        "m05-l10-a5",
                        "Internet storing (andere case)",
                        ["Mijn internet doet het niet. Kunt u een monteur sturen?", "Mijn internet is een vriend.", "Internet stuur monteur kunt?"],
                        "Mijn internet doet het niet. Kunt u een monteur sturen?",
                    ),
                    mcq(
                        "m05-l10-a6",
                        "Separable in chat",
                        ["Ik bel u zo terug over het tijdslot.", "Ik terug bel u zo over het tijdslot.", "Bel ik terug u zo."],
                        "Ik bel u zo terug over het tijdslot.",
                    ),
                ],
            ),
            pl(
                "m05-l10-pl2",
                "Variatie — 6×",
                ["router", "adres", "dringend"],
                [
                    mcq(
                        "m05-l10-b1",
                        "Adres doorgeven",
                        ["Ik woon op Dorpstraat 12, appartement 4C.", "Ik woon op pizza 12.", "Dorpstraat woon ik 12 op."],
                        "Ik woon op Dorpstraat 12, appartement 4C.",
                    ),
                    mcq(
                        "m05-l10-b2",
                        "Dringend maar beleefd",
                        ["Het is dringend, want ik werk thuis en ik heb internet nodig.", "Het is dringend, geef mij macht!", "Dringend werk ik thuis internet."],
                        "Het is dringend, want ik werk thuis en ik heb internet nodig.",
                    ),
                    ro_tokens(
                        "m05-l10-b3",
                        ["beschikbaar?", "u", "Hoe", "laat", "bent"],
                        "Hoe laat bent u beschikbaar?",
                    ),
                    mcq(
                        "m05-l10-b4",
                        "Kies beste reactie op *tussen 13–15 uur*",
                        ["Dat past mij goed.", "Dat past mij nooit, ik weiger.", "Past dat mij goed nooit."],
                        "Dat past mij goed.",
                    ),
                    match_ex(
                        "m05-l10-b5",
                        "Koppel fase → zin",
                        [
                            ("Probleem noemen", "Er is een lekkage in de badkamer."),
                            ("Tijd vragen", "Wanneer komt u langs?"),
                            ("Bevestigen", "Prima, dan zie ik u morgen."),
                        ],
                        {
                            "Probleem noemen": "Er is een lekkage in de badkamer.",
                            "Tijd vragen": "Wanneer komt u langs?",
                            "Bevestigen": "Prima, dan zie ik u morgen.",
                        },
                    ),
                    mcq(
                        "m05-l10-b6",
                        "Sms-stijl",
                        ["Kunt u bevestigen dat de monteur morgen komt? Alvast bedankt.", "Bevestig nu of ik sleep.", "Sms bent u monteur."],
                        "Kunt u bevestigen dat de monteur morgen komt? Alvast bedankt.",
                    ),
                ],
                depth=True,
            ),
            writing_step(
                "m05-l10-w1",
                "Guided writing — WhatsApp",
                "Schrijf één kort bericht: noem lekkage onder gootsteen + vraag *Hoe laat bent u beschikbaar?*",
                [
                    "Hoi er is een lekkage onder de gootsteen hoe laat bent u beschikbaar",
                    "Hoi, er is een lekkage onder de gootsteen. Hoe laat bent u beschikbaar?",
                ],
                "Hoi, er is een lekkage onder de gootsteen. Hoe laat bent u beschikbaar?",
                min_chars=18,
            ),
            speak_step(
                "m05-l10-sp1",
                "Production",
                "Ik wil graag een afspraak voor een reparatie.",
                ["Ik wil graag een afspraak voor een reparatie", "ik wil graag een afspraak voor een reparatie"],
                "Ik wil graag een afspraak voor een reparatie",
            ),
            speak_step(
                "m05-l10-sp2",
                "Production",
                "Ik ben beschikbaar vanaf negen uur 's ochtends.",
                ["Ik ben beschikbaar vanaf negen uur s ochtends", "Ik ben beschikbaar vanaf negen uur 's ochtends."],
                "Ik ben beschikbaar vanaf negen uur s ochtends",
            ),
            speak_step(
                "m05-l10-sp3",
                "Production",
                "Prima. Kunt u mij een bevestiging sturen, alstublieft?",
                ["Prima kunt u mij een bevestiging sturen alstublieft", "Prima. Kunt u mij een bevestiging sturen, alstublieft?"],
                "Prima kunt u mij een bevestiging sturen alstublieft",
            ),
            recap_step(
                "m05-l10-recap",
                "Recap",
                ["afspraak", "beschikbaar", "bevestiging"],
                [
                    rt_ro(["afspraak.", "een", "graag", "wil", "Ik"], "Ik wil graag een afspraak."),
                    rt_speak("Zeg: *Hoe laat bent u beschikbaar?*", "Hoe laat bent u beschikbaar?"),
                    rt_listen_mcq(
                        "Snippet:",
                        "Ik stuur een sms ter bevestiging.",
                        ["Bevestiging via bericht", "Stuur pizza", "Stop de afspraak"],
                        "Bevestiging via bericht",
                    ),
                    rt_fb("Ik ben beschikbaar ___ tien uur. (vanaf)", ["vanaf", "onder", "achter"], "vanaf"),
                    rt_speak("Zeg: *Dank u wel. Tot morgen.*", "Dank u wel. Tot morgen."),
                    rt_speak("Zeg: *Wanneer komt u langs?*", "Wanneer komt u langs?"),
                ],
            ),
        ],
    }


def lesson_l11() -> dict:
    lid = "a2-m05-l11-review-housing-services"
    return {
        "id": lid,
        "moduleId": MID,
        "title": "Review · Housing & services",
        "lessonType": "review",
        "order": 10,
        "cefrLevel": "A2",
        "durationEstimate": 16,
        "grammarTargets": [
            "a2.2-housing-living",
            "a2.2-reporting-problems",
            "a2.2-polite-u-housing",
            "a2.2-perfectum-light",
            "a2.2-separable-housing",
            "a2.2-linking-housing",
        ],
        "vocabTargets": [
            "lemma-appartement",
            "lemma-verhuurder",
            "lemma-lekkage",
            "lemma-verwarming",
            "lemma-monteur",
            "lemma-afspraak",
            "lemma-bellen",
        ],
        "canDoStatements": [
            "I can retrieve housing, service, and polite-request chunks under mixed practice.",
        ],
        "metadata": LM,
        "steps": [
            preview_step(
                "m05-l11-preview",
                "Opfrissen — 5 woorden",
                [
                    ("herstel", "herstel", "repair / recovery", "🔧"),
                    ("inspectie", "inspectie", "inspection", "🔍"),
                    ("onderhoud", "onderhoud", "maintenance", "🛠️"),
                    ("contract", "contract", "contract", "📄"),
                    ("buren", "buren", "neighbours", "🏘️"),
                ],
            ),
            listening_step(
                "m05-l11-listen",
                "Mixed retrieval — woning + storing",
                [
                    (
                        "Sam",
                        "Ik woon in een klein appartement met een balkon. Gisteren had ik geen stroom in de gang.",
                        "I live in a small flat with a balcony. Yesterday I had no power in the hall.",
                    ),
                    (
                        "Lieke",
                        "Dat is vervelend. Heb je de verhuurder al gebeld?",
                        "That's annoying. Have you called the landlord yet?",
                    ),
                    (
                        "Sam",
                        "Ja, ik heb gemaild en gebeld. Ze sturen vandaag een monteur tussen drie en vijf.",
                        "Yes, I emailed and called. They're sending a technician today between three and five.",
                    ),
                    (
                        "Lieke",
                        "Top. Zet ondertussen het licht in de gang uit als je weggaat, voor de veiligheid.",
                        "Great. Meanwhile switch off the hall light when you leave, for safety.",
                    ),
                ],
                [
                    ("Waar woont Sam?", ["Appartement met balkon", "Kasteel", "Boot"], "Appartement met balkon"),
                    ("Wat was het probleem gisteren?", ["Geen stroom in de gang", "Geen balkon", "Geen buren"], "Geen stroom in de gang"),
                    ("Wat heeft Sam gedaan?", ["Gemaild en gebeld", "Niets", "Alleen gegeten"], "Gemaild en gebeld"),
                    ("Wanneer komt de monteur?", ["Tussen drie en vijf vandaag", "Over een jaar", "Nooit"], "Tussen drie en vijf vandaag"),
                    ("Wat vraagt Lieke over het licht?", ["Uitzetten als je weggaat", "Aanzetten altijd", "Licht schilderen"], "Uitzetten als je weggaat"),
                    ("Welke zin gebruikt perfectum?", ["Ik heb gemaild en gebeld.", "Ik mail en bel.", "Gemaild ik heb."], "Ik heb gemaild en gebeld."),
                ],
            ),
            discovery_step(
                "m05-l11-discovery",
                "Snel herhalen",
                [
                    ("Ik woon in …", "I live in …", "woon"),
                    ("Er is een probleem met …", "There is a problem with …", "probleem"),
                    ("Kunt u …, alstublieft?", "Can you …, please?", "Kunt u"),
                    ("Ik zet … uit / aan.", "I switch … off/on.", "uit"),
                ],
            ),
            pl(
                "m05-l11-pl1",
                "Retrieval — 6×",
                ["polite", "perfectum", "scheidbaar"],
                [
                    mcq(
                        "m05-l11-a1",
                        "Beste repliek naar service",
                        ["Zou u dat vandaag kunnen regelen, alstublieft?", "Regel dat nu!", "Jij regel!"],
                        "Zou u dat vandaag kunnen regelen, alstublieft?",
                    ),
                    ro_tokens(
                        "m05-l11-a2",
                        ["aan.", "Ik", "zet", "de", "verwarming"],
                        "Ik zet de verwarming aan.",
                    ),
                    fb("m05-l11-a3", "Ik heb u gisteren ___. (bellen: voltooid)", ["gebeld", "gegeten", "gezwommen"], "gebeld"),
                    mcq(
                        "m05-l11-a4",
                        "Want vs omdat (kies natuurlijk)",
                        ["Het is koud, want de verwarming doet het niet.", "Het is koud want verwarming niet zonder komma", "Koud is want verwarming."],
                        "Het is koud, want de verwarming doet het niet.",
                    ),
                    mcq(
                        "m05-l11-a5",
                        "Probleem + oplossing",
                        ["Mijn internet werkt niet. Kunt u de storing bekijken?", "Mijn internet is een hond.", "Internet bekijk storing."],
                        "Mijn internet werkt niet. Kunt u de storing bekijken?",
                    ),
                    mcq(
                        "m05-l11-a6",
                        "Herken fout",
                        ["Kunt u mij helpen, alstublieft?", "Kunt helpen u mij, alstublieft?", "Mij helpen kunt u alstublieft?"],
                        "Kunt u mij helpen, alstublieft?",
                    ),
                ],
            ),
            pl(
                "m05-l11-pl2",
                "Variatie — 6×",
                ["lekkage", "afspraak", "mail"],
                [
                    ro_tokens(
                        "m05-l11-b1",
                        ["badkamer.", "de", "in", "lekkage", "Een", "is", "Er"],
                        "Er is een lekkage in de badkamer.",
                    ),
                    mcq(
                        "m05-l11-b2",
                        "Mail opening",
                        ["Beste mevrouw Van den Berg,", "Hé Van den Berg!!!", "Mevrouw ben jij,"],
                        "Beste mevrouw Van den Berg,",
                    ),
                    fb("m05-l11-b3", "Ik heb een ___ nodig voor de monteur. (afspraak)", ["afspraak", "kat", "feest"], "afspraak"),
                    mcq(
                        "m05-l11-b4",
                        "Opbellen",
                        ["Ik bel zo de service op over de boiler.", "Ik op bel de service zo.", "Bel ik op service boiler."],
                        "Ik bel zo de service op over de boiler.",
                    ),
                    match_ex(
                        "m05-l11-b5",
                        "Koppel",
                        [
                            ("Dringend", "Het is dringend."),
                            ("Bevestigen", "Kunt u dat bevestigen?"),
                            ("Tijdslot", "Morgen tussen tien en twaalf."),
                        ],
                        {
                            "Dringend": "Het is dringend.",
                            "Bevestigen": "Kunt u dat bevestigen?",
                            "Tijdslot": "Morgen tussen tien en twaalf.",
                        },
                    ),
                    mcq(
                        "m05-l11-b6",
                        "Mini-sim: beste antwoord",
                        ["Prima, dan ben ik thuis. Dank u wel.", "Prima, ik ben nooit thuis.", "Thuis ben ik prima nooit."],
                        "Prima, dan ben ik thuis. Dank u wel.",
                    ),
                ],
                depth=True,
            ),
            speak_step(
                "m05-l11-sp1",
                "Output — retrieval",
                "Ik woon in een appartement. Er is een probleem met de verwarming. Kunt u mij helpen, alstublieft?",
                [
                    "Ik woon in een appartement er is een probleem met de verwarming kunt u mij helpen alstublieft",
                    "Ik woon in een appartement. Er is een probleem met de verwarming. Kunt u mij helpen, alstublieft?",
                ],
                "Ik woon in een appartement er is een probleem met de verwarming kunt u mij helpen alstublieft",
            ),
            speak_step(
                "m05-l11-sp2",
                "Output — afspraak",
                "Er is een lekkage. Kunt u morgen langskomen, alstublieft?",
                ["Er is een lekkage kunt u morgen langskomen alstublieft", "Er is een lekkage. Kunt u morgen langskomen, alstublieft?"],
                "Er is een lekkage kunt u morgen langskomen alstublieft",
            ),
            recap_step(
                "m05-l11-recap",
                "Recap — mix",
                ["wonen", "reparatie", "beleefd"],
                [
                    rt_fb("Ik ___ in een appartement met een balkon. (wonen: ik)", ["woon", "eet", "zwem"], "woon"),
                    rt_ro(["helpen?", "mij", "Kunt", "u", "alstublieft?"], "Kunt u mij helpen, alstublieft?"),
                    rt_speak("Zeg: *Het is kapot.*", "Het is kapot."),
                    rt_listen_mcq(
                        "Snippet:",
                        "Zet ondertussen het licht in de gang uit als je weggaat.",
                        ["Instructie: licht uit", "Bestel licht", "Verf de gang"],
                        "Instructie: licht uit",
                    ),
                    rt_fb("Ik heb de verhuurder ___. (bellen: voltooid)", ["gebeld", "gekocht", "gezongen"], "gebeld"),
                    rt_speak("Zeg: *Wanneer komt u langs?*", "Wanneer komt u langs?"),
                    rt_fb("Zet de router even ___. (uit: scheidbaar)", ["uit", "aan", "op"], "uit"),
                    rt_speak("Zeg: *Dank u wel voor uw hulp.*", "Dank u wel voor uw hulp."),
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
        "title": "Housing & services",
        "band": "A2.2",
        "description": "A2.2 independence: home, repairs, utilities, polite requests to landlord and services, light perfectum — Stage 6 depth.",
        "order": 4,
        "lessons": lessons(),
        "grammarTargets": GRAMMAR,
        "vocabTargets": vocab_targets(),
        "learningGoals": [
            "Describe home and report common housing problems in simple Dutch",
            "Use polite u-requests with landlord and service providers",
            "Book repairs and confirm appointments; write short problem messages",
        ],
        "metadata": {
            **LM,
            "contentVersion": "m05-v1",
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        },
    }
    OUT.write_text(json.dumps(mod, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
