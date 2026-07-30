export interface Service {
  id: string;
  name: string;
  nameFilipino: string;
  info: string;
  infoFilipino: string;
  requirements: string[];
  requirementsFilipino: string[];
  processingTime: string;
  fee: string;
}

export interface Office {
  id: string;
  name: string;
  nameFilipino: string;
  shortName: string;
  floor: string;
  description: string;
  descriptionFilipino: string;
  iconBg: string;
  services: Service[];
  vrTour: boolean;
  mapX: number;
  mapY: number;
}

export interface Announcement {
  id: string;
  title: string;
  titleFilipino: string;
  date: string;
  content: string;
  contentFilipino: string;
  category: string;
  urgent: boolean;
}

export const OFFICES: Office[] = [
  {
    id: '1',
    name: 'Municipal Civil Registrar',
    nameFilipino: 'Tanggapan ng Tagapagtala ng Sibil',
    shortName: 'MCR',
    floor: 'Ground Floor, Wing A',
    description: 'Handles civil registration documents including birth, marriage, and death certificates for the Municipality of Naujan.',
    descriptionFilipino: 'Nangangasiwa ng mga dokumentong rehistrong sibil kabilang ang sertipiko ng kapanganakan, kasal, at kamatayan para sa Munisipalidad ng Naujan.',
    iconBg: '#F97316',
    mapX: 28, mapY: 42, vrTour: true,
    services: [
      {
        id: 's1-1', name: 'Birth Certificate', nameFilipino: 'Sertipiko ng Kapanganakan',
        info: 'Request certified copies of birth certificates for legal, employment, or school purposes.',
        infoFilipino: 'Humiling ng mga sertipikadong kopya ng sertipiko ng kapanganakan para sa legal, trabaho, o pang-aral na layunin.',
        requirements: ['Valid government-issued ID (original and photocopy)', 'Accomplished Request Form (available at the office)', 'Processing fee — ₱100.00 per copy', 'Authorization letter with valid ID of representative (if not the owner)'],
        requirementsFilipino: ['Wastong ID na inilabas ng gobyerno (orihinal at photocopy)', 'Naaprubahang Request Form (makukuha sa opisina)', 'Bayad sa pagpoproseso — ₱100.00 bawat kopya', 'Liham ng pahintulot na may wastong ID ng kinatawan (kung hindi ang may-ari)'],
        processingTime: '15–30 minutes', fee: '₱100.00 per copy',
      },
      {
        id: 's1-2', name: 'Marriage Certificate', nameFilipino: 'Sertipiko ng Kasal',
        info: 'Request certified copies of marriage certificates for legal proceedings or personal records.',
        infoFilipino: 'Humiling ng mga sertipikadong kopya ng sertipiko ng kasal para sa legal na proseso o personal na rekord.',
        requirements: ['Valid government-issued ID', 'Application form', 'Processing fee — ₱100.00 per copy'],
        requirementsFilipino: ['Wastong ID ng gobyerno', 'Aplikasyon', 'Bayad — ₱100.00 bawat kopya'],
        processingTime: '15–30 minutes', fee: '₱100.00 per copy',
      },
      {
        id: 's1-3', name: 'Death Certificate', nameFilipino: 'Sertipiko ng Kamatayan',
        info: 'Request certified copies of death certificates for estate and legal purposes.',
        infoFilipino: 'Humiling ng mga sertipikadong kopya ng sertipiko ng kamatayan para sa estate at legal na layunin.',
        requirements: ['Valid government-issued ID', 'Application form', 'Processing fee — ₱100.00 per copy'],
        requirementsFilipino: ['Wastong ID ng gobyerno', 'Aplikasyon', 'Bayad — ₱100.00 bawat kopya'],
        processingTime: '15–30 minutes', fee: '₱100.00 per copy',
      },
      {
        id: 's1-4', name: 'Marriage License', nameFilipino: 'Lisensya sa Kasal',
        info: 'Apply for a marriage license at least 10 days before the intended wedding date.',
        infoFilipino: 'Mag-apply ng lisensya sa kasal nang hindi bababa sa 10 araw bago ang itinakdang petsa ng kasal.',
        requirements: ['CENOMAR from PSA', 'Birth Certificate of both parties (PSA authenticated)', 'Valid ID of both parties', 'Barangay Certificate', 'Application fee — ₱350.00'],
        requirementsFilipino: ['CENOMAR mula sa PSA', 'Sertipiko ng kapanganakan ng magkabilang panig (PSA authenticated)', 'Wastong ID ng magkabilang panig', 'Sertipiko ng Barangay', 'Bayad sa aplikasyon — ₱350.00'],
        processingTime: '10 days (mandatory waiting period)', fee: '₱350.00',
      },
    ],
  },
  {
    id: '2',
    name: "Office of the Mayor",
    nameFilipino: 'Tanggapan ng Alkalde',
    shortName: 'OM',
    floor: '2nd Floor, Main Building',
    description: 'The executive office of the Local Chief Executive. Handles business permits, special permits, and mayoral certifications.',
    descriptionFilipino: 'Ang ehekutibong opisina ng Lokal na Pinuno ng Pamahalaan. Nangangasiwa ng mga permiso sa negosyo, espesyal na permiso, at mayoral na sertipikasyon.',
    iconBg: '#1D4ED8',
    mapX: 58, mapY: 22, vrTour: true,
    services: [
      {
        id: 's2-1', name: 'Business Permit — New', nameFilipino: 'Permiso sa Negosyo — Bago',
        info: 'Apply for a new business permit required for operating any commercial, industrial, or service enterprise within Naujan.',
        infoFilipino: 'Mag-apply ng bagong permiso sa negosyo na kinakailangan para sa pagpapatakbo ng anumang komersyal, industriyal, o serbisyong negosyo sa Naujan.',
        requirements: ['DTI/SEC/CDA Certificate of Registration', 'Barangay Business Clearance', 'Proof of Real Property Tax payment', 'Contract of Lease (if lessee)', 'Sanitary Permit from MHO', 'Fire Safety Inspection Certificate from BFP', 'Business Permit Application Form'],
        requirementsFilipino: ['Sertipiko ng Rehistrasyon mula sa DTI/SEC/CDA', 'Barangay Business Clearance', 'Patunay ng pagbabayad ng Real Property Tax', 'Contract of Lease (kung nangungupahan)', 'Sanitary Permit mula sa MHO', 'Fire Safety Inspection Certificate mula sa BFP', 'Business Permit Application Form'],
        processingTime: '1–3 business days', fee: 'Based on capitalization',
      },
      {
        id: 's2-2', name: 'Business Permit — Renewal', nameFilipino: 'Permiso sa Negosyo — Pag-renew',
        info: 'Renew your annual business permit. Renewal period is January 1–20 each year.',
        infoFilipino: 'I-renew ang iyong taunang permiso sa negosyo. Ang panahon ng pag-renew ay Enero 1–20 bawat taon.',
        requirements: ["Previous year's Business Permit", 'Latest Official Receipt for taxes paid', 'Updated Barangay Business Clearance', 'Updated Sanitary Permit', 'Updated Fire Safety Inspection Certificate'],
        requirementsFilipino: ['Business Permit ng nakaraang taon', 'Pinakabagong Opisyal na Resibo', 'Updated na Barangay Business Clearance', 'Updated na Sanitary Permit', 'Updated na Fire Safety Inspection Certificate'],
        processingTime: '30 minutes – 1 business day', fee: 'Based on capitalization',
      },
      {
        id: 's2-3', name: "Mayor's Permit / Certification", nameFilipino: 'Permiso ng Alkalde / Sertipikasyon',
        info: "Request various certifications and special permits issued by the Mayor's Office.",
        infoFilipino: "Humiling ng iba't ibang sertipikasyon at espesyal na permiso na inilalabas ng Tanggapan ng Alkalde.",
        requirements: ['Accomplished application/request form', 'Valid government ID', 'Supporting documents as required by permit type'],
        requirementsFilipino: ['Naaprubahang aplikasyon/request form', 'Wastong ID ng gobyerno', 'Mga sumusuportang dokumento ayon sa uri ng permiso'],
        processingTime: '30 minutes – 2 business days', fee: 'Varies by type',
      },
    ],
  },
  {
    id: '3',
    name: "Municipal Treasurer's Office",
    nameFilipino: 'Tanggapan ng Tagaingat-Yaman ng Munisipalidad',
    shortName: 'MTO',
    floor: 'Ground Floor, Wing B',
    description: 'Manages all financial transactions including tax collections, RPT payments, and disbursement of municipal funds.',
    descriptionFilipino: 'Nangangasiwa ng lahat ng transaksyong pinansyal kabilang ang koleksyon ng buwis, pagbabayad ng RPT, at disbursement ng pondo ng munisipalidad.',
    iconBg: '#059669',
    mapX: 45, mapY: 62, vrTour: false,
    services: [
      {
        id: 's3-1', name: 'Real Property Tax Payment', nameFilipino: 'Pagbabayad ng Buwis sa Ari-arian',
        info: 'Pay annual real property taxes for residential, commercial, agricultural, and industrial properties. Early payment discounts apply (January–March).',
        infoFilipino: 'Magbayad ng taunang buwis sa ari-arian. May diskwento para sa maagang pagbabayad (Enero–Marso).',
        requirements: ['Tax Declaration (from MASSO)', 'Previous Official Receipt (or Tax Clearance)', 'Valid ID of property owner or authorized representative'],
        requirementsFilipino: ['Tax Declaration (mula sa MASSO)', 'Nakaraang Opisyal na Resibo (o Tax Clearance)', 'Wastong ID ng may-ari ng ari-arian o awtorisadong kinatawan'],
        processingTime: '5–15 minutes', fee: 'Based on assessed value',
      },
      {
        id: 's3-2', name: 'Community Tax Certificate (Cedula)', nameFilipino: 'Community Tax Certificate (Sedula)',
        info: 'Annual community tax certificate required for various government and private transactions including notarization.',
        infoFilipino: "Taunang community tax certificate na kinakailangan para sa iba't ibang transaksyon sa gobyerno at pribado.",
        requirements: ['Valid government-issued ID', 'Previous Cedula (for renewal)'],
        requirementsFilipino: ['Wastong ID ng gobyerno', 'Nakaraang Sedula (para sa pag-renew)'],
        processingTime: '5 minutes', fee: 'Minimum ₱5.00',
      },
      {
        id: 's3-3', name: 'Tax Clearance Certificate', nameFilipino: 'Tax Clearance Certificate',
        info: 'Obtain a tax clearance certificate certifying that all municipal taxes have been fully paid.',
        infoFilipino: 'Makakuha ng tax clearance certificate na nagpapatunay na lahat ng munisipal na buwis ay nabayaran na.',
        requirements: ['Official Receipt of latest tax payments', 'Valid ID', 'Application form'],
        requirementsFilipino: ['Opisyal na Resibo ng pinakabagong pagbabayad ng buwis', 'Wastong ID', 'Aplikasyon'],
        processingTime: '10–20 minutes', fee: '₱50.00',
      },
    ],
  },
  {
    id: '4',
    name: 'Municipal Health Office',
    nameFilipino: 'Tanggapan ng Kalusugan ng Munisipalidad',
    shortName: 'MHO',
    floor: 'Ground Floor, Health Building',
    description: 'Provides comprehensive public health services including consultations, immunizations, maternal care, and health certifications.',
    descriptionFilipino: 'Nagbibigay ng komprehensibong pampublikong serbisyong pangkalusugan kabilang ang konsultasyon, bakuna, pag-aalaga ng ina, at mga sertipikasyong pangkalusugan.',
    iconBg: '#DC2626',
    mapX: 72, mapY: 55, vrTour: false,
    services: [
      {
        id: 's4-1', name: 'Medical Certificate', nameFilipino: 'Sertipikong Medikal',
        info: 'Obtain a medical certificate for employment, school enrollment, travel, or other legal requirements.',
        infoFilipino: 'Makakuha ng sertipikong medikal para sa trabaho, pag-enroll sa paaralan, pagbiyahe, o iba pang legal na kinakailangan.',
        requirements: ['Valid government-issued ID', 'Completed health history form', 'Physical examination', 'Fee — ₱50.00'],
        requirementsFilipino: ['Wastong ID ng gobyerno', 'Natapos na health history form', 'Pisikal na pagsusuri', 'Bayad — ₱50.00'],
        processingTime: '30 minutes – 1 hour', fee: '₱50.00',
      },
      {
        id: 's4-2', name: 'Sanitary Permit', nameFilipino: 'Sanitary Permit',
        info: 'Required for food establishments and businesses to ensure compliance with health standards.',
        infoFilipino: 'Kinakailangan para sa mga establisyamento ng pagkain at negosyo upang matiyak ang pagsunod sa mga pamantayan ng kalusugan.',
        requirements: ["Business Permit or Mayor's Permit", 'Valid ID', 'Inspection of establishment', 'Sanitation fee'],
        requirementsFilipino: ["Business Permit o Mayor's Permit", 'Wastong ID', 'Inspeksyon ng establisyamento', 'Sanitation fee'],
        processingTime: '1–3 business days', fee: 'Varies by establishment type',
      },
    ],
  },
  {
    id: '5',
    name: 'Municipal Social Welfare & Development Office',
    nameFilipino: 'Tanggapan ng Kapakanan at Pagpapaunlad ng Lipunan',
    shortName: 'MSWD',
    floor: 'Ground Floor, Wing C',
    description: 'Provides social protection and welfare services for senior citizens, persons with disabilities, and other vulnerable sectors.',
    descriptionFilipino: 'Nagbibigay ng proteksyong panlipunan at serbisyong pangkapakanan para sa mga matatanda, may kapansanan, at iba pang mahihinang sektor.',
    iconBg: '#7C3AED',
    mapX: 22, mapY: 68, vrTour: false,
    services: [
      {
        id: 's5-1', name: 'Senior Citizen ID', nameFilipino: 'Senior Citizen ID',
        info: 'Register as a senior citizen (60 years old and above) to avail of benefits and discounts under the Expanded Senior Citizens Act.',
        infoFilipino: 'Magparehistro bilang senior citizen (60 taong gulang pataas) upang mapakinabangan ang mga benepisyo at diskwento.',
        requirements: ['PSA Birth Certificate', 'Barangay Certificate of Residency', '1x1 ID photo (2 copies)', 'Valid ID'],
        requirementsFilipino: ['PSA Sertipiko ng Kapanganakan', 'Sertipiko ng Barangay ng Tirahan', '1x1 ID photo (2 kopya)', 'Wastong ID'],
        processingTime: '30 minutes – 1 hour', fee: 'Free',
      },
      {
        id: 's5-2', name: 'Solo Parent ID', nameFilipino: 'Solo Parent ID',
        info: 'Register as a solo parent to obtain benefits under Republic Act 8972 (Solo Parents Welfare Act).',
        infoFilipino: 'Magparehistro bilang solo parent upang makakuha ng mga benepisyo sa ilalim ng RA 8972.',
        requirements: ['Barangay Certificate as Solo Parent', 'Birth Certificate of child/children', 'Valid ID', '1x1 ID photo (2 copies)'],
        requirementsFilipino: ['Sertipiko ng Barangay bilang Solo Parent', 'Sertipiko ng kapanganakan ng bata/mga bata', 'Wastong ID', '1x1 ID photo (2 kopya)'],
        processingTime: '1 week', fee: 'Free',
      },
    ],
  },
  {
    id: '6',
    name: "Municipal Engineer's Office",
    nameFilipino: 'Tanggapan ng Inhinyero ng Munisipalidad',
    shortName: 'MEO',
    floor: 'Ground Floor, Wing D',
    description: 'Handles building permits, infrastructure projects, and ensures compliance with the National Building Code.',
    descriptionFilipino: 'Nangangasiwa ng mga building permit, proyektong pang-imprastruktura, at tinitiyak ang pagsunod sa National Building Code.',
    iconBg: '#B45309',
    mapX: 38, mapY: 78, vrTour: false,
    services: [
      {
        id: 's6-1', name: 'Building Permit', nameFilipino: 'Building Permit',
        info: 'Required for construction, renovation, or demolition of any structure within the municipality.',
        infoFilipino: 'Kinakailangan para sa konstruksyon, pagpapabago, o demolisyon ng anumang istruktura sa loob ng munisipalidad.',
        requirements: ['Zoning Clearance from MPDO', 'Approved building plans signed by licensed engineer/architect', 'TCT or Tax Declaration', 'Building Permit Application Form', 'Assessment fee based on construction cost'],
        requirementsFilipino: ['Zoning Clearance mula sa MPDO', 'Aprubadong building plans na nilagdaan ng lisensyadong inhinyero/arkitekto', 'TCT o Tax Declaration', 'Building Permit Application Form', 'Bayad sa pagtatasa batay sa gastos ng konstruksyon'],
        processingTime: '5–15 business days', fee: 'Based on construction cost',
      },
    ],
  },
  {
    id: '7',
    name: 'Municipal Planning & Development Office',
    nameFilipino: 'Tanggapan ng Pagpaplano at Pagpapaunlad ng Munisipalidad',
    shortName: 'MPDO',
    floor: '2nd Floor, Main Building',
    description: 'Responsible for comprehensive land use planning, zoning administration, and development programs for sustainable growth.',
    descriptionFilipino: 'Responsable sa komprehensibong pagpaplano ng paggamit ng lupa, pangangasiwa ng zoning, at mga programang pangkaunlaran para sa napapanatiling paglago.',
    iconBg: '#0891B2',
    mapX: 62, mapY: 32, vrTour: false,
    services: [
      {
        id: 's7-1', name: 'Zoning / Locational Clearance', nameFilipino: 'Zoning / Locational Clearance',
        info: 'Obtain zoning clearance required for building permit applications and land use conformance verification.',
        infoFilipino: 'Makakuha ng zoning clearance na kinakailangan para sa mga aplikasyon ng building permit at pag-verify ng conformance sa paggamit ng lupa.',
        requirements: ['Application form', 'Location map / sketch plan of the property', 'Tax Declaration (from MASSO)', 'Photocopy of TCT or Tax Declaration', 'Clearance fee'],
        requirementsFilipino: ['Aplikasyon', 'Mapa ng lokasyon/sketch plan ng ari-arian', 'Tax Declaration (mula sa MASSO)', 'Photocopy ng TCT o Tax Declaration', 'Bayad sa clearance'],
        processingTime: '3–5 business days', fee: '₱200.00 – ₱1,000.00 (based on area)',
      },
    ],
  },
  {
    id: '8',
    name: 'Municipal Agriculture Office',
    nameFilipino: 'Tanggapan ng Agrikultura ng Munisipalidad',
    shortName: 'MAO',
    floor: 'Ground Floor, Agriculture Building',
    description: 'Provides agricultural extension services, technical assistance, and support programs for farmers and fisherfolk of Naujan.',
    descriptionFilipino: 'Nagbibigay ng mga serbisyong agrikultura, teknikal na tulong, at mga programang suporta para sa mga magsasaka at mangingisda ng Naujan.',
    iconBg: '#15803D',
    mapX: 78, mapY: 70, vrTour: false,
    services: [
      {
        id: 's8-1', name: "Farmer's Registry (RSBSA)", nameFilipino: 'Registry ng mga Magsasaka (RSBSA)',
        info: 'Register in the Registry System for Basic Sectors in Agriculture to access government agricultural programs and subsidies.',
        infoFilipino: 'Magparehistro sa Registry System for Basic Sectors in Agriculture upang ma-access ang mga programang pang-agrikultura at subsidyo ng gobyerno.',
        requirements: ['Valid government ID', 'Proof of land ownership or tenurial arrangement', 'Barangay Certificate as Farmer/Fisherfolk', 'RSBSA Registration Form'],
        requirementsFilipino: ['Wastong ID ng gobyerno', 'Patunay ng pagmamay-ari ng lupa o tenurial na kasunduan', 'Sertipiko ng Barangay bilang Magsasaka/Mangingisda', 'RSBSA Registration Form'],
        processingTime: '30 minutes', fee: 'Free',
      },
    ],
  },
];

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: 'Office Hours: Mon–Fri, 8:00 AM – 5:00 PM',
    titleFilipino: 'Oras ng Opisina: Lun–Biy, 8:00 AM – 5:00 PM',
    date: 'June 1, 2026',
    content: 'All municipal offices operate Monday to Friday, 8:00 AM to 5:00 PM, with a lunch break from 12:00 PM to 1:00 PM. Closed on weekends and official holidays.',
    contentFilipino: 'Lahat ng tanggapan ng munisipalidad ay nag-ooperate Lunes hanggang Biyernes, 8:00 AM hanggang 5:00 PM, na may lunch break 12:00 PM–1:00 PM. Sarado tuwing weekend at opisyal na pista opisyal.',
    category: 'Notice', urgent: false,
  },
  {
    id: 'a2',
    title: 'Real Property Tax Amnesty — Until June 30, 2026',
    titleFilipino: 'Amnestiya sa Buwis sa Ari-arian — Hanggang Hunyo 30, 2026',
    date: 'May 28, 2026',
    content: 'The Municipal Government of Naujan offers Real Property Tax Amnesty. All penalties, surcharges, and interests on unpaid real property taxes are waived. Visit the MTO immediately.',
    contentFilipino: 'Nag-aalok ang Pamahalaang Munisipal ng Naujan ng Amnestiya sa Buwis sa Ari-arian. Lahat ng multa, surcharge, at interes sa mga hindi nabayarang buwis sa ari-arian ay inaalis. Bisitahin ang MTO agad.',
    category: 'Tax', urgent: true,
  },
  {
    id: 'a3',
    title: 'Free Medical Mission — June 15, 2026',
    titleFilipino: 'Libreng Medical Mission — Hunyo 15, 2026',
    date: 'May 25, 2026',
    content: 'Free Medical Mission at the Naujan Municipal Plaza. Services include general consultation, dental, eye check-up, and free medicines. Sponsored by MHO and DOH Region IV-B.',
    contentFilipino: 'Libreng Medical Mission sa Naujan Municipal Plaza. Kasama ang mga serbisyo: pangkalahatang konsultasyon, dental, pagsusuri sa mata, at libreng gamot. Inisponsor ng MHO at DOH Region IV-B.',
    category: 'Health', urgent: false,
  },
  {
    id: 'a4',
    title: 'FindNau — Official Launch!',
    titleFilipino: 'FindNau — Opisyal na Paglulunsad!',
    date: 'June 1, 2026',
    content: 'The Municipality of Naujan proudly launches FindNau, the official digital service and navigation platform for the Municipal Building. Find services, view maps, and scan QR codes with ease.',
    contentFilipino: 'Ipinagmamalaki ng Munisipalidad ng Naujan ang paglulunsad ng FindNau, ang opisyal na digital na serbisyo at navigation platform para sa Municipal Building.',
    category: 'Announcement', urgent: false,
  },
  {
    id: 'a5',
    title: 'Online Business Permit Pre-registration Now Available',
    titleFilipino: 'Online Business Permit Pre-registration Available Na',
    date: 'May 20, 2026',
    content: "Business owners can now pre-register their business permit applications online through FindNau before visiting the Mayor's Office.",
    contentFilipino: "Maaari na ngayong mag-pre-register ang mga negosyante ng kanilang mga aplikasyon ng permiso sa negosyo online sa pamamagitan ng FindNau bago bumisita sa Tanggapan ng Alkalde.",
    category: 'Business', urgent: false,
  },
];

export const FAQ_ITEMS = [
  {
    id: 'f1',
    question: 'What are the operating hours of the municipal offices?',
    questionFilipino: 'Ano ang mga oras ng operasyon ng mga tanggapan ng munisipalidad?',
    answer: 'Municipal offices operate Monday to Friday, 8:00 AM to 5:00 PM, with a lunch break from 12:00 PM to 1:00 PM. Closed on weekends and official public holidays.',
    answerFilipino: 'Ang mga tanggapan ng munisipalidad ay nag-ooperate Lunes hanggang Biyernes, 8:00 AM hanggang 5:00 PM, na may lunch break 12:00 PM–1:00 PM. Sarado tuwing weekend at opisyal na pista opisyal ng publiko.',
  },
  {
    id: 'f2',
    question: 'How do I get a birth certificate?',
    questionFilipino: 'Paano makakakuha ng sertipiko ng kapanganakan?',
    answer: 'Visit the Municipal Civil Registrar (MCR) on the Ground Floor, Wing A, with a valid government ID and an application form. Processing fee is ₱100.00 per copy, and it takes 15–30 minutes.',
    answerFilipino: 'Bisitahin ang Municipal Civil Registrar (MCR) sa Ground Floor, Wing A, na may wastong ID ng gobyerno at aplikasyon. Bayad ay ₱100.00 bawat kopya, at tumatagal ng 15–30 minuto.',
  },
  {
    id: 'f3',
    question: 'Where do I pay my real property taxes?',
    questionFilipino: 'Saan ako magbabayad ng buwis sa ari-arian?',
    answer: "Real property taxes are paid at the Municipal Treasurer's Office (MTO) on the Ground Floor, Wing B. Bring your Tax Declaration and previous Official Receipt.",
    answerFilipino: "Ang buwis sa ari-arian ay binabayaran sa Tanggapan ng Tagaingat-Yaman ng Munisipalidad (MTO) sa Ground Floor, Wing B. Magdala ng iyong Tax Declaration at nakaraang Opisyal na Resibo.",
  },
  {
    id: 'f4',
    question: 'How do I apply for a business permit?',
    questionFilipino: 'Paano mag-apply ng permiso sa negosyo?',
    answer: "Visit the Office of the Mayor on the 2nd Floor, Main Building. Bring your DTI/SEC registration, Barangay Business Clearance, and other required documents. Processing takes 1–3 business days.",
    answerFilipino: "Bisitahin ang Tanggapan ng Alkalde sa 2nd Floor, Main Building. Magdala ng iyong rehistrasyon sa DTI/SEC, Barangay Business Clearance, at iba pang kinakailangang dokumento.",
  },
  {
    id: 'f5',
    question: 'How can I get a Senior Citizen ID?',
    questionFilipino: 'Paano makakakuha ng Senior Citizen ID?',
    answer: 'Visit the Municipal Social Welfare & Development Office (MSWD) on the Ground Floor, Wing C. Bring your PSA Birth Certificate, Barangay Certificate, and 1x1 ID photos. The ID is free.',
    answerFilipino: 'Bisitahin ang MSWD sa Ground Floor, Wing C. Magdala ng iyong PSA Sertipiko ng Kapanganakan, Sertipiko ng Barangay, at 1x1 ID photos. Libre ang ID.',
  },
  {
    id: 'f6',
    question: 'Where is the Municipal Building of Naujan located?',
    questionFilipino: 'Nasaan ang Municipal Building ng Naujan?',
    answer: 'The Municipal Building of Naujan is located at the Municipal Compound, Naujan, Oriental Mindoro. Accessible via the national highway and jeepneys plying the Calapan–Naujan route.',
    answerFilipino: 'Ang Municipal Building ng Naujan ay matatagpuan sa Municipal Compound, Naujan, Oriental Mindoro. Maaabot ito sa pamamagitan ng national highway at jeepney sa ruta ng Calapan–Naujan.',
  },
];

export const NOTIFICATIONS_DATA = [
  { id: 'n1', title: 'Tax Amnesty Reminder', message: 'Real Property Tax Amnesty ends June 30, 2026. Visit MTO now.', time: '2 hours ago', read: false, type: 'alert' },
  { id: 'n2', title: 'Welcome to FindNau!', message: 'Your gateway to Naujan municipal services is now live.', time: '1 day ago', read: false, type: 'info' },
  { id: 'n3', title: 'Free Medical Mission', message: 'Free medical mission on June 15 at Municipal Plaza.', time: '3 days ago', read: true, type: 'health' },
  { id: 'n4', title: 'Business Permit Online', message: 'You can now pre-register your business permit online.', time: '5 days ago', read: true, type: 'business' },
];

export const ADMIN_STATS = {
  totalUsers: 1247, totalServices: 32, totalOffices: 8, totalQRScans: 4892,
  monthlyVisits: [
    { month: 'Jan', visits: 820 }, { month: 'Feb', visits: 932 }, { month: 'Mar', visits: 1100 },
    { month: 'Apr', visits: 980 }, { month: 'May', visits: 1200 }, { month: 'Jun', visits: 1247 },
  ],
  serviceRequests: [
    { name: 'Birth Cert.', count: 342, fill: '#F97316' }, { name: 'Business Permit', count: 218, fill: '#1D4ED8' },
    { name: 'Real Prop. Tax', count: 456, fill: '#059669' }, { name: 'Medical Cert.', count: 189, fill: '#DC2626' },
    { name: 'Others', count: 312, fill: '#7C3AED' },
  ],
  officeVisits: [
    { name: 'MCR', visits: 412 }, { name: 'MTO', visits: 634 }, { name: "Mayor's", visits: 289 },
    { name: 'MHO', visits: 345 }, { name: 'MSWD', visits: 167 }, { name: 'MEO', visits: 201 },
  ],
};
