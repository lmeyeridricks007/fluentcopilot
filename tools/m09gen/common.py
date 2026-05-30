"""Shared helpers and catalog for Module 9 (leisure, culture & conversations)."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

MID = "a2-m09-leisure-culture-conversations"
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "content/modules/a2-m09-leisure-culture-conversations/module.json"

LM = {
    "stage6": True,
    "schemaPlayer": True,
    "lessonDepth": {"m09": "v1", "targetMicroInteractions": "26-40"},
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
        d["metadata"] = {"depthLayer": "m09-v1"}
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
    hint: str = "Met vrienden: korte zinnen, *je/jij*, en reacties zoals *echt?* en *oh leuk!*",
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
        "id": "a2.3-leisure-opinions",
        "name": "Giving opinions (informal)",
        "description": "Ik vind … leuk/saai. Ik denk dat … Volgens mij … + korte reden.",
        "examples": [
            {"nl": "Ik vind jazz erg leuk.", "en": "I really like jazz."},
            {"nl": "Volgens mij is die film te lang.", "en": "I think that film is too long."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.3-leisure-hobbies",
        "name": "Hobbies & free time",
        "description": "Ik hou van … / Ik ga graag … / In het weekend …",
        "examples": [
            {"nl": "Ik hou van koken.", "en": "I love cooking."},
            {"nl": "Ik ga graag naar het museum.", "en": "I like going to the museum."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.3-leisure-reactions",
        "name": "Natural reactions",
        "description": "Echt? Oh leuk! Waarom? Dat vind ik ook. Dat snap ik.",
        "examples": [
            {"nl": "Echt? Waarom vind je dat?", "en": "Really? Why do you think that?"},
            {"nl": "Oh leuk! Dat wil ik ook proberen.", "en": "Oh nice! I want to try that too."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.3-leisure-perfectum-light",
        "name": "Light past (perfectum)",
        "description": "Gisteren heb ik … gekeken. Ik ben … geweest. (kort, hoogfrequent)",
        "examples": [
            {"nl": "Gisteren heb ik een film gekeken.", "en": "Yesterday I watched a film."},
            {"nl": "Ik ben in het park geweest.", "en": "I've been to the park."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.3-leisure-connectors",
        "name": "Linking in conversation",
        "description": "En, maar, want, omdat — één idee per zin is oké.",
        "examples": [
            {"nl": "Ik ga mee, want ik heb tijd.", "en": "I'm coming along, because I have time."},
            {"nl": "Het was leuk, maar ik was moe.", "en": "It was fun, but I was tired."},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
    {
        "id": "a2.3-leisure-conversation-flow",
        "name": "Keeping the conversation going",
        "description": "Wat vind jij? En jij? Hoe vaak doe je dat? Vertel eens.",
        "examples": [
            {"nl": "Wat doe jij graag in het weekend?", "en": "What do you like to do at the weekend?"},
            {"nl": "En jij? Ben je ook naar het concert geweest?", "en": "And you? Were you at the concert too?"},
        ],
        "cefrLevel": "A2",
        "rules": {},
        "metadata": {"module": MID},
    },
]

VOCAB = [
    ("lemma-hobby-m9", "hobby", "hobby", "hobby", "noun"),
    ("lemma-vrije-tijd", "vrije tijd", "vrije tijd", "free time", "noun"),
    ("lemma-weekend-m9", "weekend", "weekend", "weekend", "noun"),
    ("lemma-concert-m9", "concert", "concert", "concert", "noun"),
    ("lemma-museum-m9", "museum", "museum", "museum", "noun"),
    ("lemma-film-m9", "film", "film", "film", "noun"),
    ("lemma-muziek-m9", "muziek", "muziek", "music", "noun"),
    ("lemma-sport-m9", "sport", "sport", "sport", "noun"),
    ("lemma-boek-m9", "boek", "boek", "book", "noun"),
    ("lemma-vriend-m9", "vriend", "vriend", "friend", "noun"),
    ("lemma-leuk-m9", "leuk", "leuk", "nice / fun", "adj"),
    ("lemma-saai-m9", "saai", "saai", "boring", "adj"),
    ("lemma-interessant-m9", "interessant", "interessant", "interesting", "adj"),
    ("lemma-mening-m9", "mening", "mening", "opinion", "noun"),
    ("lemma-hou-van-m9", "houden van", "houden", "to love (like a lot)", "verb"),
    ("lemma-vinden-m9", "vinden", "vinden", "to find / think (opinion)", "verb"),
    ("lemma-denken-m9", "denken", "denken", "to think", "verb"),
    ("lemma-volgens-mij-m9", "volgens mij", "volgens", "in my opinion", "phrase"),
    ("lemma-eens-m9", "eens", "eens", "agree (het eens zijn)", "adv"),
    ("lemma-oneens-m9", "oneens", "oneens", "disagree", "adj"),
    ("lemma-gisteren-m9", "gisteren", "gisteren", "yesterday", "adv"),
    ("lemma-vandaag-m9", "vandaag", "vandaag", "today", "adv"),
    ("lemma-vaak-m9", "vaak", "vaak", "often", "adv"),
    ("lemma-soms-m9", "soms", "soms", "sometimes", "adv"),
    ("lemma-nooit-m9", "nooit", "nooit", "never", "adv"),
    ("lemma-want-m9", "want", "want", "because (coord.)", "conj"),
    ("lemma-omdat-m9", "omdat", "omdat", "because (subord.)", "conj"),
    ("lemma-maar-m9", "maar", "maar", "but", "conj"),
    ("lemma-en-m9", "en", "en", "and", "conj"),
    ("lemma-echt-m9", "echt", "echt", "really", "adv"),
    ("lemma-misschien-m9", "misschien", "misschien", "maybe", "adv"),
    ("lemma-uitgaan-m9", "uitgaan", "uitgaan", "to go out", "verb"),
    ("lemma-festival-m9", "festival", "festival", "festival", "noun"),
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
        "title": "Leisure, culture & conversations",
        "band": "A2.3",
        "description": "A2.2→pre-B1 bridge: hobbies, opinions, reactions, light perfectum, and longer informal chats — natural Dutch for real social life.",
        "order": 8,
        "lessons": lessons,
        "grammarTargets": GRAMMAR,
        "vocabTargets": vocab_targets(),
        "learningGoals": [
            "Talk about hobbies and preferences; agree or disagree simply with reasons",
            "Use light past tense and connectors in short personal stories",
            "React naturally (echt?, oh leuk!) and keep a conversation going with follow-up questions",
        ],
        "metadata": {
            **LM,
            "contentVersion": "m09-v1",
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        },
    }
    OUT.write_text(json.dumps(mod, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(f"Wrote {OUT}")
