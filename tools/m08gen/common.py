"""Shared helpers and catalog for Module 8 (government & admin) generator."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

MID = "a2-m08-government-administration"
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "content/modules/a2-m08-government-administration/module.json"

LM = {
    "stage6": True,
    "schemaPlayer": True,
    "lessonDepth": {"m08": "v1", "targetMicroInteractions": "26-40"},
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
        d["metadata"] = {"depthLayer": "m08-v1"}
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
        "feedbackConfig": {"hint": "Bij gemeente en balie: vaak *u* + beleefd. Korte zinnen — dat helpt bij stress."},
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
        "id": "a2.2-admin-formal-u",
        "name": "Formal tone at the desk (u)",
        "description": "Kunt u …? Wilt u …? Mag ik …? Ik wil graag … — kort en beleefd.",
        "examples": [
            {"nl": "Ik wil graag een afspraak maken.", "en": "I'd like to make an appointment."},
            {"nl": "Kunt u dat herhalen, alstublieft?", "en": "Could you repeat that, please?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-admin-appointments",
        "name": "Appointments & registration",
        "description": "Afspraak maken, inschrijven, bevestigen, wachten.",
        "examples": [
            {"nl": "Ik moet me inschrijven in de gemeente.", "en": "I have to register with the municipality."},
            {"nl": "Ik heb een afspraak om half elf.", "en": "I have an appointment at half past ten."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-admin-documents",
        "name": "Documents you bring",
        "description": "Paspoort, identiteitsbewijs, formulier, kopie, afspraakbrief.",
        "examples": [
            {"nl": "Welke documenten heb ik nodig?", "en": "Which documents do I need?"},
            {"nl": "Heeft u uw paspoort bij u?", "en": "Do you have your passport with you?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-admin-personal-details",
        "name": "Giving personal details",
        "description": "Naam, adres, postcode, geboortedatum, nationaliteit — kort antwoorden.",
        "examples": [
            {"nl": "Mijn geboortedatum is 12 mei 1990.", "en": "My date of birth is 12 May 1990."},
            {"nl": "Ik woon aan de Prinsengracht 10, Amsterdam.", "en": "I live at Prinsengracht 10, Amsterdam."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-admin-modals",
        "name": "Moeten / kunnen in admin talk",
        "description": "U moet … invullen. U kunt hier wachten. Moet ik … meenemen?",
        "examples": [
            {"nl": "U moet dit formulier invullen.", "en": "You have to fill in this form."},
            {"nl": "Moet ik een afspraak maken?", "en": "Do I have to make an appointment?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-admin-instructions",
        "name": "Understanding simple instructions",
        "description": "Ga naar balie 2. Wacht hier. Neem een nummer. Handtekening hier.",
        "examples": [
            {"nl": "U kunt daar gaan zitten; het duurt ongeveer tien minuten.", "en": "You can sit there; it takes about ten minutes."},
            {"nl": "Teken hier, alstublieft.", "en": "Please sign here."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
]

VOCAB = [
    ("lemma-gemeente", "gemeente", "gemeente", "municipality", "noun"),
    ("lemma-afspraak-m8", "afspraak", "afspraak", "appointment", "noun"),
    ("lemma-formulier", "formulier", "formulier", "form", "noun"),
    ("lemma-balie", "balie", "balie", "counter / desk", "noun"),
    ("lemma-document", "document", "document", "document", "noun"),
    ("lemma-inschrijven", "inschrijven", "inschrijven", "to register", "verb"),
    ("lemma-identiteitsbewijs", "identiteitsbewijs", "identiteitsbewijs", "ID card", "noun"),
    ("lemma-paspoort-m8", "paspoort", "paspoort", "passport", "noun"),
    ("lemma-adres-m8", "adres", "adres", "address", "noun"),
    ("lemma-postcode-m8", "postcode", "postcode", "postcode", "noun"),
    ("lemma-geboortedatum", "geboortedatum", "geboortedatum", "date of birth", "noun"),
    ("lemma-nationaliteit", "nationaliteit", "nationaliteit", "nationality", "noun"),
    ("lemma-handtekening", "handtekening", "handtekening", "signature", "noun"),
    ("lemma-wachten-m8", "wachten", "wachten", "to wait", "verb"),
    ("lemma-meennemen", "meenemen", "meenemen", "to bring along", "verb"),
    ("lemma-invullen", "invullen", "invullen", "to fill in", "verb"),
    ("lemma-uitleggen", "uitleggen", "uitleggen", "to explain", "verb"),
    ("lemma-begrijpen-m8", "begrijpen", "begrijpen", "to understand", "verb"),
    ("lemma-alstublieft-m8", "alstublieft", "alstublieft", "please (formal)", "phrase"),
    ("lemma-mag-ik", "mag ik", "mogen", "may I", "phrase"),
    ("lemma-moeten-m8", "moeten", "moeten", "must / to have to", "verb"),
    ("lemma-kunnen-m8", "kunnen", "kunnen", "can / to be able", "verb"),
    ("lemma-burgerservice", "burgerservicepunt", "burgerservicepunt", "citizen service desk", "noun"),
    ("lemma-nummer-m8", "nummer", "nummer", "number (ticket)", "noun"),
    ("lemma-brief-m8", "brief", "brief", "letter", "noun"),
    ("lemma-kopie", "kopie", "kopie", "copy", "noun"),
    ("lemma-verblijfsvergunning", "verblijfsvergunning", "verblijfsvergunning", "residence permit", "noun"),
    ("lemma-want-m8", "want", "want", "because (coord.)", "conj"),
    ("lemma-omdat-m8", "omdat", "omdat", "because (subord.)", "conj"),
    ("lemma-duurt", "duren", "duren", "to take (time)", "verb"),
    ("lemma-met-vriendelijke-groet", "Met vriendelijke groet", "groet", "kind regards (closing)", "phrase"),
    ("lemma-geachte", "geachte", "geachte", "dear (formal letter)", "adj"),
    ("lemma-herhalen-m8", "herhalen", "herhalen", "to repeat", "verb"),
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


def write_module(lessons: list[dict]) -> None:
    import json

    OUT.parent.mkdir(parents=True, exist_ok=True)
    mod = {
        "id": MID,
        "title": "Government & administration",
        "band": "A2.2",
        "description": "A2.2 Independence: gemeente visits, appointments, simple forms, formal u-phrases, documents and personal details — calm, practical Dutch for official tasks.",
        "order": 7,
        "lessons": lessons,
        "grammarTargets": GRAMMAR,
        "vocabTargets": vocab_targets(),
        "learningGoals": [
            "Make and follow up on simple gemeente-style appointments and registration tasks in Dutch",
            "Understand short official instructions and ask for clarification politely",
            "Give name, address, date of birth and nationality clearly; fill simple formal messages",
        ],
        "metadata": {
            **LM,
            "contentVersion": "m08-v1",
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        },
    }
    OUT.write_text(json.dumps(mod, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(f"Wrote {OUT}")
