/**
 * Contextual Dutch model answers for speaking exam report samples (and bank `example` fields).
 * Matches prompt text patterns so learners never see a generic hobby scaffold on a pasta question.
 */
import type { ExamLevel, ExamTaskType } from './types'

export type SpeakingModelAnswer = { text: string; isScaffold: boolean }

type ExampleTier = 'a1' | 'a2' | 'b1'

function tierForLevel(level: ExamLevel): ExampleTier {
  if (level === 'A1') return 'a1'
  if (level === 'B1') return 'b1'
  return 'a2'
}

function extractQuoted(promptNl: string): string | null {
  const m = promptNl.match(/[“"„](.+?)[”"”]/) || promptNl.match(/['‘](.+?)['’]/)
  const inner = m?.[1]?.trim() ?? null
  if (!inner) return null
  return inner.replace(/\s+/g, ' ')
}

function lc(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1)
}

function twoSentences(a1: string, a2: string, b1: string, tier: ExampleTier): string {
  if (tier === 'a1') return a1
  if (tier === 'b1') return b1
  return a2
}

function foodPrepareExample(food: string, tier: ExampleTier): string {
  const f = food.trim()
  if (/^pasta$/i.test(f)) {
    return twoSentences(
      'Ik kook water. Dan pasta in de pan. Lekker.',
      'Eerst kook ik water in een pan. Daarna doe ik de pasta erin met zout. Tot slot maak ik saus en eet ik het op.',
      'Eerst zet ik een grote pan water op het vuur. Als het kookt, doe ik de pasta erin met een beetje zout. Daarna giet ik het af en serveer ik het met tomatensaus en kaas.',
      tier,
    )
  }
  if (/stamppot/i.test(f)) {
    return twoSentences(
      'Ik kook aardappelen. Dan prak ik ze met groente.',
      'Eerst kook ik aardappelen en groente. Daarna prak ik alles tot stamppot en eet ik het warm op.',
      'Eerst schil en kook ik de aardappelen. Vervolgens stamp ik ze met groente en een klontje boter tot een warme stamppot.',
      tier,
    )
  }
  if (/soep/i.test(f)) {
    return twoSentences(
      'Ik snijd groente. Dan kook ik soep.',
      'Eerst snijd ik ui en wortel. Daarna kook ik ze in water met bouillon tot de soep klaar is.',
      'Eerst fruit ik de ui en snijd ik de groente. Daarna laat ik alles zachtjes koken in bouillon tot de soep goed smaakt.',
      tier,
    )
  }
  if (/broodjes/i.test(f)) {
    return twoSentences(
      'Ik koop broodjes. Dan beleg ik ze.',
      'Soms koop ik verse broodjes bij de bakker. Thuis beleg ik ze met kaas en tomaat.',
      'Meestal haal ik broodjes bij de bakker op zaterdag. Thuis beleg ik ze met kaas, ham of groente voor de lunch.',
      tier,
    )
  }
  return twoSentences(
    `Ik bereid ${f} thuis.`,
    `Eerst bereid ik ${f} in de keuken. Daarna eet ik het thuis, of ik bestel het soms bij een restaurant.`,
    `Thuis bereid ik ${f} stap voor stap: eerst de ingrediënten, daarna koken of bakken, en tot slot eten we het samen aan tafel.`,
    tier,
  )
}

function shortResponseFromPrompt(promptNl: string, tier: ExampleTier): SpeakingModelAnswer | null {
  const nl = promptNl.trim()

  let m = nl.match(/Leg in twee zinnen uit waarom je (.+?) leuk vindt/i)
  if (m) {
    const topic = m[1]!
    return {
      text: twoSentences(
        `Ik vind ${topic} leuk. Het is rustig.`,
        `Ik vind ${topic} leuk omdat het rustig is. Daarom doe ik het vaak in mijn vrije tijd.`,
        `Ik vind ${topic} vooral leuk omdat het me rust geeft en ik er energie van krijg. Daarom plan ik het bewust in mijn week.`,
        tier,
      ),
      isScaffold: false,
    }
  }

  m = nl.match(/Waarom vind je het wonen in of bij (.+?) prettig of minder prettig/i)
  if (m) {
    const place = m[1]!
    return {
      text: twoSentences(
        `Wonen bij ${place} is fijn. Er is veel te doen.`,
        `Ik vind wonen bij ${place} prettig omdat het rustig is en ik snel in de stad ben. Soms is het druk, maar dat accepteer ik.`,
        `Ik woon graag bij ${place} omdat het goed bereikbaar is en ik veel voorzieningen in de buurt heb. Af en toe is het druk, maar over het algemeen bevalt het me.`,
        tier,
      ),
      isScaffold: false,
    }
  }

  m = nl.match(/Beschrijf kort wat je meestal (.+?) doet/i)
  if (m) {
    const when = m[1]!
    return {
      text: twoSentences(
        `${when.charAt(0).toUpperCase() + when.slice(1)} eet ik en rust ik.`,
        `${when.charAt(0).toUpperCase() + when.slice(1)} drink ik koffie en lees ik kort. Daarna ga ik naar werk of naar huis.`,
        `${when.charAt(0).toUpperCase() + when.slice(1)} begin ik rustig met ontbijt en een korte planning. Daarna werk ik of regel ik dingen voor thuis.`,
        tier,
      ),
      isScaffold: false,
    }
  }

  m = nl.match(/Wat vind je het leukst aan werken (.+?)\?/i)
  if (m) {
    const place = m[1]!
    return {
      text: twoSentences(
        `Werken ${place} is gezellig. Ik praat met collega’s.`,
        `Ik vind werken ${place} leuk omdat ik met collega’s samenwerk. Het werk is afwisselend.`,
        `Het beste aan werken ${place} is het contact met collega’s en de duidelijke taken. Daardoor voel ik me nuttig en gemotiveerd.`,
        tier,
      ),
      isScaffold: false,
    }
  }

  m = nl.match(/Beschrijf kort hoe je thuis (.+?) bereidt of bestelt/i)
  if (m) {
    return { text: foodPrepareExample(m[1]!, tier), isScaffold: false }
  }

  m = nl.match(/Wanneer kies je liever (.+?) voor een korte afstand/i)
  if (m) {
    const mode = m[1]!
    return {
      text: twoSentences(
        `Ik pak ${mode} als het dichtbij is.`,
        `Ik kies ${mode} als het minder dan twee kilometer is. Dan ben ik snel en het is goedkoper.`,
        `Voor korte afstanden kies ik meestal ${mode}, vooral als het droog is en ik niet veel hoef te dragen. Zo bespaar ik tijd en geld.`,
        tier,
      ),
      isScaffold: false,
    }
  }

  m = nl.match(/Wat doe je graag in de (.+?)\?/i)
  if (m) {
    const season = m[1]!
    return {
      text: twoSentences(
        `In de ${season} wandel ik graag.`,
        `In de ${season} ga ik graag wandelen en drink ik koffie buiten. Het weer past dan goed bij die activiteiten.`,
        `In de ${season} combineer ik wandelen met een bezoek aan vrienden of een museum. Zo geniet ik van het seizoen en blijf ik actief.`,
        tier,
      ),
      isScaffold: false,
    }
  }

  m = nl.match(/Hoe reageer je op (.+?) onderweg naar werk/i)
  if (m) {
    const weather = m[1]!
    return {
      text: twoSentences(
        `Bij ${weather} neem ik een jas. Ik ga toch.`,
        `Bij ${weather} neem ik een paraplu of extra jas mee. Ik vertrek iets eerder zodat ik op tijd ben.`,
        `Als er ${weather} is, pas ik mijn kleding aan en vertrek ik eerder. Zo kom ik veilig en op tijd op mijn werk aan.`,
        tier,
      ),
      isScaffold: false,
    }
  }

  m = nl.match(/Wat helpt jou het meest bij het leren van (.+?) in het Nederlands/i)
  if (m) {
    const skill = m[1]!
    return {
      text: twoSentences(
        `${skill.charAt(0).toUpperCase() + skill.slice(1)} oefen ik elke dag.`,
        `Bij ${skill} helpen korte oefeningen elke dag. Ik luister ook naar Nederlandse podcasts.`,
        `Voor ${skill} oefen ik dagelijks met korte taken en echte voorbeelden. Daarnaast bespreek ik mijn fouten met mijn docent of een taalmaatje.`,
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/route naar werk.*ov|openbaar vervoer/i.test(nl)) {
    return {
      text: twoSentences(
        'Ik pak de bus. Dan de trein.',
        'Ik pak eerst de bus naar het station. Daarna neem ik de trein naar mijn werk.',
        'Ik reis met de bus naar het station en stap daar over op de trein. Meestal duurt de reis ongeveer dertig minuten.',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/waar woon je/i.test(nl)) {
    return {
      text: twoSentences(
        'Ik woon in Utrecht.',
        'Ik woon in Utrecht, in een klein appartement. Het is rustig en dicht bij het station.',
        'Ik woon in Utrecht, in een appartement vlak bij het centrum. Ik vind het fijn omdat alles goed bereikbaar is.',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/thuiswerk.*kantoor|liever thuiswerk/i.test(nl)) {
    return {
      text: twoSentences(
        'Thuiswerk is rustig. Ik mis collega’s soms.',
        'Ik werk graag thuis omdat ik tijd bespaar. Soms mis ik het contact op kantoor.',
        'Ik werk het liefst thuis omdat ik me daar beter kan concentreren. Toch mis ik af en toe overleg met collega’s op kantoor.',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/hobby|vrije tijd/i.test(nl)) {
    return {
      text: twoSentences(
        'In mijn vrije tijd lees ik.',
        'In mijn vrije tijd lees ik graag en ga ik wandelen. Dat vind ik rustig.',
        'In mijn vrije tijd lees ik graag boeken en ga ik elke week wandelen. Dat geeft mij rust en energie.',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/werk|baan|beroep/i.test(nl)) {
    return {
      text: twoSentences(
        'Ik werk in een winkel.',
        'Ik werk als administratief medewerker. Ik werk graag met collega’s.',
        'Ik werk als administratief medewerker bij een klein bedrijf. Het werk is afwisselend en ik werk graag samen met collega’s.',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/familie|gezin/i.test(nl)) {
    return {
      text: twoSentences(
        'Mijn gezin is klein.',
        'Mijn gezin is mijn partner en onze dochter. We zien familie elke week.',
        'Mijn gezin bestaat uit mijn partner en onze dochter. Mijn ouders wonen dichtbij, dus we zien elkaar regelmatig.',
        tier,
      ),
      isScaffold: false,
    }
  }

  return null
}

function practicalRequestFromPrompt(promptNl: string, tier: ExampleTier): SpeakingModelAnswer | null {
  const nl = promptNl.trim()

  if (/glas water|restaurant/i.test(nl)) {
    return {
      text: tier === 'a1' ? 'Mag ik water, alstublieft?' : 'Mag ik alstublieft een glas water?',
      isScaffold: false,
    }
  }

  if (/huisartsenpost|huisarts.*afspraak|tandarts|apotheek/i.test(nl)) {
    return {
      text: twoSentences(
        'Goedemorgen. Ik wil een afspraak.',
        'Goedemorgen. Ik wil graag een afspraak voor volgende week. Heeft u plek in de ochtend?',
        'Goedemorgen, u spreekt met Jan de Vries. Ik zou graag een afspraak maken voor volgende week. Heeft u dan plek in de ochtend?',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/pizzeria|pizza bestellen/i.test(nl)) {
    return {
      text: twoSentences(
        'Goedendag. Ik wil een pizza om acht uur.',
        'Goedendag. Ik wil graag een grote pizza bestellen voor acht uur afhalen. Is dat mogelijk?',
        'Goedendag, ik bel om een grote pizza te bestellen voor afhalen om acht uur. Kunt u bevestigen of dat lukt en wat het kost?',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/internet|provider|monteur|storing/i.test(nl)) {
    return {
      text: twoSentences(
        'Mijn internet werkt niet. Kunt u helpen?',
        'Goedendag. Mijn internet valt steeds weg. Kunt u een monteur inplannen?',
        'Goedendag, mijn internet valt sinds gisteren steeds weg. Ik heb de router al opnieuw opgestart. Kunt u een monteur inplannen, het liefst deze week?',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/verwarming/i.test(nl)) {
    return {
      text: twoSentences(
        'De verwarming werkt niet. Kunt u komen?',
        'Goedendag. De verwarming doet het niet. Kunt u iemand sturen?',
        'Goedendag, de verwarming in mijn woning doet het niet goed. Kunt u een monteur sturen en aangeven wanneer dat mogelijk is?',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/verhuurder|reparatie|lekkage/i.test(nl)) {
    return {
      text: twoSentences(
        'Er is lekkage. Kunt u repareren?',
        'Beste heer/mevrouw, er is lekkage in de badkamer. Kunt u een reparatie plannen?',
        'Geachte heer/mevrouw, er is lekkage in de badkamer. Kunt u een monteur sturen en mij laten weten wanneer de reparatie plaatsvindt?',
        tier,
      ),
      isScaffold: false,
    }
  }

  let m = nl.match(/Je spreekt (.+?) aan\. Vraag beleefd om (.+?)\./i)
  if (m) {
    const who = m[1]!
    const ask = lc(m[2]!.replace(/\.$/, ''))
    const usesU = /buur|collega|leidinggevende|docent|receptie|winkelmedewerker|buschauffeur|voorbijganger|kennis/i.test(
      who,
    )
    if (usesU || tier === 'b1') {
      return {
        text: twoSentences(
          `Mag ik u iets vragen? Ik wil graag ${ask}.`,
          `Sorry dat ik u stoor. Zou u ${ask}? Dat zou mij erg helpen. Dank u wel.`,
          `Goedendag. Sorry dat ik u stoor — zou u ${ask}? Ik waardeer uw hulp en hoor graag wat mogelijk is.`,
          tier,
        ),
        isScaffold: false,
      }
    }
    return {
      text: twoSentences(
        `Hoi, kun je me helpen? Ik wil graag ${ask}.`,
        `Hoi, zou je ${ask}? Dat zou fijn zijn. Alvast bedankt.`,
        `Hoi, ik wilde even vragen of je ${ask}. Laat me weten wat voor jou het beste uitkomt.`,
        tier,
      ),
      isScaffold: false,
    }
  }

  m = nl.match(/Je belt of spreekt (.+?)\.\s*(.+?)\.\s*Wat zeg je/i)
  if (m) {
    const service = m[1]!
    const goal = lc(m[2]!.replace(/\.$/, ''))
    return {
      text: twoSentences(
        `Goedendag. Ik bel over ${service}. ${goal.charAt(0).toUpperCase() + goal.slice(1)}.`,
        `Goedendag, ik bel ${service}. ${goal.charAt(0).toUpperCase() + goal.slice(1)}. Kunt u mij helpen?`,
        `Goedendag, u spreekt met Jan de Vries. Ik bel ${service} omdat ${goal}. Kunt u aangeven wat u van mij nodig heeft?`,
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/bel.*vriend|afspraak.*verzet/i.test(nl)) {
    return {
      text: twoSentences(
        'Hoi, ik kan niet komen. Anders vrijdag?',
        'Hoi, ik kan vanavond niet. Zullen we het verzetten naar vrijdag?',
        'Hoi, het spijt me maar ik kan vanavond niet komen. Zullen we verzetten naar vrijdagavond? Laat maar weten wat jou uitkomt.',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/supermarkt|melk/i.test(nl)) {
    return {
      text: tier === 'a1' ? 'Waar is de melk?' : 'Excuseer, waar kan ik de melk vinden?',
      isScaffold: false,
    }
  }

  return null
}

function followUpFromPrompt(promptNl: string, tier: ExampleTier): SpeakingModelAnswer | null {
  const quoted = extractQuoted(promptNl)
  const head = promptNl.toLowerCase()
  const speakerIsCustomer = /klant/.test(head)
  const speakerIsColleague = /collega|teamgenoot|leidinggevende/.test(head)
  const speakerIsFriend = /vriend|vriendin|huisgenoot/.test(head)
  const speakerIsNeighbour = /buur/.test(head)

  if (quoted) {
    const q = lc(quoted.replace(/[.?!]+$/, ''))
    if (speakerIsCustomer) {
      return {
        text:
          tier === 'a1'
            ? 'Wat vervelend! Sorry. Heeft u de bon? Dan help ik u.'
            : tier === 'a2'
              ? `Wat vervelend dat ${q}. Sorry daarvoor. Heeft u de bon nog? Dan kunnen we ruilen of het geld teruggeven.`
              : `Wat vervelend dat ${q}. Mijn excuses voor het ongemak. Mag ik vragen wanneer u het gekocht heeft en heeft u de bon nog? Dan kijk ik samen met u of we het kunnen ruilen of het geld terugbetalen.`,
        isScaffold: false,
      }
    }
    if (speakerIsColleague) {
      return {
        text:
          tier === 'a1'
            ? 'Vervelend. Zullen we samen kijken? Ik help je.'
            : tier === 'a2'
              ? `Vervelend dat ${q}. Ik snap het. Zullen we even samen kijken wat we nu kunnen doen?`
              : `Vervelend om te horen dat ${q}. Ik begrijp dat dit lastig is. Zullen we kort even samen kijken wat er nu nodig is? Dan stem ik dat ook af met de rest van het team.`,
        isScaffold: false,
      }
    }
    if (speakerIsFriend) {
      return {
        text:
          tier === 'a1'
            ? 'Wat vervelend! Kan ik iets voor je doen?'
            : tier === 'a2'
              ? `Wat vervelend dat ${q}. Wil je dat ik iets voor je doe?`
              : `Wat vervelend dat ${q}. Ik snap dat dit nu zwaar is. Zal ik vanavond even langskomen of kan ik iets voor je doen? Laat het me weten — ik wil je graag helpen.`,
        isScaffold: false,
      }
    }
    if (speakerIsNeighbour) {
      return {
        text:
          tier === 'a1'
            ? 'Vervelend. Ik geef het door. Hopelijk is het snel opgelost.'
            : tier === 'a2'
              ? `Vervelend dat ${q}. Zal ik het doorgeven aan de beheerder? Dan wordt het hopelijk snel opgelost.`
              : `Vervelend dat ${q}. Ik begrijp dat het irritant is. Zal ik er melding van maken bij de beheerder, of doet u dat? Dan wordt het hopelijk snel opgelost.`,
        isScaffold: false,
      }
    }
    return {
      text:
        tier === 'a1'
          ? `Wat vervelend. Ik help u graag. Wat heeft u nodig?`
          : tier === 'a2'
            ? `Wat vervelend dat ${q}. Ik help u graag. Wat heeft u nu nodig?`
            : `Wat vervelend dat ${q}. Ik begrijp dat dit lastig is voor u. Mag ik vragen wat u nu het meest nodig heeft? Dan kijk ik met u mee naar een passende oplossing.`,
      isScaffold: false,
    }
  }

  if (/deadline niet gehaald/i.test(head)) {
    return {
      text: twoSentences(
        'Vervelend. Zullen we samen kijken?',
        'Vervelend om te horen. Zullen we samen kijken wat je nu als eerste kunt afmaken?',
        'Dat is vervelend. Zullen we kort samen prioriteiten maken, zodat je vandaag nog een haalbare stap hebt?',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/lift.*kapot/i.test(head)) {
    return {
      text: twoSentences(
        'Vervelend. Ik bel de beheerder.',
        'Vervelend dat de lift kapot is. Ik geef het door aan de beheerder.',
        'Dat is vervelend. Ik meld het bij de beheerder en vraag wanneer de reparatie gepland staat.',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/hoofdpijn|kan vanavond niet/i.test(head)) {
    return {
      text: twoSentences(
        'Jammer. Beterschap. Anders zaterdag?',
        'Wat vervelend. Beterschap! Zullen we het verzetten naar zaterdag?',
        'Wat vervelend om te horen. Beterschap — zullen we een ander moment plannen, bijvoorbeeld zaterdagmiddag?',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/bus gemist/i.test(head)) {
    return {
      text: twoSentences(
        'Kijk op het bord. Misschien is er nog een bus.',
        'Vervelend. Kijk op het scherm of er nog een bus komt. Anders kunnen we de route op de telefoon zoeken.',
        'Dat is lastig. Controleer eerst het vertrek op het scherm; als er geen verbinding meer is, kunnen we samen een alternatieve route plannen.',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/sleutels vergeten/i.test(head)) {
    return {
      text: twoSentences(
        'Geen probleem. Ik ben thuis.',
        'Geen probleem. Ik ben thuis en doe open. Kom maar.',
        'Geen zorgen — ik ben thuis en kan je binnenlaten. Bel me als je voor de deur staat.',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (/weg kwijt|museum/i.test(head)) {
    return {
      text: twoSentences(
        'Het museum is daar. Loop rechtdoor.',
        'Het museum is vijf minuten lopen. Ga rechtdoor en sla dan linksaf bij de brug.',
        'Het museum ligt ongeveer vijf minuten lopen van hier. Loop rechtdoor tot de brug en sla dan linksaf; u ziet het bord al staan.',
        tier,
      ),
      isScaffold: false,
    }
  }

  return null
}

function describeSituationFromPrompt(promptNl: string, tier: ExampleTier): SpeakingModelAnswer | null {
  if (/file|op de snelweg/i.test(promptNl)) {
    return {
      text: twoSentences(
        'Er is file. Ik rij langzaam.',
        'Er is veel file op de snelweg. Ik rij rustig en luister naar de radio.',
        'Op de snelweg staat alles stil door file. Ik blijf kalm, zet de waarschuwingslichten aan en wacht tot het weer gaat rijden.',
        tier,
      ),
      isScaffold: false,
    }
  }
  if (/kamer|twee zinnen/i.test(promptNl)) {
    return {
      text: twoSentences(
        'Mijn kamer is klein. Er is een bed.',
        'Mijn kamer is klein en licht. Er staat een bed, een bureau en een kast.',
        'Mijn kamer is niet groot, maar wel licht en rustig. Er staan een bed, een bureau en een kast tegen de muur.',
        tier,
      ),
      isScaffold: false,
    }
  }
  return null
}

function defaultScaffold(taskType: ExamTaskType, tier: ExampleTier): SpeakingModelAnswer {
  if (taskType === 'follow_up_response') {
    return {
      text:
        tier === 'a1'
          ? 'Wat vervelend. Ik help je graag. Wat kunnen we doen?'
          : tier === 'a2'
            ? 'Wat vervelend om te horen. Ik help u graag. Wat kunnen we nu doen?'
            : 'Wat vervelend om te horen. Ik begrijp dat dit lastig is. Zullen we samen kijken wat we nu kunnen doen?',
      isScaffold: true,
    }
  }
  if (taskType === 'practical_request') {
    return {
      text:
        tier === 'a1'
          ? 'Goedendag. Kunt u mij helpen met …? Alvast bedankt.'
          : tier === 'a2'
            ? 'Goedendag. Ik bel met een vraag: kunt u mij helpen met …? Wanneer komt het u uit? Alvast bedankt.'
            : 'Goedendag, u spreekt met Jan de Vries. Ik bel met een vraag: zou u mij kunnen helpen met …? Wanneer komt het u uit en wat heeft u daarvoor van mij nodig?',
      isScaffold: true,
    }
  }
  return {
    text:
      tier === 'a1'
        ? 'Geef een kort antwoord in één of twee zinnen. Begin met de hoofdgedachte.'
        : tier === 'a2'
          ? 'Geef een duidelijk antwoord in twee of drie zinnen. Begin met de hoofdgedachte en voeg één reden of voorbeeld toe.'
          : 'Geef een duidelijk antwoord van twee tot drie zinnen. Begin met de hoofdgedachte, voeg één concrete reden toe, en sluit kort af.',
    isScaffold: true,
  }
}

/**
 * Infer a contextual model spoken answer from the task prompt. Returns `isScaffold: false`
 * when the answer matches the question; `true` only when no pattern matched.
 */
export function inferSpeakingModelAnswerNl(params: {
  taskType: ExamTaskType
  promptNl: string
  promptEn?: string
  level: ExamLevel
}): SpeakingModelAnswer {
  const tier = tierForLevel(params.level)
  const { taskType, promptNl } = params

  if (taskType === 'short_response') {
    const hit = shortResponseFromPrompt(promptNl, tier)
    if (hit) return hit
  }
  if (taskType === 'practical_request') {
    const hit = practicalRequestFromPrompt(promptNl, tier)
    if (hit) return hit
  }
  if (taskType === 'follow_up_response') {
    const hit = followUpFromPrompt(promptNl, tier)
    if (hit) return hit
  }
  if (taskType === 'describe_situation') {
    const hit = describeSituationFromPrompt(promptNl, tier)
    if (hit) return hit
  }

  if (taskType === 'explain_process' && /koken|recept|maaltijd|gerecht/i.test(promptNl)) {
    return {
      text: twoSentences(
        'Ik snijd ui. Dan kook ik in de pan.',
        'Eerst snijd ik de ui. Daarna bak ik die in de pan en voeg ik groente en saus toe.',
        'Eerst snijd ik ui en knoflook. Daarna bak ik ze rustig in olie en voeg ik groente en saus toe tot alles gaar is.',
        tier,
      ),
      isScaffold: false,
    }
  }

  if (taskType === 'give_opinion' && /thuiswerk|werk thuis/i.test(promptNl)) {
    return {
      text: twoSentences(
        'Thuiswerk is rustig. Ik mis collega’s soms.',
        'Ik vind thuiswerken goed omdat ik tijd bespaar. Maar ik mis collega’s, dus een mix is het beste.',
        'Ik denk dat thuiswerken vooral positief is vanwege de reistijd. Tegelijk mis ik contact op kantoor, dus een combinatie werkt het best.',
        tier,
      ),
      isScaffold: false,
    }
  }

  return defaultScaffold(taskType, tier)
}

/** A2 Part 1 bank items: store a concrete A2-level example for every prompt. */
export function a2SpeakingBankExampleNl(
  taskType: 'short_response' | 'practical_request' | 'follow_up_response',
  nl: string,
  en: string,
): string {
  return inferSpeakingModelAnswerNl({
    taskType,
    promptNl: nl,
    promptEn: en,
    level: 'A2',
  }).text
}
