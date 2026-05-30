/**
 * Realistic scene photos for KNM exam questions.
 * Local WebP in public/images/knm/ preferred; Wikimedia fallback until generated.
 */
export const KNM_SCENE_IMAGE_DIR = '/images/knm' as const

export type KnmSceneImageEntry = {
  /** Filename without path, e.g. bike_fall_knee */
  sceneId: string
  altNl: string
  /** Remote fallback when local WebP is missing */
  fallbackSrc?: string
  /** Prompt for image generation scripts */
  prompt: string
}

export const KNM_SCENE_IMAGES: Record<string, KnmSceneImageEntry> = {
  social_housing_queue: {
    sceneId: 'social_housing_queue',
    altNl: 'Wachtrij en inschrijving bij een woningbouwvereniging voor sociale huur.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Amsterdam-Apartment-Buildings.jpg/640px-Amsterdam-Apartment-Buildings.jpg',
    prompt:
      'Dutch apartment blocks and housing corporation entrance, modest social housing context, soft daylight, no logos, no text.',
  },
  rental_contract_signing: {
    sceneId: 'rental_contract_signing',
    altNl: 'Persoon leest een huurcontract aan tafel vóór ondertekening.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Signing_contract.jpg/640px-Signing_contract.jpg',
    prompt: 'Hands reading a rental contract at a kitchen table, Dutch home interior, soft light, no logos.',
  },
  moving_boxes: {
    sceneId: 'moving_boxes',
    altNl: 'Verhuizing met verhuisdozen bij een woning.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Moving_boxes.jpg/640px-Moving_boxes.jpg',
    prompt: 'Moving boxes stacked near apartment door, Dutch street, overcast daylight, no branding.',
  },
  neighbor_loud_music: {
    sceneId: 'neighbor_loud_music',
    altNl: 'Appartement met geluidsoverlast van buren in de avond.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Apartment_building_Netherlands.jpg/640px-Apartment_building_Netherlands.jpg',
    prompt: 'Dutch apartment wall, evening mood, subtle music vibration feeling, two neighbors implied, no faces focus.',
  },
  ceiling_water_leak: {
    sceneId: 'ceiling_water_leak',
    altNl: 'Natte plek en lekkage op een plafond in een huurwoning.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Water_damage_ceiling.jpg/640px-Water_damage_ceiling.jpg',
    prompt: 'Water stain and drip on apartment ceiling, damaged plaster, indoor realistic photo.',
  },
  mortgage_bank_meeting: {
    sceneId: 'mortgage_bank_meeting',
    altNl: 'Gesprek bij de bank over een hypotheek voor een woning.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Bank_office_desk.jpg/640px-Bank_office_desk.jpg',
    prompt: 'Bank advisor desk with documents about home loan, European office, no readable logos.',
  },
  energy_meter_bill: {
    sceneId: 'energy_meter_bill',
    altNl: 'Energieteller en jaarafrekening voor gas en elektriciteit.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Electricity_meter.jpg/640px-Electricity_meter.jpg',
    prompt: 'Electricity and gas meter in Dutch home utility closet, papers nearby, realistic.',
  },
  waste_bins_sorted: {
    sceneId: 'waste_bins_sorted',
    altNl: 'Gescheiden afvalbakken voor glas, papier en restafval aan huis.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Recycling_bins_Netherlands.jpg/640px-Recycling_bins_Netherlands.jpg',
    prompt: 'Color-coded recycling wheelie bins on Dutch residential street, no labels readable.',
  },
  gas_smell_valve: {
    sceneId: 'gas_smell_valve',
    altNl: 'Gaskraan in huis bij vermoeden van een gaslek.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Gas_meter_valve.jpg/640px-Gas_meter_valve.jpg',
    prompt: 'Hand turning domestic gas shutoff valve, utility area, tense but calm documentary photo.',
  },
  job_vacancy_board: {
    sceneId: 'job_vacancy_board',
    altNl: 'Vacatures en solliciteren: werk zoeken in Nederland.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Job_interview.jpg/640px-Job_interview.jpg',
    prompt: 'Job interview or vacancy notice board in Dutch employment office style, neutral, no logos.',
  },
  sick_call_employer: {
    sceneId: 'sick_call_employer',
    altNl: 'Werknemer belt ziek te melden bij de werkgever.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Person_on_phone_at_home.jpg/640px-Person_on_phone_at_home.jpg',
    prompt: 'Person calling employer from sofa with thermometer nearby, sick at home, soft daylight.',
  },
  employment_contract: {
    sceneId: 'employment_contract',
    altNl: 'Arbeidscontract lezen vóór je met werk begint.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Signing_contract.jpg/640px-Signing_contract.jpg',
    prompt: 'Employment contract and pen on desk, Dutch office context, realistic.',
  },
  payslip_document: {
    sceneId: 'payslip_document',
    altNl: 'Loonstrook met bruto en netto salaris.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Payroll.jpg/640px-Payroll.jpg',
    prompt: 'Payslip document on desk with calculator, no readable personal data, European office.',
  },
  handshake_greeting: {
    sceneId: 'handshake_greeting',
    altNl: 'Nederlandse begroeting met een hand geven.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Handshake.jpg/640px-Handshake.jpg',
    prompt: 'Two people shaking hands in neutral Dutch setting, friendly professional greeting, soft light.',
  },
  kingsday_orange_street: {
    sceneId: 'kingsday_orange_street',
    altNl: 'Koningsdag: oranje versiering en feest op straat.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Koningsdag_Amsterdam.jpg/640px-Koningsdag_Amsterdam.jpg',
    prompt: 'Dutch street festival with orange flags and bunting, Kings Day atmosphere, crowd soft blur.',
  },
  remembrance_wreath: {
    sceneId: 'remembrance_wreath',
    altNl: 'Dodenherdenking op 4 mei met krans en stilte.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Dodenherdenking.jpg/640px-Dodenherdenking.jpg',
    prompt: 'War memorial wreath and quiet gathering, Netherlands Remembrance Day mood, respectful.',
  },
  liberation_flag: {
    sceneId: 'liberation_flag',
    altNl: 'Bevrijdingsdag 5 mei: Nederlandse vlag en vieren van vrijheid.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Flag_of_the_Netherlands.svg/640px-Flag_of_the_Netherlands.svg.png',
    prompt: 'Dutch flags on houses on liberation day sunny street, festive but calm, photoreal.',
  },
  school_classroom: {
    sceneId: 'school_classroom',
    altNl: 'Basisschoolklas en onderwijs in Nederland.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Classroom_in_the_Netherlands.jpg/640px-Classroom_in_the_Netherlands.jpg',
    prompt: 'Dutch primary school classroom empty desks chairs, bright windows, no children faces.',
  },
  parent_teacher_talk: {
    sceneId: 'parent_teacher_talk',
    altNl: 'Oudergesprek met de leraar op school.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Job_interview.jpg/640px-Job_interview.jpg',
    prompt: 'Parent and teacher talking across school desk, friendly meeting, backs/side angles, Dutch school.',
  },
  child_daycare: {
    sceneId: 'child_daycare',
    altNl: 'Kinderopvang of kinderdagverblijf.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Kindergarten_playroom.jpg/640px-Kindergarten_playroom.jpg',
    prompt: 'Bright Dutch daycare play room with toys, safe child-friendly space, no kids in focus.',
  },
  gp_waiting_room: {
    sceneId: 'gp_waiting_room',
    altNl: 'Wachtkamer bij de huisarts.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Doctor%27s_waiting_room.jpg/640px-Doctor%27s_waiting_room.jpg',
    prompt: 'General practitioner waiting room Netherlands, chairs magazines, calm clinical light.',
  },
  pharmacy_counter: {
    sceneId: 'pharmacy_counter',
    altNl: 'Apotheek met medicijnen op recept.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Pharmacy_interior.jpg/640px-Pharmacy_interior.jpg',
    prompt: 'Dutch pharmacy counter with medicine shelves, professional clean interior, no brand names.',
  },
  hospital_referral: {
    sceneId: 'hospital_referral',
    altNl: 'Verwijzing van huisarts naar specialist in het ziekenhuis.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Hospital_reception.jpg/640px-Hospital_reception.jpg',
    prompt: 'Hospital reception desk with referral letter in hand, Dutch hospital corridor, realistic.',
  },
  midwife_pregnancy: {
    sceneId: 'midwife_pregnancy',
    altNl: 'Verloskundige en zwangerschapscontrole.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Prenatal_checkup.jpg/640px-Prenatal_checkup.jpg',
    prompt: 'Pregnancy checkup consultation room, midwife equipment, calm medical setting, no faces.',
  },
  dentist_chair: {
    sceneId: 'dentist_chair',
    altNl: 'Tandartsstoel voor controle of klacht aan tanden.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Dental_clinic.jpg/640px-Dental_clinic.jpg',
    prompt: 'Modern dental chair in clinic, empty, clean European dentist office.',
  },
  bike_fall_knee: {
    sceneId: 'bike_fall_knee',
    altNl: 'Val van de fiets met bloedende knie; iemand roept om 112 te bellen bij twijfel over spoed.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Cyclist_fall_first_aid.jpg/640px-Cyclist_fall_first_aid.jpg',
    prompt:
      'Photorealistic Netherlands urban bike path, adult cyclist fallen on pavement holding scraped bleeding knee, bystander nearby on phone, person still conscious sitting up, soft daylight, documentary style, no logos, no text overlays.',
  },
  emergency_112_phone: {
    sceneId: 'emergency_112_phone',
    altNl: 'Noodnummer 112 bellen bij levensgevaar of acute brand.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Emergency_services_Netherlands.jpg/640px-Emergency_services_Netherlands.jpg',
    prompt:
      'Person dialing emergency call on mobile phone outdoors with ambulance lights blurred background, urgent but realistic, Netherlands, no readable screen text.',
  },
  fire_smoke_hallway: {
    sceneId: 'fire_smoke_hallway',
    altNl: 'Brandlucht in een trappenhuis van een flat.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Apartment_stairwell.jpg/640px-Apartment_stairwell.jpg',
    prompt: 'Apartment stairwell with faint smoke haze, fire safety concern, person leaving calmly, realistic.',
  },
  street_argument_safe: {
    sceneId: 'street_argument_safe',
    altNl: 'Ruzie op straat zonder gewonden; veilige afstand houden.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Street_argument.jpg/640px-Street_argument.jpg',
    prompt: 'Two people arguing on Dutch sidewalk, no visible injury, bystander at distance, daylight.',
  },
  baby_fever_night: {
    sceneId: 'baby_fever_night',
    altNl: 'Baby met koorts laat op de avond; huisartsenpost of advies.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Mother_with_sick_baby.jpg/640px-Mother_with_sick_baby.jpg',
    prompt: 'Parent checking fever of baby at night in bedroom, warm lamp light, worried but calm, realistic.',
  },
  municipality_desk: {
    sceneId: 'municipality_desk',
    altNl: 'Gemeenteloket voor paspoort, inschrijving of vergunning.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Gemeentehuis_interior.jpg/640px-Gemeentehuis_interior.jpg',
    prompt: 'Dutch municipality service counter with queue ticket machine, civic office interior, soft light.',
  },
  passport_application: {
    sceneId: 'passport_application',
    altNl: 'Paspoort of ID-kaart aanvragen bij de gemeente.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Dutch_passport.jpg/640px-Dutch_passport.jpg',
    prompt: 'Passport application documents on gemeente desk, Dutch ID booklet generic, no readable personal data.',
  },
  police_report_desk: {
    sceneId: 'police_report_desk',
    altNl: 'Aangifte doen bij de politie.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Dutch_police_officer.jpg/640px-Dutch_police_officer.jpg',
    prompt: 'Police station front desk reporting crime, Dutch police uniform blurred, professional.',
  },
  tax_blue_envelope: {
    sceneId: 'tax_blue_envelope',
    altNl: 'Blauwe envelop van de Belastingdienst met een termijn.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Blue_envelope_Netherlands.jpg/640px-Blue_envelope_Netherlands.jpg',
    prompt: 'Blue tax authority envelope on doormat Dutch home, recognizable cultural object, no readable address.',
  },
  bank_card_blocked: {
    sceneId: 'bank_card_blocked',
    altNl: 'Pinpas gestolen: bankpas blokkeren en aangifte.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Bank_card_and_phone.jpg/640px-Bank_card_and_phone.jpg',
    prompt: 'Person on phone blocking bank card after theft, debit card on table, indoor realistic.',
  },
  health_insurance_letter: {
    sceneId: 'health_insurance_letter',
    altNl: 'Brief van de zorgverzekering over premie of polis.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Health_insurance_documents.jpg/640px-Health_insurance_documents.jpg',
    prompt: 'Health insurance papers on kitchen table Netherlands, stethoscope optional, calm.',
  },
  voting_polling_station: {
    sceneId: 'voting_polling_station',
    altNl: 'Stemmen bij een stembureau met stembiljet en ID.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Stembiljet_Nederland_Tweede_Kamerverkiezingen_2010.jpg/640px-Stembiljet_Nederland_Tweede_Kamerverkiezingen_2010.jpg',
    prompt: 'Dutch polling booth with red pencil ballot, voting screen, democratic election atmosphere.',
  },
  parliament_building: {
    sceneId: 'parliament_building',
    altNl: 'Tweede Kamer en politiek in Den Haag.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/House_of_Representatives_Netherlands.jpg/640px-House_of_Representatives_Netherlands.jpg',
    prompt: 'Dutch parliament building Binnenhof The Hague exterior, overcast sky, iconic politics.',
  },
  king_ceremonial: {
    sceneId: 'king_ceremonial',
    altNl: 'Koning en ceremonieel koningschap in Nederland.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/King_Willem-Alexander_2015.jpg/640px-King_Willem-Alexander_2015.jpg',
    prompt: 'Royal ceremonial appearance Netherlands palace balcony context, respectful documentary photo.',
  },
  delta_dam_sea: {
    sceneId: 'delta_dam_sea',
    altNl: 'Deltawerken en bescherming tegen de zee.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Oosterscheldekering_south_side.jpg/640px-Oosterscheldekering_south_side.jpg',
    prompt: 'Delta Works storm surge barrier Netherlands sea coast, engineering landmark, dramatic sky.',
  },
  amsterdam_canal: {
    sceneId: 'amsterdam_canal',
    altNl: 'Amsterdam en Nederlandse geografie.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Amsterdam_Canal_Houses.jpg/640px-Amsterdam_Canal_Houses.jpg',
    prompt: 'Amsterdam canal houses classic view, soft daylight, tourism-free calm composition.',
  },
  rijksmuseum_amsterdam: {
    sceneId: 'rijksmuseum_amsterdam',
    altNl: 'Het Rijksmuseum in Amsterdam.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Rijksmuseum_Amsterdam.jpg/640px-Rijksmuseum_Amsterdam.jpg',
    prompt:
      'Rijksmuseum Amsterdam exterior facade on Museumplein, soft daylight, iconic Dutch museum building, no readable text or logos.',
  },
  traffic_stop_sign: {
    sceneId: 'traffic_stop_sign',
    altNl: 'Stopbord bij een kruising in Nederland.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Stop_sign_Netherlands.jpg/640px-Stop_sign_Netherlands.jpg',
    prompt:
      'Dutch STOP traffic sign at urban intersection, clear red octagonal sign, cyclist and car implied, daylight, no readable license plates.',
  },
  un_peace_plaza: {
    sceneId: 'un_peace_plaza',
    altNl: 'Verenigde Naties: vrede en veiligheid in de wereld.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Flag_of_the_United_Nations.svg/640px-Flag_of_the_United_Nations.svg.png',
    prompt:
      'United Nations flags plaza peaceful diplomatic setting, blue UN flags, calm overcast sky, documentary photo, no readable text.',
  },
  anne_frank_house: {
    sceneId: 'anne_frank_house',
    altNl: 'Anne Frank Huis en geschiedenis WOII.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Westermarkt_20-22%2C_Amsterdam.jpg/640px-Westermarkt_20-22%2C_Amsterdam.jpg',
    prompt: 'Canal house museum exterior Amsterdam historic WWII context, respectful, no crowds focus.',
  },
  windmill_polder: {
    sceneId: 'windmill_polder',
    altNl: 'Windmolen en polderlandschap in Nederland.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Dutch_windmill.jpg/640px-Dutch_windmill.jpg',
    prompt: 'Traditional Dutch windmill in green polder flat landscape, cloudy sky, iconic geography.',
  },
  train_quiet_zone: {
    sceneId: 'train_quiet_zone',
    altNl: 'Stiltecoupé in de trein: niet praten.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/NS_train_interior.jpg/640px-NS_train_interior.jpg',
    prompt: 'Dutch train quiet zone interior, passengers silent, soft light, NS style without logos.',
  },
  child_fever_day: {
    sceneId: 'child_fever_day',
    altNl: 'Kind met koorts; overdag contact met de huisarts.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Mother_with_sick_baby.jpg/640px-Mother_with_sick_baby.jpg',
    prompt: 'Parent with ill child on couch daytime, thermometer, calling doctor, Dutch home interior.',
  },
  integration_neighborhood: {
    sceneId: 'integration_neighborhood',
    altNl: 'Nieuw in de buurt en meedoen in de gemeenschap.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Dutch_neighborhood_street.jpg/640px-Dutch_neighborhood_street.jpg',
    prompt: 'Friendly Dutch residential street neighbors chatting, diverse community, welcoming mood.',
  },
  sports_club: {
    sceneId: 'sports_club',
    altNl: 'Sportclub en vrijwilligerswerk in de buurt.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Football_pitch_local_club.jpg/640px-Football_pitch_local_club.jpg',
    prompt: 'Local Dutch football pitch community club, goal posts, evening practice lights soft.',
  },
  sinterklaas_shoes: {
    sceneId: 'sinterklaas_shoes',
    altNl: 'Sinterklaas: schoen zetten voor cadeaus.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Sinterklaas_shoes.jpg/640px-Sinterklaas_shoes.jpg',
    prompt: 'Children shoes by fireplace Sinterklaas tradition Netherlands, gifts candy, warm indoor.',
  },
  wedding_town_hall: {
    sceneId: 'wedding_town_hall',
    altNl: 'Trouwen in het gemeentehuis.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Wedding_civil_ceremony.jpg/640px-Wedding_civil_ceremony.jpg',
    prompt: 'Civil wedding ceremony room Dutch gemeente, couple from behind, official at desk.',
  },
  flood_1953_memorial: {
    sceneId: 'flood_1953_memorial',
    altNl: 'Watersnoodramp 1953 en waterveiligheid.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Oosterscheldekering_south_side.jpg/640px-Oosterscheldekering_south_side.jpg',
    prompt: 'Dutch sea dike stormy weather memorial mood, water safety theme, dramatic clouds.',
  },
  eu_flags: {
    sceneId: 'eu_flags',
    altNl: 'Europese Unie en Nederland als lid.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/European_Union_flags.jpg/640px-European_Union_flags.jpg',
    prompt: 'EU and Dutch flags together on poles, Brussels or Hague institutional setting, soft wind.',
  },
  flevoland_polder: {
    sceneId: 'flevoland_polder',
    altNl: 'Flevoland: drooggelegd land en polders.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Polder_landscape_Netherlands.jpg/640px-Polder_landscape_Netherlands.jpg',
    prompt: 'Vast flat Flevoland polder landscape new land Netherlands, straight roads horizon.',
  },
  car_damage_insurance: {
    sceneId: 'car_damage_insurance',
    altNl: 'Autoschade melden bij de verzekeraar.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Car_accident_damage.jpg/640px-Car_accident_damage.jpg',
    prompt: 'Minor car bumper damage parking lot person photographing for insurance claim, daylight.',
  },
  discrimination_help: {
    sceneId: 'discrimination_help',
    altNl: 'Discriminatie melden en hulp zoeken.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Job_interview.jpg/640px-Job_interview.jpg',
    prompt: 'Supportive office conversation discrimination complaint, diverse people professional setting.',
  },
  legal_advice_desk: {
    sceneId: 'legal_advice_desk',
    altNl: 'Juridisch Loket of gratis juridisch advies.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Bank_office_desk.jpg/640px-Bank_office_desk.jpg',
    prompt: 'Legal aid consultation desk papers forms, calm office Netherlands, helpful mood.',
  },
  ww_registration: {
    sceneId: 'ww_registration',
    altNl: 'Inschrijven bij UWV bij werkloosheid.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Job_interview.jpg/640px-Job_interview.jpg',
    prompt: 'Employment agency UWV style office job seeker at counter, Netherlands, realistic.',
  },
  childcare_allowance: {
    sceneId: 'childcare_allowance',
    altNl: 'Kinderopvangtoeslag aanvragen via toeslagen.nl.',
    fallbackSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Kindergarten_playroom.jpg/640px-Kindergarten_playroom.jpg',
    prompt: 'Parent with laptop applying childcare subsidy, daycare invoice on table, home office.',
  },
}

export function knmSceneImageSrc(sceneId: string): string {
  return `${KNM_SCENE_IMAGE_DIR}/${sceneId}.webp`
}

export function resolveKnmSceneEntry(sceneId: string): KnmSceneImageEntry | null {
  return KNM_SCENE_IMAGES[sceneId] ?? null
}
