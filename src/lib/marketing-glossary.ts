import { AppLanguage } from '@/lib/i18n-config';

export type MarketingTermKey =
  | 'campaign'
  | 'adSet'
  | 'creative'
  | 'spend'
  | 'impressions'
  | 'reach'
  | 'clicks'
  | 'results'
  | 'ctr'
  | 'cpc'
  | 'cpm'
  | 'opportunityScore';

type LocalizedText = Record<AppLanguage, string>;

export const MARKETING_GLOSSARY: Record<MarketingTermKey, { term: LocalizedText; definition: LocalizedText }> = {
  campaign: {
    term: { en: 'Campaign', fr: 'Campagne' },
    definition: {
      en: 'A top-level ad initiative. It groups multiple ad sets and ads under one objective and budget strategy.',
      fr: 'Initiative publicitaire principale. Elle regroupe plusieurs ensembles de publicités et annonces sous un même objectif.',
    },
  },
  adSet: {
    term: { en: 'Ad Set', fr: 'Ensemble de publicités' },
    definition: {
      en: 'A subgroup inside a campaign that controls audience targeting, placements, and delivery settings.',
      fr: 'Sous-groupe dans une campagne qui contrôle le ciblage, les emplacements et les paramètres de diffusion.',
    },
  },
  creative: {
    term: { en: 'Creative', fr: 'Créatif' },
    definition: {
      en: 'The ad asset people see, such as an image, video, or carousel.',
      fr: 'Le contenu de l’annonce vu par les utilisateurs, comme une image, une vidéo ou un carrousel.',
    },
  },
  spend: {
    term: { en: 'Spend', fr: 'Dépenses' },
    definition: {
      en: 'Total amount of money used on ads in the selected reporting window.',
      fr: 'Montant total dépensé pour les annonces sur la période sélectionnée.',
    },
  },
  impressions: {
    term: { en: 'Impressions', fr: 'Impressions' },
    definition: {
      en: 'How many times ads were shown. The same person can generate multiple impressions.',
      fr: 'Nombre total d’affichages des annonces. Une même personne peut générer plusieurs impressions.',
    },
  },
  reach: {
    term: { en: 'Reach', fr: 'Portée' },
    definition: {
      en: 'How many unique people saw the ad at least once.',
      fr: 'Nombre de personnes uniques ayant vu l’annonce au moins une fois.',
    },
  },
  clicks: {
    term: { en: 'Clicks', fr: 'Clics' },
    definition: {
      en: 'How many times users clicked from an ad to a destination.',
      fr: 'Nombre de fois où les utilisateurs ont cliqué depuis une annonce vers une destination.',
    },
  },
  results: {
    term: { en: 'Results', fr: 'Résultats' },
    definition: {
      en: 'The tracked outcome from your import setup, such as conversions, leads, or landing page actions.',
      fr: 'Résultat suivi selon votre import, comme des conversions, des leads ou des actions de page.',
    },
  },
  ctr: {
    term: { en: 'CTR', fr: 'CTR' },
    definition: {
      en: 'Click-through rate. CTR = Clicks / Impressions × 100. Higher CTR usually means stronger relevance.',
      fr: 'Taux de clic. CTR = Clics / Impressions × 100. Un CTR élevé indique souvent une annonce plus pertinente.',
    },
  },
  cpc: {
    term: { en: 'CPC', fr: 'CPC' },
    definition: {
      en: 'Cost per click. CPC = Spend / Clicks. Lower CPC means cheaper traffic.',
      fr: 'Coût par clic. CPC = Dépenses / Clics. Un CPC faible signifie un trafic moins coûteux.',
    },
  },
  cpm: {
    term: { en: 'CPM', fr: 'CPM' },
    definition: {
      en: 'Cost per 1,000 impressions. CPM = Spend / (Impressions / 1,000).',
      fr: 'Coût pour 1 000 impressions. CPM = Dépenses / (Impressions / 1 000).',
    },
  },
  opportunityScore: {
    term: { en: 'Opportunity Score', fr: 'Score d’opportunité' },
    definition: {
      en: 'A ranking signal used here to prioritize campaigns with stronger CTR efficiency relative to CPC.',
      fr: 'Indicateur de classement utilisé pour prioriser les campagnes avec une meilleure efficacité CTR par rapport au CPC.',
    },
  },
};
