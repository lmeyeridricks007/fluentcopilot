"""Shared helpers and catalog for Module 10 (unexpected situations & problem solving)."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

MID = "a2-m10-unexpected-situations-problem-solving"
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "content/modules/a2-m10-unexpected-situations-problem-solving/module.json"

LM = {
    "stage6": True,
    "schemaPlayer": True,
    "lessonDepth": {"m10": "v1", "targetMicroInteractions": "26-40"},
}

# Default + optional overrides on speak_step(..., tips="…") for repair-heavy lines.
DEFAULT_M10_SPEAK_PRONUNCIATION = (
    "Short chunks, calm pace. Stress *niet* and the verb; Dutch *g/ch* from the back of the throat; "
    "*ij* sounds like English ‘ay’ in ‘say’."
)

DEFAULT_M10_WRITING_PRONUNCIATION = (
    "Reading aloud: pronounce *u* clearly in formal phrases; don’t drop *het* or *dat*."
)


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
        "feedbackConfig": {"pronunciationTips": tips or DEFAULT_M10_SPEAK_PRONUNCIATION},
    }
    return out


def writing_step(
    sid: str,
    prompt: str,
    user_prompt: str,
    acceptable: list[str],
    model: str,
    min_chars: int = 12,
    tips: str | None = None,
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
        "feedbackConfig": {"pronunciationTips": tips or DEFAULT_M10_WRITING_PRONUNCIATION},
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
        d["metadata"] = {"depthLayer": "m10-v1"}
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


def grammar_card(
    step_id: str,
    prompt: str,
    title: str,
    summary: str,
    examples: list[tuple[str, str]],
    hint: str = "Blijf rustig: korte zinnen. *U* in de winkel, *je* bij vrienden — allebei goed oefenen.",
) -> dict:
    ex = [{"nl": n, "en": e} for n, e in examples]
    return {
        "id": step_id,
        "prompt": prompt,
        "content": {"title": title, "summary": summary, "examples": ex},
        "feedbackConfig": {"hint": hint},
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
        "id": "a2.3-recovery-clarify",
        "name": "Clarifying & slowing down",
        "description": "Ik begrijp het niet. Kunt u dat herhalen? Kunt u langzamer spreken? Wat bedoelt u?",
        "examples": [
            {"nl": "Sorry, ik begrijp het niet. Kunt u dat nog een keer zeggen?", "en": "Sorry, I don't understand. Could you say that again?"},
            {"nl": "Kunt u iets langzamer praten, alstublieft?", "en": "Could you speak a little more slowly, please?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.3-recovery-problems",
        "name": "Stating a simple problem",
        "description": "Er is een probleem. Het werkt niet. Dat klopt niet. Ik heb een vraag.",
        "examples": [
            {"nl": "Er is een probleem met mijn bestelling.", "en": "There's a problem with my order."},
            {"nl": "Het werkt niet. Kunt u mij helpen?", "en": "It doesn't work. Can you help me?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.3-recovery-repair",
        "name": "Conversation repair",
        "description": "Wacht even. Dat is niet wat ik bedoelde. Ik weet het niet zeker. Nog een keer, langzamer.",
        "examples": [
            {"nl": "Wacht even — ik bedoelde morgen, niet vandaag.", "en": "Wait — I meant tomorrow, not today."},
            {"nl": "Dat is niet wat ik bedoelde. Sorry voor de verwarring.", "en": "That's not what I meant. Sorry for the confusion."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.3-recovery-explain",
        "name": "Simple explanations (want / omdat)",
        "description": "Korte reden: want … of omdat ik …. Eén idee per zin is genoeg.",
        "examples": [
            {"nl": "Ik moet nu weg, want ik heb een afspraak.", "en": "I have to go now, because I have an appointment."},
            {"nl": "Omdat de trein te laat was, ben ik te laat.", "en": "Because the train was late, I'm late."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.3-recovery-connectors",
        "name": "Connectors in repair (maar / want / omdat)",
        "description": "Maar voor tegenstelling; want tussen twee zinnen; omdat vaak met reden eerst.",
        "examples": [
            {"nl": "Ik wil helpen, maar ik spreek nog niet zo goed Nederlands.", "en": "I want to help, but I don't speak Dutch very well yet."},
            {"nl": "Het spijt me, want ik had het verkeerd begrepen.", "en": "I'm sorry, because I misunderstood."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.3-recovery-modals",
        "name": "Modals for help & permission",
        "description": "Kunt u …? / Kun je …? Mag ik …? — in context van hulp en verduidelijking.",
        "examples": [
            {"nl": "Kunt u mij naar perron zes wijzen?", "en": "Could you point me to platform six?"},
            {"nl": "Mag ik even iets vragen?", "en": "May I ask something?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
]

VOCAB = [
    ("lemma-probleem-m10", "probleem", "probleem", "problem", "noun"),
    ("lemma-begrijpen-m10", "begrijpen", "begrijpen", "to understand", "verb"),
    ("lemma-helpen-m10", "helpen", "helpen", "to help", "verb"),
    ("lemma-herhalen-m10", "herhalen", "herhalen", "to repeat", "verb"),
    ("lemma-langzaam-m10", "langzaam", "langzaam", "slow(ly)", "adj"),
    ("lemma-betekenen-m10", "bedoelen", "bedoelen", "to mean", "verb"),
    ("lemma-werken-m10", "werken", "werken", "to work (function)", "verb"),
    ("lemma-fout-m10", "fout", "fout", "wrong / mistake", "adj"),
    ("lemma-misverstand-m10", "misverstand", "misverstand", "misunderstanding", "noun"),
    ("lemma-wacht-m10", "wacht even", "wacht", "wait a moment", "phrase"),
    ("lemma-sorry-m10", "sorry", "sorry", "sorry", "interj"),
    ("lemma-vraag-m10", "vraag", "vraag", "question", "noun"),
    ("lemma-kloppen-m10", "kloppen", "kloppen", "to be correct", "verb"),
    ("lemma-verwacht-m10", "verwachten", "verwachten", "to expect", "verb"),
    ("lemma-uitleg-m10", "uitleg", "uitleg", "explanation", "noun"),
    ("lemma-trein-m10", "trein", "trein", "train", "noun"),
    ("lemma-bestelling-m10", "bestelling", "bestelling", "order", "noun"),
    ("lemma-kaartje-m10", "kaartje", "kaartje", "ticket", "noun"),
    ("lemma-winkel-m10", "winkel", "winkel", "shop", "noun"),
    ("lemma-adres-m10", "adres", "adres", "address", "noun"),
    ("lemma-balie-m10", "balie", "balie", "counter / desk", "noun"),
    ("lemma-want-m10", "want", "want", "because (coord.)", "conj"),
    ("lemma-omdat-m10", "omdat", "omdat", "because (subord.)", "conj"),
    ("lemma-maar-m10", "maar", "maar", "but", "conj"),
    ("lemma-kunnen-m10", "kunnen", "kunnen", "can / to be able", "verb"),
    ("lemma-mogen-m10", "mogen", "mogen", "may / to be allowed", "verb"),
    ("lemma-zeker-m10", "zeker", "zeker", "sure / certain", "adj"),
    ("lemma-druk-m10", "druk", "druk", "busy / crowded", "adj"),
    ("lemma-perron-m10", "perron", "perron", "platform", "noun"),
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
        "title": "Unexpected situations & problem solving",
        "band": "A2.3",
        "description": "A2.2→pre-B1 bridge: stay calm in Dutch when plans change — clarify, ask for help, fix misunderstandings, and keep talking with simple repair phrases.",
        "order": 9,
        "lessons": lessons,
        "grammarTargets": GRAMMAR,
        "vocabTargets": vocab_targets(),
        "learningGoals": [
            "Ask for repetition, slower speech, and clarification in shops, transport, and social talk",
            "State simple problems clearly and ask for help with natural modals (kunt u / kun je)",
            "Repair misunderstandings with short explanations using want / omdat / maar",
        ],
        "metadata": {
            **LM,
            "contentVersion": "m10-v1",
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        },
    }
    OUT.write_text(json.dumps(mod, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(f"Wrote {OUT}")
