"""Shared helpers and catalog for Module 7 (transport) generator."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

MID = "a2-m07-transport-getting-around"
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "content/modules/a2-m07-transport-getting-around/module.json"

LM = {
    "stage6": True,
    "schemaPlayer": True,
    "lessonDepth": {"m07": "v1", "targetMicroInteractions": "26-40"},
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
        d["metadata"] = {"depthLayer": "m07-v1"}
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
        "feedbackConfig": {"hint": "Kort en duidelijk. Bij reizigersbalie: vaak *u*; bij vrienden: *je/jij*."},
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
        "id": "a2.2-transport-questions",
        "name": "Route & transport questions",
        "description": "Waar is …? Hoe kom ik bij …? Welke bus/tram moet ik nemen? Moet ik overstappen?",
        "examples": [
            {"nl": "Hoe kom ik bij het station?", "en": "How do I get to the station?"},
            {"nl": "Van welk perron vertrekt de trein?", "en": "From which platform does the train leave?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-directions-core",
        "name": "Directions you hear on the street",
        "description": "Ga rechtdoor, sla linksaf, bij de halte, tegenover het station.",
        "examples": [
            {"nl": "Ga hier rechtdoor en dan links bij de brug.", "en": "Go straight here and then left at the bridge."},
            {"nl": "Het is naast de ingang van het station.", "en": "It's next to the station entrance."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-announcements-chunks",
        "name": "Simple station & OV chunks",
        "description": "Vertraging, spoor/perron, volgende halte, eindbestemming — herken de kern.",
        "examples": [
            {"nl": "De trein heeft vijf minuten vertraging.", "en": "The train is five minutes late."},
            {"nl": "Volgende halte: Centraal Station.", "en": "Next stop: Central Station."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-moeten-kunnen-transport",
        "name": "Moeten / kunnen in travel talk",
        "description": "Moet ik hier uitstappen? Kun je dat herhalen? Ik kan niet, ik moet overstappen.",
        "examples": [
            {"nl": "Moet ik hier overstappen?", "en": "Do I have to change here?"},
            {"nl": "Kunt u dat langzamer herhalen?", "en": "Could you repeat that more slowly?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-separable-transport",
        "name": "Separable verbs: in-/uit-/over- + stappen",
        "description": "Instappen, uitstappen, overstappen — praktisch in zinnen.",
        "examples": [
            {"nl": "U moet bij Station Zuid uitstappen.", "en": "You have to get off at Station Zuid."},
            {"nl": "We stappen hier over op de tram.", "en": "We change to the tram here."},
        ],
        "cefrLevel": "A2",
        "rules": {"pattern": "Particle often at end in main clause (present)."},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.2-sequence-travel",
        "name": "Eerst, dan, daarna (simple routes)",
        "description": "Korte volgorde: eerst de metro, dan lopen naar het perron.",
        "examples": [
            {"nl": "Eerst neem je tram 4, dan loop je twee minuten.", "en": "First you take tram 4, then you walk two minutes."},
            {"nl": "Daarna ga je naar spoor 5.", "en": "After that you go to platform 5."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
]

VOCAB = [
    ("lemma-station", "station", "station", "station", "noun"),
    ("lemma-perron", "perron", "perron", "platform", "noun"),
    ("lemma-spoor", "spoor", "spoor", "track (spoor X)", "noun"),
    ("lemma-trein", "trein", "trein", "train", "noun"),
    ("lemma-tram", "tram", "tram", "tram", "noun"),
    ("lemma-bus", "bus", "bus", "bus", "noun"),
    ("lemma-halte", "halte", "halte", "stop", "noun"),
    ("lemma-kaartje", "kaartje", "kaartje", "ticket", "noun"),
    ("lemma-retour", "retour", "retour", "return ticket", "noun"),
    ("lemma-enkele-reis", "enkele reis", "reis", "single ticket", "phrase"),
    ("lemma-ov-chipkaart", "OV-chipkaart", "OV-chipkaart", "OV-chip card", "noun"),
    ("lemma-vertraging", "vertraging", "vertraging", "delay", "noun"),
    ("lemma-overstappen", "overstappen", "overstappen", "to change (vehicles)", "verb"),
    ("lemma-uitstappen", "uitstappen", "uitstappen", "to get off", "verb"),
    ("lemma-instappen", "instappen", "instappen", "to get on", "verb"),
    ("lemma-rechtdoor", "rechtdoor", "rechtdoor", "straight ahead", "adv"),
    ("lemma-links", "links", "links", "left", "adv"),
    ("lemma-rechts", "rechts", "rechts", "right", "adv"),
    ("lemma-volgende-halte", "volgende halte", "halte", "next stop", "phrase"),
    ("lemma-eindbestemming", "eindbestemming", "eindbestemming", "final destination", "noun"),
    ("lemma-richting", "richting", "richting", "direction", "noun"),
    ("lemma-omleiding", "omleiding", "omleiding", "diversion / detour", "noun"),
    ("lemma-vertrekken", "vertrekken", "vertrekken", "to depart", "verb"),
    ("lemma-aankomen", "aankomen", "aankomen", "to arrive", "verb"),
    ("lemma-waar", "waar", "waar", "where", "adv"),
    ("lemma-hoe", "hoe", "hoe", "how", "adv"),
    ("lemma-welke", "welke", "welke", "which", "det"),
    ("lemma-helpen-m7", "helpen", "helpen", "to help", "verb"),
    ("lemma-herhalen", "herhalen", "herhalen", "to repeat", "verb"),
    ("lemma-verdwaald", "verdwaald", "verdwaald", "lost", "adj"),
    ("lemma-ticketautomaat", "ticketautomaat", "ticketautomaat", "ticket machine", "noun"),
    ("lemma-ingang", "ingang", "ingang", "entrance", "noun"),
    ("lemma-metro", "metro", "metro", "metro / subway", "noun"),
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
        "title": "Transport & getting around",
        "band": "A2.2",
        "description": "A2.2 Independence: stations, trams and buses, directions, tickets, delays and simple announcements — practical Dutch to move around with confidence.",
        "order": 6,
        "lessons": lessons,
        "grammarTargets": GRAMMAR,
        "vocabTargets": vocab_targets(),
        "learningGoals": [
            "Ask and follow simple directions and route questions in Dutch",
            "Handle ticket desk / machine phrases and basic delay or platform information",
            "Use moeten/kunnen and separable transport verbs in short, natural exchanges",
        ],
        "metadata": {
            **LM,
            "contentVersion": "m07-v1",
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        },
    }
    OUT.write_text(json.dumps(mod, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(f"Wrote {OUT}")
