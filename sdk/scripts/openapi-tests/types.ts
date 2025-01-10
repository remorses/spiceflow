export interface All {
  analyticsBrowsers:    AnalyticsBrowsers;
  analyticsCities:      AnalyticsCities;
  analyticsContinents:  AnalyticsContinents;
  analyticsCount:       AnalyticsCount;
  analyticsCountries:   AnalyticsCountries;
  analyticsDevices:     AnalyticsDevices;
  analyticsOS:          AnalyticsOS;
  analyticsRefererUrls: AnalyticsRefererUrls;
  analyticsReferers:    AnalyticsReferers;
  analyticsTimeseries:  AnalyticsTimeseries;
  analyticsTopLinks:    AnalyticsTopLinks;
  analyticsTopUrls:     AnalyticsTopUrls;
  analyticsTriggers:    AnalyticsTriggers;
  clickEvent:           ClickEvent;
  continentCode:        Continent;
  countryCode:          Country;
  domainSchema:         DomainSchema;
  leadCreatedEvent:     LeadCreatedEvent;
  leadEvent:            LeadEvent;
  linkClickedEvent:     LinkClickedEvent;
  linkGeoTargeting:     LinkGeoTargeting;
  linkSchema:           Link;
  linkWebhookEvent:     LinkWebhookEvent;
  regionCode:           string;
  saleCreatedEvent:     SaleCreatedEvent;
  saleEvent:            SaleEvent;
  tagSchema:            Tag;
  webhookEvent:         WebhookEvent;
  workspaceSchema:      Workspace;
  [property: string]: any;
}

export interface AnalyticsBrowsers {
  /**
   * The name of the browser
   */
  browser: string;
  /**
   * The number of clicks from this browser
   */
  clicks: number;
  /**
   * The number of leads from this browser
   */
  leads: number;
  /**
   * The total amount of sales from this browser, in cents
   */
  saleAmount: number;
  /**
   * The number of sales from this browser
   */
  sales: number;
  [property: string]: any;
}

export interface AnalyticsCities {
  /**
   * The name of the city
   */
  city: string;
  /**
   * The number of clicks from this city
   */
  clicks: number;
  /**
   * The 2-letter country code of the city: https://d.to/geo
   */
  country: Country;
  /**
   * The number of leads from this city
   */
  leads: number;
  /**
   * The total amount of sales from this city, in cents
   */
  saleAmount: number;
  /**
   * The number of sales from this city
   */
  sales: number;
  [property: string]: any;
}

/**
 * The 2-letter country code of the city: https://d.to/geo
 *
 * The 2-letter ISO 3166-1 country code for the country associated with the location of the
 * user. Learn more: https://d.to/geo
 *
 * The country to retrieve analytics for.
 */
export type Country = "AF" | "AL" | "DZ" | "AS" | "AD" | "AO" | "AI" | "AQ" | "AG" | "AR" | "AM" | "AW" | "AU" | "AT" | "AZ" | "BS" | "BH" | "BD" | "BB" | "BY" | "BE" | "BZ" | "BJ" | "BM" | "BT" | "BO" | "BA" | "BW" | "BV" | "BR" | "IO" | "BN" | "BG" | "BF" | "BI" | "KH" | "CM" | "CA" | "CV" | "KY" | "CF" | "TD" | "CL" | "CN" | "CX" | "CC" | "CO" | "KM" | "CG" | "CD" | "CK" | "CR" | "CI" | "HR" | "CU" | "CY" | "CZ" | "DK" | "DJ" | "DM" | "DO" | "EC" | "EG" | "SV" | "GQ" | "ER" | "EE" | "ET" | "FK" | "FO" | "FJ" | "FI" | "FR" | "GF" | "PF" | "TF" | "GA" | "GM" | "GE" | "DE" | "GH" | "GI" | "GR" | "GL" | "GD" | "GP" | "GU" | "GT" | "GN" | "GW" | "GY" | "HT" | "HM" | "VA" | "HN" | "HK" | "HU" | "IS" | "IN" | "ID" | "IR" | "IQ" | "IE" | "IL" | "IT" | "JM" | "JP" | "JO" | "KZ" | "KE" | "KI" | "KP" | "KR" | "KW" | "KG" | "LA" | "LV" | "LB" | "LS" | "LR" | "LY" | "LI" | "LT" | "LU" | "MO" | "MG" | "MW" | "MY" | "MV" | "ML" | "MT" | "MH" | "MQ" | "MR" | "MU" | "YT" | "MX" | "FM" | "MD" | "MC" | "MN" | "MS" | "MA" | "MZ" | "MM" | "NA" | "NR" | "NP" | "NL" | "NC" | "NZ" | "NI" | "NE" | "NG" | "NU" | "NF" | "MK" | "MP" | "NO" | "OM" | "PK" | "PW" | "PS" | "PA" | "PG" | "PY" | "PE" | "PH" | "PN" | "PL" | "PT" | "PR" | "QA" | "RE" | "RO" | "RU" | "RW" | "SH" | "KN" | "LC" | "PM" | "VC" | "WS" | "SM" | "ST" | "SA" | "SN" | "SC" | "SL" | "SG" | "SK" | "SI" | "SB" | "SO" | "ZA" | "GS" | "ES" | "LK" | "SD" | "SR" | "SJ" | "SZ" | "SE" | "CH" | "SY" | "TW" | "TJ" | "TZ" | "TH" | "TL" | "TG" | "TK" | "TO" | "TT" | "TN" | "TR" | "TM" | "TC" | "TV" | "UG" | "UA" | "AE" | "GB" | "US" | "UM" | "UY" | "UZ" | "VU" | "VE" | "VN" | "VG" | "VI" | "WF" | "EH" | "YE" | "ZM" | "ZW" | "AX" | "BQ" | "CW" | "GG" | "IM" | "JE" | "ME" | "BL" | "MF" | "RS" | "SX" | "SS" | "XK";

export interface AnalyticsContinents {
  /**
   * The number of clicks from this continent
   */
  clicks: number;
  /**
   * The 2-letter ISO 3166-1 code representing the continent associated with the location of
   * the user.
   */
  continent: Continent;
  /**
   * The number of leads from this continent
   */
  leads: number;
  /**
   * The total amount of sales from this continent, in cents
   */
  saleAmount: number;
  /**
   * The number of sales from this continent
   */
  sales: number;
  [property: string]: any;
}

/**
 * The 2-letter ISO 3166-1 code representing the continent associated with the location of
 * the user.
 *
 * The continent to retrieve analytics for.
 */
export type Continent = "AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA";

export interface AnalyticsCount {
  /**
   * The total number of clicks
   */
  clicks: number;
  /**
   * The total number of leads
   */
  leads: number;
  /**
   * The total amount of sales, in cents
   */
  saleAmount: number;
  /**
   * The total number of sales
   */
  sales: number;
  [property: string]: any;
}

export interface AnalyticsCountries {
  city: City;
  /**
   * The number of clicks from this country
   */
  clicks: number;
  /**
   * The 2-letter ISO 3166-1 country code for the country associated with the location of the
   * user. Learn more: https://d.to/geo
   */
  country: Country;
  /**
   * The number of leads from this country
   */
  leads: number;
  /**
   * The total amount of sales from this country, in cents
   */
  saleAmount: number;
  /**
   * The number of sales from this country
   */
  sales: number;
  [property: string]: any;
}

export type City = "*";

export interface AnalyticsDevices {
  /**
   * The number of clicks from this device
   */
  clicks: number;
  /**
   * The name of the device
   */
  device: string;
  /**
   * The number of leads from this device
   */
  leads: number;
  /**
   * The total amount of sales from this device, in cents
   */
  saleAmount: number;
  /**
   * The number of sales from this device
   */
  sales: number;
  [property: string]: any;
}

export interface AnalyticsOS {
  /**
   * The number of clicks from this OS
   */
  clicks: number;
  /**
   * The number of leads from this OS
   */
  leads: number;
  /**
   * The name of the OS
   */
  os: string;
  /**
   * The total amount of sales from this OS, in cents
   */
  saleAmount: number;
  /**
   * The number of sales from this OS
   */
  sales: number;
  [property: string]: any;
}

export interface AnalyticsRefererUrls {
  /**
   * The number of clicks from this referer to this URL
   */
  clicks: number;
  /**
   * The number of leads from this referer to this URL
   */
  leads: number;
  /**
   * The full URL of the referer. If unknown, this will be `(direct)`
   */
  refererURL: string;
  /**
   * The total amount of sales from this referer to this URL, in cents
   */
  saleAmount: number;
  /**
   * The number of sales from this referer to this URL
   */
  sales: number;
  [property: string]: any;
}

export interface AnalyticsReferers {
  /**
   * The number of clicks from this referer
   */
  clicks: number;
  /**
   * The number of leads from this referer
   */
  leads: number;
  /**
   * The name of the referer. If unknown, this will be `(direct)`
   */
  referer: string;
  /**
   * The total amount of sales from this referer, in cents
   */
  saleAmount: number;
  /**
   * The number of sales from this referer
   */
  sales: number;
  [property: string]: any;
}

export interface AnalyticsTimeseries {
  /**
   * The number of clicks in the interval
   */
  clicks: number;
  /**
   * The number of leads in the interval
   */
  leads: number;
  /**
   * The total amount of sales in the interval, in cents
   */
  saleAmount: number;
  /**
   * The number of sales in the interval
   */
  sales: number;
  /**
   * The starting timestamp of the interval
   */
  start: string;
  [property: string]: any;
}

export interface AnalyticsTopLinks {
  /**
   * The number of clicks from this link
   */
  clicks: number;
  /**
   * The creation timestamp of the short link
   */
  createdAt: string;
  /**
   * The domain of the short link
   */
  domain: string;
  /**
   * The unique ID of the short link
   */
  id: string;
  /**
   * The key of the short link
   */
  key: string;
  /**
   * The number of leads from this link
   */
  leads: number;
  /**
   * The unique ID of the short link
   */
  link: string;
  /**
   * The total amount of sales from this link, in cents
   */
  saleAmount: number;
  /**
   * The number of sales from this link
   */
  sales: number;
  /**
   * The short link URL
   */
  shortLink: string;
  /**
   * The destination URL of the short link
   */
  url: string;
  [property: string]: any;
}

export interface AnalyticsTopUrls {
  /**
   * The number of clicks from this URL
   */
  clicks: number;
  /**
   * The number of leads from this URL
   */
  leads: number;
  /**
   * The total amount of sales from this URL, in cents
   */
  saleAmount: number;
  /**
   * The number of sales from this URL
   */
  sales: number;
  /**
   * The destination URL
   */
  url: string;
  [property: string]: any;
}

export interface AnalyticsTriggers {
  /**
   * The number of clicks from this trigger method
   */
  clicks: number;
  /**
   * The number of leads from this trigger method
   */
  leads: number;
  /**
   * The total amount of sales from this trigger method, in cents
   */
  saleAmount: number;
  /**
   * The number of sales from this trigger method
   */
  sales: number;
  /**
   * The type of trigger method: link click or QR scan
   */
  trigger: Trigger;
  [property: string]: any;
}

/**
 * The type of trigger method: link click or QR scan
 */
export type Trigger = "qr" | "link";

export interface ClickEvent {
  /**
   * Deprecated. Use `click.browser` instead.
   */
  browser: string;
  /**
   * Deprecated. Use `click.city` instead.
   */
  city:  string;
  click: ClickEventClick;
  /**
   * Deprecated. Use `click.id` instead.
   */
  clickID: string;
  /**
   * Deprecated. Use `click.continent` instead.
   */
  continent: string;
  /**
   * Deprecated. Use `click.country` instead.
   */
  country: string;
  /**
   * Deprecated. Use `click.device` instead.
   */
  device: string;
  /**
   * Deprecated. Use `link.domain` instead.
   */
  domain: string;
  event:  ClickEventEvent;
  /**
   * Deprecated. Use `click.ip` instead.
   */
  ip: string;
  /**
   * Deprecated. Use `link.key` instead.
   */
  key:  string;
  link: ClickEventLink;
  /**
   * Deprecated. Use `link.id` instead.
   */
  linkID: string;
  /**
   * Deprecated. Use `click.os` instead.
   */
  os: string;
  /**
   * Deprecated. Use `click.qr` instead.
   */
  qr:         number;
  timestamp?: string;
  /**
   * Deprecated. Use `click.url` instead.
   */
  url: string;
  [property: string]: any;
}

export interface ClickEventClick {
  browser:    string;
  city:       string;
  continent:  string;
  country:    string;
  device:     string;
  id:         string;
  ip:         string;
  os:         string;
  qr?:        boolean;
  referer:    string;
  refererURL: string;
  region:     string;
  url:        string;
  [property: string]: any;
}

export type ClickEventEvent = "click";

export interface ClickEventLink {
  /**
   * The Android destination URL for the short link for Android device targeting.
   */
  android:   string;
  archived?: boolean;
  /**
   * The number of clicks on the short link.
   */
  clicks: number;
  /**
   * The comments for the short link.
   */
  comments:  string;
  createdAt: string;
  /**
   * The description of the short link generated via `api.dub.co/metatags`. Will be used for
   * Custom Social Media Cards if `proxy` is true.
   */
  description: string;
  doIndex?:    boolean;
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain:     string;
  expiredURL: string;
  expiresAt:  string;
  /**
   * This is the ID of the link in your database that is unique across your workspace. If set,
   * it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
   * when passed as a query parameter.
   */
  externalID: string;
  /**
   * Geo targeting information for the short link in JSON format `{[COUNTRY]:
   * https://example.com }`. Learn more: https://d.to/geo
   */
  geo: PurpleGeo;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  image: string;
  /**
   * The iOS destination URL for the short link for iOS device targeting.
   */
  ios: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key:         string;
  lastClicked: string;
  /**
   * [BETA]: The number of leads the short links has generated.
   */
  leads: number;
  /**
   * The password required to access the destination URL of the short link.
   */
  password: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The project ID of the short link. This field is deprecated – use `workspaceId` instead.
   */
  projectID:    string;
  proxy?:       boolean;
  publicStats?: boolean;
  /**
   * The full URL of the QR code for the short link (e.g.
   * `https://api.dub.co/qr?url=https://dub.sh/try`).
   */
  qrCode:   string;
  rewrite?: boolean;
  /**
   * [BETA]: The total dollar amount of sales the short links has generated (in cents).
   */
  saleAmount: number;
  /**
   * [BETA]: The number of sales the short links has generated.
   */
  sales: number;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  /**
   * The unique ID of the tag assigned to the short link. This field is deprecated – use
   * `tags` instead.
   */
  tagID: string;
  /**
   * The tags assigned to the short link.
   */
  tags: Tag[];
  /**
   * The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  title:            string;
  trackConversion?: boolean;
  updatedAt:        string;
  url:              string;
  userID:           string;
  /**
   * The UTM campaign of the short link.
   */
  utmCampaign: string;
  /**
   * The UTM content of the short link.
   */
  utmContent: string;
  /**
   * The UTM medium of the short link.
   */
  utmMedium: string;
  /**
   * The UTM source of the short link.
   */
  utmSource: string;
  /**
   * The UTM term of the short link.
   */
  utmTerm: string;
  /**
   * The custom link preview video (og:video). Will be used for Custom Social Media Cards if
   * `proxy` is true. Learn more: https://d.to/og
   */
  video: string;
  /**
   * The IDs of the webhooks that the short link is associated with.
   */
  webhookIDS: string[];
  /**
   * The workspace ID of the short link.
   */
  workspaceID: string;
  [property: string]: any;
}

/**
 * Geo targeting information for the short link in JSON format `{[COUNTRY]:
 * https://example.com }`. Learn more: https://d.to/geo
 */
export interface PurpleGeo {
  ad?: string;
  ae?: string;
  af?: string;
  ag?: string;
  ai?: string;
  al?: string;
  am?: string;
  ao?: string;
  aq?: string;
  ar?: string;
  as?: string;
  at?: string;
  au?: string;
  aw?: string;
  ax?: string;
  az?: string;
  ba?: string;
  bb?: string;
  bd?: string;
  be?: string;
  bf?: string;
  bg?: string;
  bh?: string;
  bi?: string;
  bj?: string;
  bl?: string;
  bm?: string;
  bn?: string;
  bo?: string;
  bq?: string;
  br?: string;
  bs?: string;
  bt?: string;
  bv?: string;
  bw?: string;
  by?: string;
  bz?: string;
  ca?: string;
  cc?: string;
  cd?: string;
  cf?: string;
  cg?: string;
  ch?: string;
  ci?: string;
  ck?: string;
  cl?: string;
  cm?: string;
  cn?: string;
  co?: string;
  cr?: string;
  cu?: string;
  cv?: string;
  cw?: string;
  cx?: string;
  cy?: string;
  cz?: string;
  de?: string;
  dj?: string;
  dk?: string;
  dm?: string;
  do?: string;
  dz?: string;
  ec?: string;
  ee?: string;
  eg?: string;
  eh?: string;
  er?: string;
  es?: string;
  et?: string;
  fi?: string;
  fj?: string;
  fk?: string;
  fm?: string;
  fo?: string;
  fr?: string;
  ga?: string;
  gb?: string;
  gd?: string;
  ge?: string;
  gf?: string;
  gg?: string;
  gh?: string;
  gi?: string;
  gl?: string;
  gm?: string;
  gn?: string;
  gp?: string;
  gq?: string;
  gr?: string;
  gs?: string;
  gt?: string;
  gu?: string;
  gw?: string;
  gy?: string;
  hk?: string;
  hm?: string;
  hn?: string;
  hr?: string;
  ht?: string;
  hu?: string;
  id?: string;
  ie?: string;
  il?: string;
  im?: string;
  in?: string;
  io?: string;
  iq?: string;
  ir?: string;
  is?: string;
  it?: string;
  je?: string;
  jm?: string;
  jo?: string;
  jp?: string;
  ke?: string;
  kg?: string;
  kh?: string;
  ki?: string;
  km?: string;
  kn?: string;
  kp?: string;
  kr?: string;
  kw?: string;
  ky?: string;
  kz?: string;
  la?: string;
  lb?: string;
  lc?: string;
  li?: string;
  lk?: string;
  lr?: string;
  ls?: string;
  lt?: string;
  lu?: string;
  lv?: string;
  ly?: string;
  ma?: string;
  mc?: string;
  md?: string;
  me?: string;
  mf?: string;
  mg?: string;
  mh?: string;
  mk?: string;
  ml?: string;
  mm?: string;
  mn?: string;
  mo?: string;
  mp?: string;
  mq?: string;
  mr?: string;
  ms?: string;
  mt?: string;
  mu?: string;
  mv?: string;
  mw?: string;
  mx?: string;
  my?: string;
  mz?: string;
  na?: string;
  nc?: string;
  ne?: string;
  nf?: string;
  ng?: string;
  ni?: string;
  nl?: string;
  no?: string;
  np?: string;
  nr?: string;
  nu?: string;
  nz?: string;
  om?: string;
  pa?: string;
  pe?: string;
  pf?: string;
  pg?: string;
  ph?: string;
  pk?: string;
  pl?: string;
  pm?: string;
  pn?: string;
  pr?: string;
  ps?: string;
  pt?: string;
  pw?: string;
  py?: string;
  qa?: string;
  re?: string;
  ro?: string;
  rs?: string;
  ru?: string;
  rw?: string;
  sa?: string;
  sb?: string;
  sc?: string;
  sd?: string;
  se?: string;
  sg?: string;
  sh?: string;
  si?: string;
  sj?: string;
  sk?: string;
  sl?: string;
  sm?: string;
  sn?: string;
  so?: string;
  sr?: string;
  ss?: string;
  st?: string;
  sv?: string;
  sx?: string;
  sy?: string;
  sz?: string;
  tc?: string;
  td?: string;
  tf?: string;
  tg?: string;
  th?: string;
  tj?: string;
  tk?: string;
  tl?: string;
  tm?: string;
  tn?: string;
  to?: string;
  tr?: string;
  tt?: string;
  tv?: string;
  tw?: string;
  tz?: string;
  ua?: string;
  ug?: string;
  um?: string;
  us?: string;
  uy?: string;
  uz?: string;
  va?: string;
  vc?: string;
  ve?: string;
  vg?: string;
  vi?: string;
  vn?: string;
  vu?: string;
  wf?: string;
  ws?: string;
  xk?: string;
  ye?: string;
  yt?: string;
  za?: string;
  zm?: string;
  zw?: string;
}

export interface Tag {
  /**
   * The color of the tag.
   */
  color: Color;
  /**
   * The unique ID of the tag.
   */
  id: string;
  /**
   * The name of the tag.
   */
  name: string;
  [property: string]: any;
}

/**
 * The color of the tag.
 */
export type Color = "red" | "yellow" | "green" | "blue" | "purple" | "pink" | "brown";

export interface DomainSchema {
  /**
   * Whether the domain is archived.
   */
  archived: boolean;
  /**
   * The date the domain was created.
   */
  createdAt: string;
  /**
   * The URL to redirect to when a link under this domain has expired.
   */
  expiredURL: string;
  /**
   * The unique identifier of the domain.
   */
  id: string;
  /**
   * The logo of the domain.
   */
  logo: string;
  /**
   * The URL to redirect to when a link under this domain doesn't exist.
   */
  notFoundURL: string;
  /**
   * Provide context to your teammates in the link creation modal by showing them an example
   * of a link to be shortened.
   */
  placeholder: string;
  /**
   * Whether the domain is the primary domain for the workspace.
   */
  primary: boolean;
  /**
   * The registered domain record.
   */
  registeredDomain: RegisteredDomain;
  /**
   * The domain name.
   */
  slug: string;
  /**
   * The date the domain was last updated.
   */
  updatedAt: string;
  /**
   * Whether the domain is verified.
   */
  verified: boolean;
  [property: string]: any;
}

/**
 * The registered domain record.
 */
export interface RegisteredDomain {
  /**
   * The date the domain was created.
   */
  createdAt: string;
  /**
   * The date the domain expires.
   */
  expiresAt: string;
  /**
   * The ID of the registered domain record.
   */
  id: string;
  [property: string]: any;
}

/**
 * Triggered when a lead is created.
 */
export interface LeadCreatedEvent {
  createdAt: string;
  data:      LeadCreatedEventData;
  event:     LeadCreatedEventEvent;
  id:        string;
  [property: string]: any;
}

export interface LeadCreatedEventData {
  click:     PurpleClick;
  customer:  PurpleCustomer;
  eventName: string;
  link:      FluffyLink;
  [property: string]: any;
}

export interface PurpleClick {
  browser:    string;
  city:       string;
  continent:  string;
  country:    string;
  device:     string;
  id:         string;
  ip:         string;
  os:         string;
  qr?:        boolean;
  referer:    string;
  refererURL: string;
  region:     string;
  url:        string;
  [property: string]: any;
}

export interface PurpleCustomer {
  /**
   * Avatar URL of the customer.
   */
  avatar?: string;
  /**
   * Country of the customer.
   */
  country?: string;
  /**
   * The date the customer was created.
   */
  createdAt: string;
  discount?: PurpleDiscount;
  /**
   * Email of the customer.
   */
  email?: string;
  /**
   * Unique identifier for the customer in the client's app.
   */
  externalID: string;
  /**
   * The unique identifier of the customer in Dub.
   */
  id:    string;
  link?: PurpleLink;
  /**
   * Name of the customer.
   */
  name:     string;
  partner?: PurplePartner;
  [property: string]: any;
}

export interface PurpleDiscount {
  amount:       number;
  couponID:     string;
  couponTestID: string;
  duration:     number;
  id:           string;
  interval:     Interval;
  type:         Type;
  [property: string]: any;
}

export type Interval = "month" | "year";

export type Type = "percentage" | "flat";

export interface PurpleLink {
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain: string;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  [property: string]: any;
}

export interface PurplePartner {
  email:  string;
  id:     string;
  image?: string;
  name:   string;
  [property: string]: any;
}

export interface FluffyLink {
  /**
   * The Android destination URL for the short link for Android device targeting.
   */
  android:   string;
  archived?: boolean;
  /**
   * The number of clicks on the short link.
   */
  clicks: number;
  /**
   * The comments for the short link.
   */
  comments:  string;
  createdAt: string;
  /**
   * The description of the short link generated via `api.dub.co/metatags`. Will be used for
   * Custom Social Media Cards if `proxy` is true.
   */
  description: string;
  doIndex?:    boolean;
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain:     string;
  expiredURL: string;
  expiresAt:  string;
  /**
   * This is the ID of the link in your database that is unique across your workspace. If set,
   * it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
   * when passed as a query parameter.
   */
  externalID: string;
  /**
   * Geo targeting information for the short link in JSON format `{[COUNTRY]:
   * https://example.com }`. Learn more: https://d.to/geo
   */
  geo: FluffyGeo;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  image: string;
  /**
   * The iOS destination URL for the short link for iOS device targeting.
   */
  ios: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key:         string;
  lastClicked: string;
  /**
   * [BETA]: The number of leads the short links has generated.
   */
  leads: number;
  /**
   * The password required to access the destination URL of the short link.
   */
  password: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The project ID of the short link. This field is deprecated – use `workspaceId` instead.
   */
  projectID:    string;
  proxy?:       boolean;
  publicStats?: boolean;
  /**
   * The full URL of the QR code for the short link (e.g.
   * `https://api.dub.co/qr?url=https://dub.sh/try`).
   */
  qrCode:   string;
  rewrite?: boolean;
  /**
   * [BETA]: The total dollar amount of sales the short links has generated (in cents).
   */
  saleAmount: number;
  /**
   * [BETA]: The number of sales the short links has generated.
   */
  sales: number;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  /**
   * The unique ID of the tag assigned to the short link. This field is deprecated – use
   * `tags` instead.
   */
  tagID: string;
  /**
   * The tags assigned to the short link.
   */
  tags: Tag[];
  /**
   * The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  title:            string;
  trackConversion?: boolean;
  updatedAt:        string;
  url:              string;
  userID:           string;
  /**
   * The UTM campaign of the short link.
   */
  utmCampaign: string;
  /**
   * The UTM content of the short link.
   */
  utmContent: string;
  /**
   * The UTM medium of the short link.
   */
  utmMedium: string;
  /**
   * The UTM source of the short link.
   */
  utmSource: string;
  /**
   * The UTM term of the short link.
   */
  utmTerm: string;
  /**
   * The custom link preview video (og:video). Will be used for Custom Social Media Cards if
   * `proxy` is true. Learn more: https://d.to/og
   */
  video: string;
  /**
   * The IDs of the webhooks that the short link is associated with.
   */
  webhookIDS: string[];
  /**
   * The workspace ID of the short link.
   */
  workspaceID: string;
  [property: string]: any;
}

/**
 * Geo targeting information for the short link in JSON format `{[COUNTRY]:
 * https://example.com }`. Learn more: https://d.to/geo
 */
export interface FluffyGeo {
  ad?: string;
  ae?: string;
  af?: string;
  ag?: string;
  ai?: string;
  al?: string;
  am?: string;
  ao?: string;
  aq?: string;
  ar?: string;
  as?: string;
  at?: string;
  au?: string;
  aw?: string;
  ax?: string;
  az?: string;
  ba?: string;
  bb?: string;
  bd?: string;
  be?: string;
  bf?: string;
  bg?: string;
  bh?: string;
  bi?: string;
  bj?: string;
  bl?: string;
  bm?: string;
  bn?: string;
  bo?: string;
  bq?: string;
  br?: string;
  bs?: string;
  bt?: string;
  bv?: string;
  bw?: string;
  by?: string;
  bz?: string;
  ca?: string;
  cc?: string;
  cd?: string;
  cf?: string;
  cg?: string;
  ch?: string;
  ci?: string;
  ck?: string;
  cl?: string;
  cm?: string;
  cn?: string;
  co?: string;
  cr?: string;
  cu?: string;
  cv?: string;
  cw?: string;
  cx?: string;
  cy?: string;
  cz?: string;
  de?: string;
  dj?: string;
  dk?: string;
  dm?: string;
  do?: string;
  dz?: string;
  ec?: string;
  ee?: string;
  eg?: string;
  eh?: string;
  er?: string;
  es?: string;
  et?: string;
  fi?: string;
  fj?: string;
  fk?: string;
  fm?: string;
  fo?: string;
  fr?: string;
  ga?: string;
  gb?: string;
  gd?: string;
  ge?: string;
  gf?: string;
  gg?: string;
  gh?: string;
  gi?: string;
  gl?: string;
  gm?: string;
  gn?: string;
  gp?: string;
  gq?: string;
  gr?: string;
  gs?: string;
  gt?: string;
  gu?: string;
  gw?: string;
  gy?: string;
  hk?: string;
  hm?: string;
  hn?: string;
  hr?: string;
  ht?: string;
  hu?: string;
  id?: string;
  ie?: string;
  il?: string;
  im?: string;
  in?: string;
  io?: string;
  iq?: string;
  ir?: string;
  is?: string;
  it?: string;
  je?: string;
  jm?: string;
  jo?: string;
  jp?: string;
  ke?: string;
  kg?: string;
  kh?: string;
  ki?: string;
  km?: string;
  kn?: string;
  kp?: string;
  kr?: string;
  kw?: string;
  ky?: string;
  kz?: string;
  la?: string;
  lb?: string;
  lc?: string;
  li?: string;
  lk?: string;
  lr?: string;
  ls?: string;
  lt?: string;
  lu?: string;
  lv?: string;
  ly?: string;
  ma?: string;
  mc?: string;
  md?: string;
  me?: string;
  mf?: string;
  mg?: string;
  mh?: string;
  mk?: string;
  ml?: string;
  mm?: string;
  mn?: string;
  mo?: string;
  mp?: string;
  mq?: string;
  mr?: string;
  ms?: string;
  mt?: string;
  mu?: string;
  mv?: string;
  mw?: string;
  mx?: string;
  my?: string;
  mz?: string;
  na?: string;
  nc?: string;
  ne?: string;
  nf?: string;
  ng?: string;
  ni?: string;
  nl?: string;
  no?: string;
  np?: string;
  nr?: string;
  nu?: string;
  nz?: string;
  om?: string;
  pa?: string;
  pe?: string;
  pf?: string;
  pg?: string;
  ph?: string;
  pk?: string;
  pl?: string;
  pm?: string;
  pn?: string;
  pr?: string;
  ps?: string;
  pt?: string;
  pw?: string;
  py?: string;
  qa?: string;
  re?: string;
  ro?: string;
  rs?: string;
  ru?: string;
  rw?: string;
  sa?: string;
  sb?: string;
  sc?: string;
  sd?: string;
  se?: string;
  sg?: string;
  sh?: string;
  si?: string;
  sj?: string;
  sk?: string;
  sl?: string;
  sm?: string;
  sn?: string;
  so?: string;
  sr?: string;
  ss?: string;
  st?: string;
  sv?: string;
  sx?: string;
  sy?: string;
  sz?: string;
  tc?: string;
  td?: string;
  tf?: string;
  tg?: string;
  th?: string;
  tj?: string;
  tk?: string;
  tl?: string;
  tm?: string;
  tn?: string;
  to?: string;
  tr?: string;
  tt?: string;
  tv?: string;
  tw?: string;
  tz?: string;
  ua?: string;
  ug?: string;
  um?: string;
  us?: string;
  uy?: string;
  uz?: string;
  va?: string;
  vc?: string;
  ve?: string;
  vg?: string;
  vi?: string;
  vn?: string;
  vu?: string;
  wf?: string;
  ws?: string;
  xk?: string;
  ye?: string;
  yt?: string;
  za?: string;
  zm?: string;
  zw?: string;
}

export type LeadCreatedEventEvent = "lead.created";

export interface LeadEvent {
  /**
   * Deprecated. Use `click.browser` instead.
   */
  browser: string;
  /**
   * Deprecated. Use `click.city` instead.
   */
  city:  string;
  click: LeadEventClick;
  /**
   * Deprecated. Use `click.id` instead.
   */
  clickID: string;
  /**
   * Deprecated. Use `click.continent` instead.
   */
  continent: string;
  /**
   * Deprecated. Use `click.country` instead.
   */
  country:  string;
  customer: LeadEventCustomer;
  /**
   * Deprecated. Use `click.device` instead.
   */
  device: string;
  /**
   * Deprecated. Use `link.domain` instead.
   */
  domain:    string;
  event:     LeadEventEvent;
  eventID:   string;
  eventName: string;
  /**
   * Deprecated. Use `click.ip` instead.
   */
  ip: string;
  /**
   * Deprecated. Use `link.key` instead.
   */
  key:  string;
  link: LeadEventLink;
  /**
   * Deprecated. Use `link.id` instead.
   */
  linkID: string;
  /**
   * Deprecated. Use `click.os` instead.
   */
  os: string;
  /**
   * Deprecated. Use `click.qr` instead.
   */
  qr:         number;
  timestamp?: string;
  /**
   * Deprecated. Use `click.url` instead.
   */
  url: string;
  [property: string]: any;
}

export interface LeadEventClick {
  browser:    string;
  city:       string;
  continent:  string;
  country:    string;
  device:     string;
  id:         string;
  ip:         string;
  os:         string;
  qr?:        boolean;
  referer:    string;
  refererURL: string;
  region:     string;
  url:        string;
  [property: string]: any;
}

export interface LeadEventCustomer {
  /**
   * Avatar URL of the customer.
   */
  avatar?: string;
  /**
   * Country of the customer.
   */
  country?: string;
  /**
   * The date the customer was created.
   */
  createdAt: string;
  discount?: FluffyDiscount;
  /**
   * Email of the customer.
   */
  email?: string;
  /**
   * Unique identifier for the customer in the client's app.
   */
  externalID: string;
  /**
   * The unique identifier of the customer in Dub.
   */
  id:    string;
  link?: TentacledLink;
  /**
   * Name of the customer.
   */
  name:     string;
  partner?: FluffyPartner;
  [property: string]: any;
}

export interface FluffyDiscount {
  amount:       number;
  couponID:     string;
  couponTestID: string;
  duration:     number;
  id:           string;
  interval:     Interval;
  type:         Type;
  [property: string]: any;
}

export interface TentacledLink {
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain: string;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  [property: string]: any;
}

export interface FluffyPartner {
  email:  string;
  id:     string;
  image?: string;
  name:   string;
  [property: string]: any;
}

export type LeadEventEvent = "lead";

export interface LeadEventLink {
  /**
   * The Android destination URL for the short link for Android device targeting.
   */
  android:   string;
  archived?: boolean;
  /**
   * The number of clicks on the short link.
   */
  clicks: number;
  /**
   * The comments for the short link.
   */
  comments:  string;
  createdAt: string;
  /**
   * The description of the short link generated via `api.dub.co/metatags`. Will be used for
   * Custom Social Media Cards if `proxy` is true.
   */
  description: string;
  doIndex?:    boolean;
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain:     string;
  expiredURL: string;
  expiresAt:  string;
  /**
   * This is the ID of the link in your database that is unique across your workspace. If set,
   * it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
   * when passed as a query parameter.
   */
  externalID: string;
  /**
   * Geo targeting information for the short link in JSON format `{[COUNTRY]:
   * https://example.com }`. Learn more: https://d.to/geo
   */
  geo: TentacledGeo;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  image: string;
  /**
   * The iOS destination URL for the short link for iOS device targeting.
   */
  ios: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key:         string;
  lastClicked: string;
  /**
   * [BETA]: The number of leads the short links has generated.
   */
  leads: number;
  /**
   * The password required to access the destination URL of the short link.
   */
  password: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The project ID of the short link. This field is deprecated – use `workspaceId` instead.
   */
  projectID:    string;
  proxy?:       boolean;
  publicStats?: boolean;
  /**
   * The full URL of the QR code for the short link (e.g.
   * `https://api.dub.co/qr?url=https://dub.sh/try`).
   */
  qrCode:   string;
  rewrite?: boolean;
  /**
   * [BETA]: The total dollar amount of sales the short links has generated (in cents).
   */
  saleAmount: number;
  /**
   * [BETA]: The number of sales the short links has generated.
   */
  sales: number;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  /**
   * The unique ID of the tag assigned to the short link. This field is deprecated – use
   * `tags` instead.
   */
  tagID: string;
  /**
   * The tags assigned to the short link.
   */
  tags: Tag[];
  /**
   * The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  title:            string;
  trackConversion?: boolean;
  updatedAt:        string;
  url:              string;
  userID:           string;
  /**
   * The UTM campaign of the short link.
   */
  utmCampaign: string;
  /**
   * The UTM content of the short link.
   */
  utmContent: string;
  /**
   * The UTM medium of the short link.
   */
  utmMedium: string;
  /**
   * The UTM source of the short link.
   */
  utmSource: string;
  /**
   * The UTM term of the short link.
   */
  utmTerm: string;
  /**
   * The custom link preview video (og:video). Will be used for Custom Social Media Cards if
   * `proxy` is true. Learn more: https://d.to/og
   */
  video: string;
  /**
   * The IDs of the webhooks that the short link is associated with.
   */
  webhookIDS: string[];
  /**
   * The workspace ID of the short link.
   */
  workspaceID: string;
  [property: string]: any;
}

/**
 * Geo targeting information for the short link in JSON format `{[COUNTRY]:
 * https://example.com }`. Learn more: https://d.to/geo
 */
export interface TentacledGeo {
  ad?: string;
  ae?: string;
  af?: string;
  ag?: string;
  ai?: string;
  al?: string;
  am?: string;
  ao?: string;
  aq?: string;
  ar?: string;
  as?: string;
  at?: string;
  au?: string;
  aw?: string;
  ax?: string;
  az?: string;
  ba?: string;
  bb?: string;
  bd?: string;
  be?: string;
  bf?: string;
  bg?: string;
  bh?: string;
  bi?: string;
  bj?: string;
  bl?: string;
  bm?: string;
  bn?: string;
  bo?: string;
  bq?: string;
  br?: string;
  bs?: string;
  bt?: string;
  bv?: string;
  bw?: string;
  by?: string;
  bz?: string;
  ca?: string;
  cc?: string;
  cd?: string;
  cf?: string;
  cg?: string;
  ch?: string;
  ci?: string;
  ck?: string;
  cl?: string;
  cm?: string;
  cn?: string;
  co?: string;
  cr?: string;
  cu?: string;
  cv?: string;
  cw?: string;
  cx?: string;
  cy?: string;
  cz?: string;
  de?: string;
  dj?: string;
  dk?: string;
  dm?: string;
  do?: string;
  dz?: string;
  ec?: string;
  ee?: string;
  eg?: string;
  eh?: string;
  er?: string;
  es?: string;
  et?: string;
  fi?: string;
  fj?: string;
  fk?: string;
  fm?: string;
  fo?: string;
  fr?: string;
  ga?: string;
  gb?: string;
  gd?: string;
  ge?: string;
  gf?: string;
  gg?: string;
  gh?: string;
  gi?: string;
  gl?: string;
  gm?: string;
  gn?: string;
  gp?: string;
  gq?: string;
  gr?: string;
  gs?: string;
  gt?: string;
  gu?: string;
  gw?: string;
  gy?: string;
  hk?: string;
  hm?: string;
  hn?: string;
  hr?: string;
  ht?: string;
  hu?: string;
  id?: string;
  ie?: string;
  il?: string;
  im?: string;
  in?: string;
  io?: string;
  iq?: string;
  ir?: string;
  is?: string;
  it?: string;
  je?: string;
  jm?: string;
  jo?: string;
  jp?: string;
  ke?: string;
  kg?: string;
  kh?: string;
  ki?: string;
  km?: string;
  kn?: string;
  kp?: string;
  kr?: string;
  kw?: string;
  ky?: string;
  kz?: string;
  la?: string;
  lb?: string;
  lc?: string;
  li?: string;
  lk?: string;
  lr?: string;
  ls?: string;
  lt?: string;
  lu?: string;
  lv?: string;
  ly?: string;
  ma?: string;
  mc?: string;
  md?: string;
  me?: string;
  mf?: string;
  mg?: string;
  mh?: string;
  mk?: string;
  ml?: string;
  mm?: string;
  mn?: string;
  mo?: string;
  mp?: string;
  mq?: string;
  mr?: string;
  ms?: string;
  mt?: string;
  mu?: string;
  mv?: string;
  mw?: string;
  mx?: string;
  my?: string;
  mz?: string;
  na?: string;
  nc?: string;
  ne?: string;
  nf?: string;
  ng?: string;
  ni?: string;
  nl?: string;
  no?: string;
  np?: string;
  nr?: string;
  nu?: string;
  nz?: string;
  om?: string;
  pa?: string;
  pe?: string;
  pf?: string;
  pg?: string;
  ph?: string;
  pk?: string;
  pl?: string;
  pm?: string;
  pn?: string;
  pr?: string;
  ps?: string;
  pt?: string;
  pw?: string;
  py?: string;
  qa?: string;
  re?: string;
  ro?: string;
  rs?: string;
  ru?: string;
  rw?: string;
  sa?: string;
  sb?: string;
  sc?: string;
  sd?: string;
  se?: string;
  sg?: string;
  sh?: string;
  si?: string;
  sj?: string;
  sk?: string;
  sl?: string;
  sm?: string;
  sn?: string;
  so?: string;
  sr?: string;
  ss?: string;
  st?: string;
  sv?: string;
  sx?: string;
  sy?: string;
  sz?: string;
  tc?: string;
  td?: string;
  tf?: string;
  tg?: string;
  th?: string;
  tj?: string;
  tk?: string;
  tl?: string;
  tm?: string;
  tn?: string;
  to?: string;
  tr?: string;
  tt?: string;
  tv?: string;
  tw?: string;
  tz?: string;
  ua?: string;
  ug?: string;
  um?: string;
  us?: string;
  uy?: string;
  uz?: string;
  va?: string;
  vc?: string;
  ve?: string;
  vg?: string;
  vi?: string;
  vn?: string;
  vu?: string;
  wf?: string;
  ws?: string;
  xk?: string;
  ye?: string;
  yt?: string;
  za?: string;
  zm?: string;
  zw?: string;
}

/**
 * Triggered when a link is clicked.
 */
export interface LinkClickedEvent {
  createdAt: string;
  data:      LinkClickedEventData;
  event:     LinkClickedEventEvent;
  id:        string;
  [property: string]: any;
}

export interface LinkClickedEventData {
  click: FluffyClick;
  link:  StickyLink;
  [property: string]: any;
}

export interface FluffyClick {
  browser:    string;
  city:       string;
  continent:  string;
  country:    string;
  device:     string;
  id:         string;
  ip:         string;
  os:         string;
  qr?:        boolean;
  referer:    string;
  refererURL: string;
  region:     string;
  url:        string;
  [property: string]: any;
}

export interface StickyLink {
  /**
   * The Android destination URL for the short link for Android device targeting.
   */
  android:   string;
  archived?: boolean;
  /**
   * The number of clicks on the short link.
   */
  clicks: number;
  /**
   * The comments for the short link.
   */
  comments:  string;
  createdAt: string;
  /**
   * The description of the short link generated via `api.dub.co/metatags`. Will be used for
   * Custom Social Media Cards if `proxy` is true.
   */
  description: string;
  doIndex?:    boolean;
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain:     string;
  expiredURL: string;
  expiresAt:  string;
  /**
   * This is the ID of the link in your database that is unique across your workspace. If set,
   * it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
   * when passed as a query parameter.
   */
  externalID: string;
  /**
   * Geo targeting information for the short link in JSON format `{[COUNTRY]:
   * https://example.com }`. Learn more: https://d.to/geo
   */
  geo: StickyGeo;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  image: string;
  /**
   * The iOS destination URL for the short link for iOS device targeting.
   */
  ios: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key:         string;
  lastClicked: string;
  /**
   * [BETA]: The number of leads the short links has generated.
   */
  leads: number;
  /**
   * The password required to access the destination URL of the short link.
   */
  password: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The project ID of the short link. This field is deprecated – use `workspaceId` instead.
   */
  projectID:    string;
  proxy?:       boolean;
  publicStats?: boolean;
  /**
   * The full URL of the QR code for the short link (e.g.
   * `https://api.dub.co/qr?url=https://dub.sh/try`).
   */
  qrCode:   string;
  rewrite?: boolean;
  /**
   * [BETA]: The total dollar amount of sales the short links has generated (in cents).
   */
  saleAmount: number;
  /**
   * [BETA]: The number of sales the short links has generated.
   */
  sales: number;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  /**
   * The unique ID of the tag assigned to the short link. This field is deprecated – use
   * `tags` instead.
   */
  tagID: string;
  /**
   * The tags assigned to the short link.
   */
  tags: Tag[];
  /**
   * The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  title:            string;
  trackConversion?: boolean;
  updatedAt:        string;
  url:              string;
  userID:           string;
  /**
   * The UTM campaign of the short link.
   */
  utmCampaign: string;
  /**
   * The UTM content of the short link.
   */
  utmContent: string;
  /**
   * The UTM medium of the short link.
   */
  utmMedium: string;
  /**
   * The UTM source of the short link.
   */
  utmSource: string;
  /**
   * The UTM term of the short link.
   */
  utmTerm: string;
  /**
   * The custom link preview video (og:video). Will be used for Custom Social Media Cards if
   * `proxy` is true. Learn more: https://d.to/og
   */
  video: string;
  /**
   * The IDs of the webhooks that the short link is associated with.
   */
  webhookIDS: string[];
  /**
   * The workspace ID of the short link.
   */
  workspaceID: string;
  [property: string]: any;
}

/**
 * Geo targeting information for the short link in JSON format `{[COUNTRY]:
 * https://example.com }`. Learn more: https://d.to/geo
 */
export interface StickyGeo {
  ad?: string;
  ae?: string;
  af?: string;
  ag?: string;
  ai?: string;
  al?: string;
  am?: string;
  ao?: string;
  aq?: string;
  ar?: string;
  as?: string;
  at?: string;
  au?: string;
  aw?: string;
  ax?: string;
  az?: string;
  ba?: string;
  bb?: string;
  bd?: string;
  be?: string;
  bf?: string;
  bg?: string;
  bh?: string;
  bi?: string;
  bj?: string;
  bl?: string;
  bm?: string;
  bn?: string;
  bo?: string;
  bq?: string;
  br?: string;
  bs?: string;
  bt?: string;
  bv?: string;
  bw?: string;
  by?: string;
  bz?: string;
  ca?: string;
  cc?: string;
  cd?: string;
  cf?: string;
  cg?: string;
  ch?: string;
  ci?: string;
  ck?: string;
  cl?: string;
  cm?: string;
  cn?: string;
  co?: string;
  cr?: string;
  cu?: string;
  cv?: string;
  cw?: string;
  cx?: string;
  cy?: string;
  cz?: string;
  de?: string;
  dj?: string;
  dk?: string;
  dm?: string;
  do?: string;
  dz?: string;
  ec?: string;
  ee?: string;
  eg?: string;
  eh?: string;
  er?: string;
  es?: string;
  et?: string;
  fi?: string;
  fj?: string;
  fk?: string;
  fm?: string;
  fo?: string;
  fr?: string;
  ga?: string;
  gb?: string;
  gd?: string;
  ge?: string;
  gf?: string;
  gg?: string;
  gh?: string;
  gi?: string;
  gl?: string;
  gm?: string;
  gn?: string;
  gp?: string;
  gq?: string;
  gr?: string;
  gs?: string;
  gt?: string;
  gu?: string;
  gw?: string;
  gy?: string;
  hk?: string;
  hm?: string;
  hn?: string;
  hr?: string;
  ht?: string;
  hu?: string;
  id?: string;
  ie?: string;
  il?: string;
  im?: string;
  in?: string;
  io?: string;
  iq?: string;
  ir?: string;
  is?: string;
  it?: string;
  je?: string;
  jm?: string;
  jo?: string;
  jp?: string;
  ke?: string;
  kg?: string;
  kh?: string;
  ki?: string;
  km?: string;
  kn?: string;
  kp?: string;
  kr?: string;
  kw?: string;
  ky?: string;
  kz?: string;
  la?: string;
  lb?: string;
  lc?: string;
  li?: string;
  lk?: string;
  lr?: string;
  ls?: string;
  lt?: string;
  lu?: string;
  lv?: string;
  ly?: string;
  ma?: string;
  mc?: string;
  md?: string;
  me?: string;
  mf?: string;
  mg?: string;
  mh?: string;
  mk?: string;
  ml?: string;
  mm?: string;
  mn?: string;
  mo?: string;
  mp?: string;
  mq?: string;
  mr?: string;
  ms?: string;
  mt?: string;
  mu?: string;
  mv?: string;
  mw?: string;
  mx?: string;
  my?: string;
  mz?: string;
  na?: string;
  nc?: string;
  ne?: string;
  nf?: string;
  ng?: string;
  ni?: string;
  nl?: string;
  no?: string;
  np?: string;
  nr?: string;
  nu?: string;
  nz?: string;
  om?: string;
  pa?: string;
  pe?: string;
  pf?: string;
  pg?: string;
  ph?: string;
  pk?: string;
  pl?: string;
  pm?: string;
  pn?: string;
  pr?: string;
  ps?: string;
  pt?: string;
  pw?: string;
  py?: string;
  qa?: string;
  re?: string;
  ro?: string;
  rs?: string;
  ru?: string;
  rw?: string;
  sa?: string;
  sb?: string;
  sc?: string;
  sd?: string;
  se?: string;
  sg?: string;
  sh?: string;
  si?: string;
  sj?: string;
  sk?: string;
  sl?: string;
  sm?: string;
  sn?: string;
  so?: string;
  sr?: string;
  ss?: string;
  st?: string;
  sv?: string;
  sx?: string;
  sy?: string;
  sz?: string;
  tc?: string;
  td?: string;
  tf?: string;
  tg?: string;
  th?: string;
  tj?: string;
  tk?: string;
  tl?: string;
  tm?: string;
  tn?: string;
  to?: string;
  tr?: string;
  tt?: string;
  tv?: string;
  tw?: string;
  tz?: string;
  ua?: string;
  ug?: string;
  um?: string;
  us?: string;
  uy?: string;
  uz?: string;
  va?: string;
  vc?: string;
  ve?: string;
  vg?: string;
  vi?: string;
  vn?: string;
  vu?: string;
  wf?: string;
  ws?: string;
  xk?: string;
  ye?: string;
  yt?: string;
  za?: string;
  zm?: string;
  zw?: string;
}

export type LinkClickedEventEvent = "link.clicked";

export interface Link {
  /**
   * The Android destination URL for the short link for Android device targeting.
   */
  android: string;
  /**
   * Whether the short link is archived.
   */
  archived: boolean;
  /**
   * The number of clicks on the short link.
   */
  clicks: number;
  /**
   * The comments for the short link.
   */
  comments: string;
  /**
   * The date and time when the short link was created.
   */
  createdAt: string;
  /**
   * The description of the short link generated via `api.dub.co/metatags`. Will be used for
   * Custom Social Media Cards if `proxy` is true.
   */
  description: string;
  /**
   * Whether to allow search engines to index the short link.
   */
  doIndex: boolean;
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain: string;
  /**
   * The URL to redirect to when the short link has expired.
   */
  expiredURL: string;
  /**
   * The date and time when the short link will expire in ISO-8601 format.
   */
  expiresAt: string;
  /**
   * This is the ID of the link in your database that is unique across your workspace. If set,
   * it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
   * when passed as a query parameter.
   */
  externalID: string;
  /**
   * Geo targeting information for the short link in JSON format `{[COUNTRY]:
   * https://example.com }`. Learn more: https://d.to/geo
   */
  geo: LinkSchemaGeo;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  image: string;
  /**
   * The iOS destination URL for the short link for iOS device targeting.
   */
  ios: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key: string;
  /**
   * The date and time when the short link was last clicked.
   */
  lastClicked: string;
  /**
   * [BETA]: The number of leads the short links has generated.
   */
  leads: number;
  /**
   * The password required to access the destination URL of the short link.
   */
  password: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The project ID of the short link. This field is deprecated – use `workspaceId` instead.
   */
  projectID: string;
  /**
   * Whether the short link uses Custom Social Media Cards feature.
   */
  proxy: boolean;
  /**
   * Whether the short link's stats are publicly accessible.
   */
  publicStats: boolean;
  /**
   * The full URL of the QR code for the short link (e.g.
   * `https://api.dub.co/qr?url=https://dub.sh/try`).
   */
  qrCode: string;
  /**
   * Whether the short link uses link cloaking.
   */
  rewrite: boolean;
  /**
   * [BETA]: The total dollar amount of sales the short links has generated (in cents).
   */
  saleAmount: number;
  /**
   * [BETA]: The number of sales the short links has generated.
   */
  sales: number;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  /**
   * The unique ID of the tag assigned to the short link. This field is deprecated – use
   * `tags` instead.
   */
  tagID: string;
  /**
   * The tags assigned to the short link.
   */
  tags: Tag[];
  /**
   * The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  title: string;
  /**
   * [BETA] Whether to track conversions for the short link.
   */
  trackConversion: boolean;
  /**
   * The date and time when the short link was last updated.
   */
  updatedAt: string;
  /**
   * The destination URL of the short link.
   */
  url: string;
  /**
   * The user ID of the creator of the short link.
   */
  userID: string;
  /**
   * The UTM campaign of the short link.
   */
  utmCampaign: string;
  /**
   * The UTM content of the short link.
   */
  utmContent: string;
  /**
   * The UTM medium of the short link.
   */
  utmMedium: string;
  /**
   * The UTM source of the short link.
   */
  utmSource: string;
  /**
   * The UTM term of the short link.
   */
  utmTerm: string;
  /**
   * The custom link preview video (og:video). Will be used for Custom Social Media Cards if
   * `proxy` is true. Learn more: https://d.to/og
   */
  video: string;
  /**
   * The IDs of the webhooks that the short link is associated with.
   */
  webhookIDS: string[];
  /**
   * The workspace ID of the short link.
   */
  workspaceID: string;
  [property: string]: any;
}

/**
 * Geo targeting information for the short link in JSON format `{[COUNTRY]:
 * https://example.com }`. Learn more: https://d.to/geo
 */
export interface LinkSchemaGeo {
  ad?: string;
  ae?: string;
  af?: string;
  ag?: string;
  ai?: string;
  al?: string;
  am?: string;
  ao?: string;
  aq?: string;
  ar?: string;
  as?: string;
  at?: string;
  au?: string;
  aw?: string;
  ax?: string;
  az?: string;
  ba?: string;
  bb?: string;
  bd?: string;
  be?: string;
  bf?: string;
  bg?: string;
  bh?: string;
  bi?: string;
  bj?: string;
  bl?: string;
  bm?: string;
  bn?: string;
  bo?: string;
  bq?: string;
  br?: string;
  bs?: string;
  bt?: string;
  bv?: string;
  bw?: string;
  by?: string;
  bz?: string;
  ca?: string;
  cc?: string;
  cd?: string;
  cf?: string;
  cg?: string;
  ch?: string;
  ci?: string;
  ck?: string;
  cl?: string;
  cm?: string;
  cn?: string;
  co?: string;
  cr?: string;
  cu?: string;
  cv?: string;
  cw?: string;
  cx?: string;
  cy?: string;
  cz?: string;
  de?: string;
  dj?: string;
  dk?: string;
  dm?: string;
  do?: string;
  dz?: string;
  ec?: string;
  ee?: string;
  eg?: string;
  eh?: string;
  er?: string;
  es?: string;
  et?: string;
  fi?: string;
  fj?: string;
  fk?: string;
  fm?: string;
  fo?: string;
  fr?: string;
  ga?: string;
  gb?: string;
  gd?: string;
  ge?: string;
  gf?: string;
  gg?: string;
  gh?: string;
  gi?: string;
  gl?: string;
  gm?: string;
  gn?: string;
  gp?: string;
  gq?: string;
  gr?: string;
  gs?: string;
  gt?: string;
  gu?: string;
  gw?: string;
  gy?: string;
  hk?: string;
  hm?: string;
  hn?: string;
  hr?: string;
  ht?: string;
  hu?: string;
  id?: string;
  ie?: string;
  il?: string;
  im?: string;
  in?: string;
  io?: string;
  iq?: string;
  ir?: string;
  is?: string;
  it?: string;
  je?: string;
  jm?: string;
  jo?: string;
  jp?: string;
  ke?: string;
  kg?: string;
  kh?: string;
  ki?: string;
  km?: string;
  kn?: string;
  kp?: string;
  kr?: string;
  kw?: string;
  ky?: string;
  kz?: string;
  la?: string;
  lb?: string;
  lc?: string;
  li?: string;
  lk?: string;
  lr?: string;
  ls?: string;
  lt?: string;
  lu?: string;
  lv?: string;
  ly?: string;
  ma?: string;
  mc?: string;
  md?: string;
  me?: string;
  mf?: string;
  mg?: string;
  mh?: string;
  mk?: string;
  ml?: string;
  mm?: string;
  mn?: string;
  mo?: string;
  mp?: string;
  mq?: string;
  mr?: string;
  ms?: string;
  mt?: string;
  mu?: string;
  mv?: string;
  mw?: string;
  mx?: string;
  my?: string;
  mz?: string;
  na?: string;
  nc?: string;
  ne?: string;
  nf?: string;
  ng?: string;
  ni?: string;
  nl?: string;
  no?: string;
  np?: string;
  nr?: string;
  nu?: string;
  nz?: string;
  om?: string;
  pa?: string;
  pe?: string;
  pf?: string;
  pg?: string;
  ph?: string;
  pk?: string;
  pl?: string;
  pm?: string;
  pn?: string;
  pr?: string;
  ps?: string;
  pt?: string;
  pw?: string;
  py?: string;
  qa?: string;
  re?: string;
  ro?: string;
  rs?: string;
  ru?: string;
  rw?: string;
  sa?: string;
  sb?: string;
  sc?: string;
  sd?: string;
  se?: string;
  sg?: string;
  sh?: string;
  si?: string;
  sj?: string;
  sk?: string;
  sl?: string;
  sm?: string;
  sn?: string;
  so?: string;
  sr?: string;
  ss?: string;
  st?: string;
  sv?: string;
  sx?: string;
  sy?: string;
  sz?: string;
  tc?: string;
  td?: string;
  tf?: string;
  tg?: string;
  th?: string;
  tj?: string;
  tk?: string;
  tl?: string;
  tm?: string;
  tn?: string;
  to?: string;
  tr?: string;
  tt?: string;
  tv?: string;
  tw?: string;
  tz?: string;
  ua?: string;
  ug?: string;
  um?: string;
  us?: string;
  uy?: string;
  uz?: string;
  va?: string;
  vc?: string;
  ve?: string;
  vg?: string;
  vi?: string;
  vn?: string;
  vu?: string;
  wf?: string;
  ws?: string;
  xk?: string;
  ye?: string;
  yt?: string;
  za?: string;
  zm?: string;
  zw?: string;
}

/**
 * Triggered when a link is created, updated, or deleted.
 */
export interface LinkWebhookEvent {
  createdAt: string;
  data:      LinkWebhookEventData;
  event:     LinkWebhookEventEvent;
  id:        string;
  [property: string]: any;
}

export interface LinkWebhookEventData {
  /**
   * The Android destination URL for the short link for Android device targeting.
   */
  android:   string;
  archived?: boolean;
  /**
   * The number of clicks on the short link.
   */
  clicks: number;
  /**
   * The comments for the short link.
   */
  comments:  string;
  createdAt: string;
  /**
   * The description of the short link generated via `api.dub.co/metatags`. Will be used for
   * Custom Social Media Cards if `proxy` is true.
   */
  description: string;
  doIndex?:    boolean;
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain:     string;
  expiredURL: string;
  expiresAt:  string;
  /**
   * This is the ID of the link in your database that is unique across your workspace. If set,
   * it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
   * when passed as a query parameter.
   */
  externalID: string;
  /**
   * Geo targeting information for the short link in JSON format `{[COUNTRY]:
   * https://example.com }`. Learn more: https://d.to/geo
   */
  geo: DataGeo;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  image: string;
  /**
   * The iOS destination URL for the short link for iOS device targeting.
   */
  ios: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key:         string;
  lastClicked: string;
  /**
   * [BETA]: The number of leads the short links has generated.
   */
  leads: number;
  /**
   * The password required to access the destination URL of the short link.
   */
  password: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The project ID of the short link. This field is deprecated – use `workspaceId` instead.
   */
  projectID:    string;
  proxy?:       boolean;
  publicStats?: boolean;
  /**
   * The full URL of the QR code for the short link (e.g.
   * `https://api.dub.co/qr?url=https://dub.sh/try`).
   */
  qrCode:   string;
  rewrite?: boolean;
  /**
   * [BETA]: The total dollar amount of sales the short links has generated (in cents).
   */
  saleAmount: number;
  /**
   * [BETA]: The number of sales the short links has generated.
   */
  sales: number;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  /**
   * The unique ID of the tag assigned to the short link. This field is deprecated – use
   * `tags` instead.
   */
  tagID: string;
  /**
   * The tags assigned to the short link.
   */
  tags: Tag[];
  /**
   * The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  title:            string;
  trackConversion?: boolean;
  updatedAt:        string;
  url:              string;
  userID:           string;
  /**
   * The UTM campaign of the short link.
   */
  utmCampaign: string;
  /**
   * The UTM content of the short link.
   */
  utmContent: string;
  /**
   * The UTM medium of the short link.
   */
  utmMedium: string;
  /**
   * The UTM source of the short link.
   */
  utmSource: string;
  /**
   * The UTM term of the short link.
   */
  utmTerm: string;
  /**
   * The custom link preview video (og:video). Will be used for Custom Social Media Cards if
   * `proxy` is true. Learn more: https://d.to/og
   */
  video: string;
  /**
   * The IDs of the webhooks that the short link is associated with.
   */
  webhookIDS: string[];
  /**
   * The workspace ID of the short link.
   */
  workspaceID: string;
  [property: string]: any;
}

/**
 * Geo targeting information for the short link in JSON format `{[COUNTRY]:
 * https://example.com }`. Learn more: https://d.to/geo
 */
export interface DataGeo {
  ad?: string;
  ae?: string;
  af?: string;
  ag?: string;
  ai?: string;
  al?: string;
  am?: string;
  ao?: string;
  aq?: string;
  ar?: string;
  as?: string;
  at?: string;
  au?: string;
  aw?: string;
  ax?: string;
  az?: string;
  ba?: string;
  bb?: string;
  bd?: string;
  be?: string;
  bf?: string;
  bg?: string;
  bh?: string;
  bi?: string;
  bj?: string;
  bl?: string;
  bm?: string;
  bn?: string;
  bo?: string;
  bq?: string;
  br?: string;
  bs?: string;
  bt?: string;
  bv?: string;
  bw?: string;
  by?: string;
  bz?: string;
  ca?: string;
  cc?: string;
  cd?: string;
  cf?: string;
  cg?: string;
  ch?: string;
  ci?: string;
  ck?: string;
  cl?: string;
  cm?: string;
  cn?: string;
  co?: string;
  cr?: string;
  cu?: string;
  cv?: string;
  cw?: string;
  cx?: string;
  cy?: string;
  cz?: string;
  de?: string;
  dj?: string;
  dk?: string;
  dm?: string;
  do?: string;
  dz?: string;
  ec?: string;
  ee?: string;
  eg?: string;
  eh?: string;
  er?: string;
  es?: string;
  et?: string;
  fi?: string;
  fj?: string;
  fk?: string;
  fm?: string;
  fo?: string;
  fr?: string;
  ga?: string;
  gb?: string;
  gd?: string;
  ge?: string;
  gf?: string;
  gg?: string;
  gh?: string;
  gi?: string;
  gl?: string;
  gm?: string;
  gn?: string;
  gp?: string;
  gq?: string;
  gr?: string;
  gs?: string;
  gt?: string;
  gu?: string;
  gw?: string;
  gy?: string;
  hk?: string;
  hm?: string;
  hn?: string;
  hr?: string;
  ht?: string;
  hu?: string;
  id?: string;
  ie?: string;
  il?: string;
  im?: string;
  in?: string;
  io?: string;
  iq?: string;
  ir?: string;
  is?: string;
  it?: string;
  je?: string;
  jm?: string;
  jo?: string;
  jp?: string;
  ke?: string;
  kg?: string;
  kh?: string;
  ki?: string;
  km?: string;
  kn?: string;
  kp?: string;
  kr?: string;
  kw?: string;
  ky?: string;
  kz?: string;
  la?: string;
  lb?: string;
  lc?: string;
  li?: string;
  lk?: string;
  lr?: string;
  ls?: string;
  lt?: string;
  lu?: string;
  lv?: string;
  ly?: string;
  ma?: string;
  mc?: string;
  md?: string;
  me?: string;
  mf?: string;
  mg?: string;
  mh?: string;
  mk?: string;
  ml?: string;
  mm?: string;
  mn?: string;
  mo?: string;
  mp?: string;
  mq?: string;
  mr?: string;
  ms?: string;
  mt?: string;
  mu?: string;
  mv?: string;
  mw?: string;
  mx?: string;
  my?: string;
  mz?: string;
  na?: string;
  nc?: string;
  ne?: string;
  nf?: string;
  ng?: string;
  ni?: string;
  nl?: string;
  no?: string;
  np?: string;
  nr?: string;
  nu?: string;
  nz?: string;
  om?: string;
  pa?: string;
  pe?: string;
  pf?: string;
  pg?: string;
  ph?: string;
  pk?: string;
  pl?: string;
  pm?: string;
  pn?: string;
  pr?: string;
  ps?: string;
  pt?: string;
  pw?: string;
  py?: string;
  qa?: string;
  re?: string;
  ro?: string;
  rs?: string;
  ru?: string;
  rw?: string;
  sa?: string;
  sb?: string;
  sc?: string;
  sd?: string;
  se?: string;
  sg?: string;
  sh?: string;
  si?: string;
  sj?: string;
  sk?: string;
  sl?: string;
  sm?: string;
  sn?: string;
  so?: string;
  sr?: string;
  ss?: string;
  st?: string;
  sv?: string;
  sx?: string;
  sy?: string;
  sz?: string;
  tc?: string;
  td?: string;
  tf?: string;
  tg?: string;
  th?: string;
  tj?: string;
  tk?: string;
  tl?: string;
  tm?: string;
  tn?: string;
  to?: string;
  tr?: string;
  tt?: string;
  tv?: string;
  tw?: string;
  tz?: string;
  ua?: string;
  ug?: string;
  um?: string;
  us?: string;
  uy?: string;
  uz?: string;
  va?: string;
  vc?: string;
  ve?: string;
  vg?: string;
  vi?: string;
  vn?: string;
  vu?: string;
  wf?: string;
  ws?: string;
  xk?: string;
  ye?: string;
  yt?: string;
  za?: string;
  zm?: string;
  zw?: string;
}

export type LinkWebhookEventEvent = "link.created" | "link.updated" | "link.deleted";

/**
 * Triggered when a sale is created.
 */
export interface SaleCreatedEvent {
  createdAt: string;
  data:      SaleCreatedEventData;
  event:     SaleCreatedEventEvent;
  id:        string;
  [property: string]: any;
}

export interface SaleCreatedEventData {
  click:     TentacledClick;
  customer:  FluffyCustomer;
  eventName: string;
  link:      IndecentLink;
  sale:      DataSale;
  [property: string]: any;
}

export interface TentacledClick {
  browser:    string;
  city:       string;
  continent:  string;
  country:    string;
  device:     string;
  id:         string;
  ip:         string;
  os:         string;
  qr?:        boolean;
  referer:    string;
  refererURL: string;
  region:     string;
  url:        string;
  [property: string]: any;
}

export interface FluffyCustomer {
  /**
   * Avatar URL of the customer.
   */
  avatar?: string;
  /**
   * Country of the customer.
   */
  country?: string;
  /**
   * The date the customer was created.
   */
  createdAt: string;
  discount?: TentacledDiscount;
  /**
   * Email of the customer.
   */
  email?: string;
  /**
   * Unique identifier for the customer in the client's app.
   */
  externalID: string;
  /**
   * The unique identifier of the customer in Dub.
   */
  id:    string;
  link?: IndigoLink;
  /**
   * Name of the customer.
   */
  name:     string;
  partner?: TentacledPartner;
  [property: string]: any;
}

export interface TentacledDiscount {
  amount:       number;
  couponID:     string;
  couponTestID: string;
  duration:     number;
  id:           string;
  interval:     Interval;
  type:         Type;
  [property: string]: any;
}

export interface IndigoLink {
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain: string;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  [property: string]: any;
}

export interface TentacledPartner {
  email:  string;
  id:     string;
  image?: string;
  name:   string;
  [property: string]: any;
}

export interface IndecentLink {
  /**
   * The Android destination URL for the short link for Android device targeting.
   */
  android:   string;
  archived?: boolean;
  /**
   * The number of clicks on the short link.
   */
  clicks: number;
  /**
   * The comments for the short link.
   */
  comments:  string;
  createdAt: string;
  /**
   * The description of the short link generated via `api.dub.co/metatags`. Will be used for
   * Custom Social Media Cards if `proxy` is true.
   */
  description: string;
  doIndex?:    boolean;
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain:     string;
  expiredURL: string;
  expiresAt:  string;
  /**
   * This is the ID of the link in your database that is unique across your workspace. If set,
   * it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
   * when passed as a query parameter.
   */
  externalID: string;
  /**
   * Geo targeting information for the short link in JSON format `{[COUNTRY]:
   * https://example.com }`. Learn more: https://d.to/geo
   */
  geo: IndigoGeo;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  image: string;
  /**
   * The iOS destination URL for the short link for iOS device targeting.
   */
  ios: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key:         string;
  lastClicked: string;
  /**
   * [BETA]: The number of leads the short links has generated.
   */
  leads: number;
  /**
   * The password required to access the destination URL of the short link.
   */
  password: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The project ID of the short link. This field is deprecated – use `workspaceId` instead.
   */
  projectID:    string;
  proxy?:       boolean;
  publicStats?: boolean;
  /**
   * The full URL of the QR code for the short link (e.g.
   * `https://api.dub.co/qr?url=https://dub.sh/try`).
   */
  qrCode:   string;
  rewrite?: boolean;
  /**
   * [BETA]: The total dollar amount of sales the short links has generated (in cents).
   */
  saleAmount: number;
  /**
   * [BETA]: The number of sales the short links has generated.
   */
  sales: number;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  /**
   * The unique ID of the tag assigned to the short link. This field is deprecated – use
   * `tags` instead.
   */
  tagID: string;
  /**
   * The tags assigned to the short link.
   */
  tags: Tag[];
  /**
   * The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  title:            string;
  trackConversion?: boolean;
  updatedAt:        string;
  url:              string;
  userID:           string;
  /**
   * The UTM campaign of the short link.
   */
  utmCampaign: string;
  /**
   * The UTM content of the short link.
   */
  utmContent: string;
  /**
   * The UTM medium of the short link.
   */
  utmMedium: string;
  /**
   * The UTM source of the short link.
   */
  utmSource: string;
  /**
   * The UTM term of the short link.
   */
  utmTerm: string;
  /**
   * The custom link preview video (og:video). Will be used for Custom Social Media Cards if
   * `proxy` is true. Learn more: https://d.to/og
   */
  video: string;
  /**
   * The IDs of the webhooks that the short link is associated with.
   */
  webhookIDS: string[];
  /**
   * The workspace ID of the short link.
   */
  workspaceID: string;
  [property: string]: any;
}

/**
 * Geo targeting information for the short link in JSON format `{[COUNTRY]:
 * https://example.com }`. Learn more: https://d.to/geo
 */
export interface IndigoGeo {
  ad?: string;
  ae?: string;
  af?: string;
  ag?: string;
  ai?: string;
  al?: string;
  am?: string;
  ao?: string;
  aq?: string;
  ar?: string;
  as?: string;
  at?: string;
  au?: string;
  aw?: string;
  ax?: string;
  az?: string;
  ba?: string;
  bb?: string;
  bd?: string;
  be?: string;
  bf?: string;
  bg?: string;
  bh?: string;
  bi?: string;
  bj?: string;
  bl?: string;
  bm?: string;
  bn?: string;
  bo?: string;
  bq?: string;
  br?: string;
  bs?: string;
  bt?: string;
  bv?: string;
  bw?: string;
  by?: string;
  bz?: string;
  ca?: string;
  cc?: string;
  cd?: string;
  cf?: string;
  cg?: string;
  ch?: string;
  ci?: string;
  ck?: string;
  cl?: string;
  cm?: string;
  cn?: string;
  co?: string;
  cr?: string;
  cu?: string;
  cv?: string;
  cw?: string;
  cx?: string;
  cy?: string;
  cz?: string;
  de?: string;
  dj?: string;
  dk?: string;
  dm?: string;
  do?: string;
  dz?: string;
  ec?: string;
  ee?: string;
  eg?: string;
  eh?: string;
  er?: string;
  es?: string;
  et?: string;
  fi?: string;
  fj?: string;
  fk?: string;
  fm?: string;
  fo?: string;
  fr?: string;
  ga?: string;
  gb?: string;
  gd?: string;
  ge?: string;
  gf?: string;
  gg?: string;
  gh?: string;
  gi?: string;
  gl?: string;
  gm?: string;
  gn?: string;
  gp?: string;
  gq?: string;
  gr?: string;
  gs?: string;
  gt?: string;
  gu?: string;
  gw?: string;
  gy?: string;
  hk?: string;
  hm?: string;
  hn?: string;
  hr?: string;
  ht?: string;
  hu?: string;
  id?: string;
  ie?: string;
  il?: string;
  im?: string;
  in?: string;
  io?: string;
  iq?: string;
  ir?: string;
  is?: string;
  it?: string;
  je?: string;
  jm?: string;
  jo?: string;
  jp?: string;
  ke?: string;
  kg?: string;
  kh?: string;
  ki?: string;
  km?: string;
  kn?: string;
  kp?: string;
  kr?: string;
  kw?: string;
  ky?: string;
  kz?: string;
  la?: string;
  lb?: string;
  lc?: string;
  li?: string;
  lk?: string;
  lr?: string;
  ls?: string;
  lt?: string;
  lu?: string;
  lv?: string;
  ly?: string;
  ma?: string;
  mc?: string;
  md?: string;
  me?: string;
  mf?: string;
  mg?: string;
  mh?: string;
  mk?: string;
  ml?: string;
  mm?: string;
  mn?: string;
  mo?: string;
  mp?: string;
  mq?: string;
  mr?: string;
  ms?: string;
  mt?: string;
  mu?: string;
  mv?: string;
  mw?: string;
  mx?: string;
  my?: string;
  mz?: string;
  na?: string;
  nc?: string;
  ne?: string;
  nf?: string;
  ng?: string;
  ni?: string;
  nl?: string;
  no?: string;
  np?: string;
  nr?: string;
  nu?: string;
  nz?: string;
  om?: string;
  pa?: string;
  pe?: string;
  pf?: string;
  pg?: string;
  ph?: string;
  pk?: string;
  pl?: string;
  pm?: string;
  pn?: string;
  pr?: string;
  ps?: string;
  pt?: string;
  pw?: string;
  py?: string;
  qa?: string;
  re?: string;
  ro?: string;
  rs?: string;
  ru?: string;
  rw?: string;
  sa?: string;
  sb?: string;
  sc?: string;
  sd?: string;
  se?: string;
  sg?: string;
  sh?: string;
  si?: string;
  sj?: string;
  sk?: string;
  sl?: string;
  sm?: string;
  sn?: string;
  so?: string;
  sr?: string;
  ss?: string;
  st?: string;
  sv?: string;
  sx?: string;
  sy?: string;
  sz?: string;
  tc?: string;
  td?: string;
  tf?: string;
  tg?: string;
  th?: string;
  tj?: string;
  tk?: string;
  tl?: string;
  tm?: string;
  tn?: string;
  to?: string;
  tr?: string;
  tt?: string;
  tv?: string;
  tw?: string;
  tz?: string;
  ua?: string;
  ug?: string;
  um?: string;
  us?: string;
  uy?: string;
  uz?: string;
  va?: string;
  vc?: string;
  ve?: string;
  vg?: string;
  vi?: string;
  vn?: string;
  vu?: string;
  wf?: string;
  ws?: string;
  xk?: string;
  ye?: string;
  yt?: string;
  za?: string;
  zm?: string;
  zw?: string;
}

export interface DataSale {
  amount:           number;
  currency:         string;
  invoiceID:        string;
  paymentProcessor: string;
  [property: string]: any;
}

export type SaleCreatedEventEvent = "sale.created";

export interface SaleEvent {
  /**
   * Deprecated. Use `click.browser` instead.
   */
  browser: string;
  /**
   * Deprecated. Use `click.city` instead.
   */
  city:  string;
  click: SaleEventClick;
  /**
   * Deprecated. Use `click.id` instead.
   */
  clickID: string;
  /**
   * Deprecated. Use `click.continent` instead.
   */
  continent: string;
  /**
   * Deprecated. Use `click.country` instead.
   */
  country:  string;
  customer: SaleEventCustomer;
  /**
   * Deprecated. Use `click.device` instead.
   */
  device: string;
  /**
   * Deprecated. Use `link.domain` instead.
   */
  domain:    string;
  event:     SaleEventEvent;
  eventID:   string;
  eventName: string;
  /**
   * Deprecated. Use `sale.invoiceId` instead.
   */
  invoiceID: string;
  /**
   * Deprecated. Use `click.ip` instead.
   */
  ip: string;
  /**
   * Deprecated. Use `link.key` instead.
   */
  key:  string;
  link: SaleEventLink;
  /**
   * Deprecated. Use `link.id` instead.
   */
  linkID: string;
  /**
   * Deprecated. Use `click.os` instead.
   */
  os: string;
  /**
   * Deprecated. Use `sale.paymentProcessor` instead.
   */
  paymentProcessor: string;
  /**
   * Deprecated. Use `click.qr` instead.
   */
  qr:   number;
  sale: SaleEventSale;
  /**
   * Deprecated. Use `sale.amount` instead.
   */
  saleAmount: number;
  timestamp?: string;
  /**
   * Deprecated. Use `click.url` instead.
   */
  url: string;
  [property: string]: any;
}

export interface SaleEventClick {
  browser:    string;
  city:       string;
  continent:  string;
  country:    string;
  device:     string;
  id:         string;
  ip:         string;
  os:         string;
  qr?:        boolean;
  referer:    string;
  refererURL: string;
  region:     string;
  url:        string;
  [property: string]: any;
}

export interface SaleEventCustomer {
  /**
   * Avatar URL of the customer.
   */
  avatar?: string;
  /**
   * Country of the customer.
   */
  country?: string;
  /**
   * The date the customer was created.
   */
  createdAt: string;
  discount?: StickyDiscount;
  /**
   * Email of the customer.
   */
  email?: string;
  /**
   * Unique identifier for the customer in the client's app.
   */
  externalID: string;
  /**
   * The unique identifier of the customer in Dub.
   */
  id:    string;
  link?: HilariousLink;
  /**
   * Name of the customer.
   */
  name:     string;
  partner?: StickyPartner;
  [property: string]: any;
}

export interface StickyDiscount {
  amount:       number;
  couponID:     string;
  couponTestID: string;
  duration:     number;
  id:           string;
  interval:     Interval;
  type:         Type;
  [property: string]: any;
}

export interface HilariousLink {
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain: string;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  [property: string]: any;
}

export interface StickyPartner {
  email:  string;
  id:     string;
  image?: string;
  name:   string;
  [property: string]: any;
}

export type SaleEventEvent = "sale";

export interface SaleEventLink {
  /**
   * The Android destination URL for the short link for Android device targeting.
   */
  android:   string;
  archived?: boolean;
  /**
   * The number of clicks on the short link.
   */
  clicks: number;
  /**
   * The comments for the short link.
   */
  comments:  string;
  createdAt: string;
  /**
   * The description of the short link generated via `api.dub.co/metatags`. Will be used for
   * Custom Social Media Cards if `proxy` is true.
   */
  description: string;
  doIndex?:    boolean;
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain:     string;
  expiredURL: string;
  expiresAt:  string;
  /**
   * This is the ID of the link in your database that is unique across your workspace. If set,
   * it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
   * when passed as a query parameter.
   */
  externalID: string;
  /**
   * Geo targeting information for the short link in JSON format `{[COUNTRY]:
   * https://example.com }`. Learn more: https://d.to/geo
   */
  geo: IndecentGeo;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  image: string;
  /**
   * The iOS destination URL for the short link for iOS device targeting.
   */
  ios: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key:         string;
  lastClicked: string;
  /**
   * [BETA]: The number of leads the short links has generated.
   */
  leads: number;
  /**
   * The password required to access the destination URL of the short link.
   */
  password: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The project ID of the short link. This field is deprecated – use `workspaceId` instead.
   */
  projectID:    string;
  proxy?:       boolean;
  publicStats?: boolean;
  /**
   * The full URL of the QR code for the short link (e.g.
   * `https://api.dub.co/qr?url=https://dub.sh/try`).
   */
  qrCode:   string;
  rewrite?: boolean;
  /**
   * [BETA]: The total dollar amount of sales the short links has generated (in cents).
   */
  saleAmount: number;
  /**
   * [BETA]: The number of sales the short links has generated.
   */
  sales: number;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  /**
   * The unique ID of the tag assigned to the short link. This field is deprecated – use
   * `tags` instead.
   */
  tagID: string;
  /**
   * The tags assigned to the short link.
   */
  tags: Tag[];
  /**
   * The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  title:            string;
  trackConversion?: boolean;
  updatedAt:        string;
  url:              string;
  userID:           string;
  /**
   * The UTM campaign of the short link.
   */
  utmCampaign: string;
  /**
   * The UTM content of the short link.
   */
  utmContent: string;
  /**
   * The UTM medium of the short link.
   */
  utmMedium: string;
  /**
   * The UTM source of the short link.
   */
  utmSource: string;
  /**
   * The UTM term of the short link.
   */
  utmTerm: string;
  /**
   * The custom link preview video (og:video). Will be used for Custom Social Media Cards if
   * `proxy` is true. Learn more: https://d.to/og
   */
  video: string;
  /**
   * The IDs of the webhooks that the short link is associated with.
   */
  webhookIDS: string[];
  /**
   * The workspace ID of the short link.
   */
  workspaceID: string;
  [property: string]: any;
}

/**
 * Geo targeting information for the short link in JSON format `{[COUNTRY]:
 * https://example.com }`. Learn more: https://d.to/geo
 */
export interface IndecentGeo {
  ad?: string;
  ae?: string;
  af?: string;
  ag?: string;
  ai?: string;
  al?: string;
  am?: string;
  ao?: string;
  aq?: string;
  ar?: string;
  as?: string;
  at?: string;
  au?: string;
  aw?: string;
  ax?: string;
  az?: string;
  ba?: string;
  bb?: string;
  bd?: string;
  be?: string;
  bf?: string;
  bg?: string;
  bh?: string;
  bi?: string;
  bj?: string;
  bl?: string;
  bm?: string;
  bn?: string;
  bo?: string;
  bq?: string;
  br?: string;
  bs?: string;
  bt?: string;
  bv?: string;
  bw?: string;
  by?: string;
  bz?: string;
  ca?: string;
  cc?: string;
  cd?: string;
  cf?: string;
  cg?: string;
  ch?: string;
  ci?: string;
  ck?: string;
  cl?: string;
  cm?: string;
  cn?: string;
  co?: string;
  cr?: string;
  cu?: string;
  cv?: string;
  cw?: string;
  cx?: string;
  cy?: string;
  cz?: string;
  de?: string;
  dj?: string;
  dk?: string;
  dm?: string;
  do?: string;
  dz?: string;
  ec?: string;
  ee?: string;
  eg?: string;
  eh?: string;
  er?: string;
  es?: string;
  et?: string;
  fi?: string;
  fj?: string;
  fk?: string;
  fm?: string;
  fo?: string;
  fr?: string;
  ga?: string;
  gb?: string;
  gd?: string;
  ge?: string;
  gf?: string;
  gg?: string;
  gh?: string;
  gi?: string;
  gl?: string;
  gm?: string;
  gn?: string;
  gp?: string;
  gq?: string;
  gr?: string;
  gs?: string;
  gt?: string;
  gu?: string;
  gw?: string;
  gy?: string;
  hk?: string;
  hm?: string;
  hn?: string;
  hr?: string;
  ht?: string;
  hu?: string;
  id?: string;
  ie?: string;
  il?: string;
  im?: string;
  in?: string;
  io?: string;
  iq?: string;
  ir?: string;
  is?: string;
  it?: string;
  je?: string;
  jm?: string;
  jo?: string;
  jp?: string;
  ke?: string;
  kg?: string;
  kh?: string;
  ki?: string;
  km?: string;
  kn?: string;
  kp?: string;
  kr?: string;
  kw?: string;
  ky?: string;
  kz?: string;
  la?: string;
  lb?: string;
  lc?: string;
  li?: string;
  lk?: string;
  lr?: string;
  ls?: string;
  lt?: string;
  lu?: string;
  lv?: string;
  ly?: string;
  ma?: string;
  mc?: string;
  md?: string;
  me?: string;
  mf?: string;
  mg?: string;
  mh?: string;
  mk?: string;
  ml?: string;
  mm?: string;
  mn?: string;
  mo?: string;
  mp?: string;
  mq?: string;
  mr?: string;
  ms?: string;
  mt?: string;
  mu?: string;
  mv?: string;
  mw?: string;
  mx?: string;
  my?: string;
  mz?: string;
  na?: string;
  nc?: string;
  ne?: string;
  nf?: string;
  ng?: string;
  ni?: string;
  nl?: string;
  no?: string;
  np?: string;
  nr?: string;
  nu?: string;
  nz?: string;
  om?: string;
  pa?: string;
  pe?: string;
  pf?: string;
  pg?: string;
  ph?: string;
  pk?: string;
  pl?: string;
  pm?: string;
  pn?: string;
  pr?: string;
  ps?: string;
  pt?: string;
  pw?: string;
  py?: string;
  qa?: string;
  re?: string;
  ro?: string;
  rs?: string;
  ru?: string;
  rw?: string;
  sa?: string;
  sb?: string;
  sc?: string;
  sd?: string;
  se?: string;
  sg?: string;
  sh?: string;
  si?: string;
  sj?: string;
  sk?: string;
  sl?: string;
  sm?: string;
  sn?: string;
  so?: string;
  sr?: string;
  ss?: string;
  st?: string;
  sv?: string;
  sx?: string;
  sy?: string;
  sz?: string;
  tc?: string;
  td?: string;
  tf?: string;
  tg?: string;
  th?: string;
  tj?: string;
  tk?: string;
  tl?: string;
  tm?: string;
  tn?: string;
  to?: string;
  tr?: string;
  tt?: string;
  tv?: string;
  tw?: string;
  tz?: string;
  ua?: string;
  ug?: string;
  um?: string;
  us?: string;
  uy?: string;
  uz?: string;
  va?: string;
  vc?: string;
  ve?: string;
  vg?: string;
  vi?: string;
  vn?: string;
  vu?: string;
  wf?: string;
  ws?: string;
  xk?: string;
  ye?: string;
  yt?: string;
  za?: string;
  zm?: string;
  zw?: string;
}

export interface SaleEventSale {
  /**
   * The amount of the sale. Should be passed in cents.
   */
  amount: number;
  /**
   * The invoice ID of the sale.
   */
  invoiceID: string;
  /**
   * The payment processor via which the sale was made.
   */
  paymentProcessor: PaymentProcessor;
  [property: string]: any;
}

/**
 * The payment processor via which the sale was made.
 */
export type PaymentProcessor = "stripe" | "shopify" | "paddle";

/**
 * Webhook event schema
 *
 * Triggered when a link is created, updated, or deleted.
 *
 * Triggered when a link is clicked.
 *
 * Triggered when a lead is created.
 *
 * Triggered when a sale is created.
 */
export interface WebhookEvent {
  createdAt: string;
  data:      WebhookEventData;
  event:     WebhookEventEvent;
  id:        string;
  [property: string]: any;
}

export interface WebhookEventData {
  /**
   * The Android destination URL for the short link for Android device targeting.
   */
  android?:  string;
  archived?: boolean;
  click?:    StickyClick;
  /**
   * The number of clicks on the short link.
   */
  clicks?: number;
  /**
   * The comments for the short link.
   */
  comments?:  string;
  createdAt?: string;
  customer?:  TentacledCustomer;
  /**
   * The description of the short link generated via `api.dub.co/metatags`. Will be used for
   * Custom Social Media Cards if `proxy` is true.
   */
  description?: string;
  doIndex?:     boolean;
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain?:     string;
  eventName?:  string;
  expiredURL?: string;
  expiresAt?:  string;
  /**
   * This is the ID of the link in your database that is unique across your workspace. If set,
   * it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
   * when passed as a query parameter.
   */
  externalID?: string;
  /**
   * Geo targeting information for the short link in JSON format `{[COUNTRY]:
   * https://example.com }`. Learn more: https://d.to/geo
   */
  geo?: DataGeo;
  /**
   * The unique ID of the short link.
   */
  id?: string;
  /**
   * The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  image?: string;
  /**
   * The iOS destination URL for the short link for iOS device targeting.
   */
  ios?: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key?:         string;
  lastClicked?: string;
  /**
   * [BETA]: The number of leads the short links has generated.
   */
  leads?: number;
  link?:  CunningLink;
  /**
   * The password required to access the destination URL of the short link.
   */
  password?: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID?: string;
  /**
   * The project ID of the short link. This field is deprecated – use `workspaceId` instead.
   */
  projectID?:   string;
  proxy?:       boolean;
  publicStats?: boolean;
  /**
   * The full URL of the QR code for the short link (e.g.
   * `https://api.dub.co/qr?url=https://dub.sh/try`).
   */
  qrCode?:  string;
  rewrite?: boolean;
  sale?:    DataSale;
  /**
   * [BETA]: The total dollar amount of sales the short links has generated (in cents).
   */
  saleAmount?: number;
  /**
   * [BETA]: The number of sales the short links has generated.
   */
  sales?: number;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink?: string;
  /**
   * The unique ID of the tag assigned to the short link. This field is deprecated – use
   * `tags` instead.
   */
  tagID?: string;
  /**
   * The tags assigned to the short link.
   */
  tags?: Tag[];
  /**
   * The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  title?:           string;
  trackConversion?: boolean;
  updatedAt?:       string;
  url?:             string;
  userID?:          string;
  /**
   * The UTM campaign of the short link.
   */
  utmCampaign?: string;
  /**
   * The UTM content of the short link.
   */
  utmContent?: string;
  /**
   * The UTM medium of the short link.
   */
  utmMedium?: string;
  /**
   * The UTM source of the short link.
   */
  utmSource?: string;
  /**
   * The UTM term of the short link.
   */
  utmTerm?: string;
  /**
   * The custom link preview video (og:video). Will be used for Custom Social Media Cards if
   * `proxy` is true. Learn more: https://d.to/og
   */
  video?: string;
  /**
   * The IDs of the webhooks that the short link is associated with.
   */
  webhookIDS?: string[];
  /**
   * The workspace ID of the short link.
   */
  workspaceID?: string;
  [property: string]: any;
}

export interface StickyClick {
  browser:    string;
  city:       string;
  continent:  string;
  country:    string;
  device:     string;
  id:         string;
  ip:         string;
  os:         string;
  qr?:        boolean;
  referer:    string;
  refererURL: string;
  region:     string;
  url:        string;
  [property: string]: any;
}

export interface TentacledCustomer {
  /**
   * Avatar URL of the customer.
   */
  avatar?: string;
  /**
   * Country of the customer.
   */
  country?: string;
  /**
   * The date the customer was created.
   */
  createdAt: string;
  discount?: IndigoDiscount;
  /**
   * Email of the customer.
   */
  email?: string;
  /**
   * Unique identifier for the customer in the client's app.
   */
  externalID: string;
  /**
   * The unique identifier of the customer in Dub.
   */
  id:    string;
  link?: AmbitiousLink;
  /**
   * Name of the customer.
   */
  name:     string;
  partner?: IndigoPartner;
  [property: string]: any;
}

export interface IndigoDiscount {
  amount:       number;
  couponID:     string;
  couponTestID: string;
  duration:     number;
  id:           string;
  interval:     Interval;
  type:         Type;
  [property: string]: any;
}

export interface AmbitiousLink {
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain: string;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  [property: string]: any;
}

export interface IndigoPartner {
  email:  string;
  id:     string;
  image?: string;
  name:   string;
  [property: string]: any;
}

export interface CunningLink {
  /**
   * The Android destination URL for the short link for Android device targeting.
   */
  android:   string;
  archived?: boolean;
  /**
   * The number of clicks on the short link.
   */
  clicks: number;
  /**
   * The comments for the short link.
   */
  comments:  string;
  createdAt: string;
  /**
   * The description of the short link generated via `api.dub.co/metatags`. Will be used for
   * Custom Social Media Cards if `proxy` is true.
   */
  description: string;
  doIndex?:    boolean;
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain:     string;
  expiredURL: string;
  expiresAt:  string;
  /**
   * This is the ID of the link in your database that is unique across your workspace. If set,
   * it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
   * when passed as a query parameter.
   */
  externalID: string;
  /**
   * Geo targeting information for the short link in JSON format `{[COUNTRY]:
   * https://example.com }`. Learn more: https://d.to/geo
   */
  geo: HilariousGeo;
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  image: string;
  /**
   * The iOS destination URL for the short link for iOS device targeting.
   */
  ios: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key:         string;
  lastClicked: string;
  /**
   * [BETA]: The number of leads the short links has generated.
   */
  leads: number;
  /**
   * The password required to access the destination URL of the short link.
   */
  password: string;
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string;
  /**
   * The project ID of the short link. This field is deprecated – use `workspaceId` instead.
   */
  projectID:    string;
  proxy?:       boolean;
  publicStats?: boolean;
  /**
   * The full URL of the QR code for the short link (e.g.
   * `https://api.dub.co/qr?url=https://dub.sh/try`).
   */
  qrCode:   string;
  rewrite?: boolean;
  /**
   * [BETA]: The total dollar amount of sales the short links has generated (in cents).
   */
  saleAmount: number;
  /**
   * [BETA]: The number of sales the short links has generated.
   */
  sales: number;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  /**
   * The unique ID of the tag assigned to the short link. This field is deprecated – use
   * `tags` instead.
   */
  tagID: string;
  /**
   * The tags assigned to the short link.
   */
  tags: Tag[];
  /**
   * The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  title:            string;
  trackConversion?: boolean;
  updatedAt:        string;
  url:              string;
  userID:           string;
  /**
   * The UTM campaign of the short link.
   */
  utmCampaign: string;
  /**
   * The UTM content of the short link.
   */
  utmContent: string;
  /**
   * The UTM medium of the short link.
   */
  utmMedium: string;
  /**
   * The UTM source of the short link.
   */
  utmSource: string;
  /**
   * The UTM term of the short link.
   */
  utmTerm: string;
  /**
   * The custom link preview video (og:video). Will be used for Custom Social Media Cards if
   * `proxy` is true. Learn more: https://d.to/og
   */
  video: string;
  /**
   * The IDs of the webhooks that the short link is associated with.
   */
  webhookIDS: string[];
  /**
   * The workspace ID of the short link.
   */
  workspaceID: string;
  [property: string]: any;
}

/**
 * Geo targeting information for the short link in JSON format `{[COUNTRY]:
 * https://example.com }`. Learn more: https://d.to/geo
 */
export interface HilariousGeo {
  ad?: string;
  ae?: string;
  af?: string;
  ag?: string;
  ai?: string;
  al?: string;
  am?: string;
  ao?: string;
  aq?: string;
  ar?: string;
  as?: string;
  at?: string;
  au?: string;
  aw?: string;
  ax?: string;
  az?: string;
  ba?: string;
  bb?: string;
  bd?: string;
  be?: string;
  bf?: string;
  bg?: string;
  bh?: string;
  bi?: string;
  bj?: string;
  bl?: string;
  bm?: string;
  bn?: string;
  bo?: string;
  bq?: string;
  br?: string;
  bs?: string;
  bt?: string;
  bv?: string;
  bw?: string;
  by?: string;
  bz?: string;
  ca?: string;
  cc?: string;
  cd?: string;
  cf?: string;
  cg?: string;
  ch?: string;
  ci?: string;
  ck?: string;
  cl?: string;
  cm?: string;
  cn?: string;
  co?: string;
  cr?: string;
  cu?: string;
  cv?: string;
  cw?: string;
  cx?: string;
  cy?: string;
  cz?: string;
  de?: string;
  dj?: string;
  dk?: string;
  dm?: string;
  do?: string;
  dz?: string;
  ec?: string;
  ee?: string;
  eg?: string;
  eh?: string;
  er?: string;
  es?: string;
  et?: string;
  fi?: string;
  fj?: string;
  fk?: string;
  fm?: string;
  fo?: string;
  fr?: string;
  ga?: string;
  gb?: string;
  gd?: string;
  ge?: string;
  gf?: string;
  gg?: string;
  gh?: string;
  gi?: string;
  gl?: string;
  gm?: string;
  gn?: string;
  gp?: string;
  gq?: string;
  gr?: string;
  gs?: string;
  gt?: string;
  gu?: string;
  gw?: string;
  gy?: string;
  hk?: string;
  hm?: string;
  hn?: string;
  hr?: string;
  ht?: string;
  hu?: string;
  id?: string;
  ie?: string;
  il?: string;
  im?: string;
  in?: string;
  io?: string;
  iq?: string;
  ir?: string;
  is?: string;
  it?: string;
  je?: string;
  jm?: string;
  jo?: string;
  jp?: string;
  ke?: string;
  kg?: string;
  kh?: string;
  ki?: string;
  km?: string;
  kn?: string;
  kp?: string;
  kr?: string;
  kw?: string;
  ky?: string;
  kz?: string;
  la?: string;
  lb?: string;
  lc?: string;
  li?: string;
  lk?: string;
  lr?: string;
  ls?: string;
  lt?: string;
  lu?: string;
  lv?: string;
  ly?: string;
  ma?: string;
  mc?: string;
  md?: string;
  me?: string;
  mf?: string;
  mg?: string;
  mh?: string;
  mk?: string;
  ml?: string;
  mm?: string;
  mn?: string;
  mo?: string;
  mp?: string;
  mq?: string;
  mr?: string;
  ms?: string;
  mt?: string;
  mu?: string;
  mv?: string;
  mw?: string;
  mx?: string;
  my?: string;
  mz?: string;
  na?: string;
  nc?: string;
  ne?: string;
  nf?: string;
  ng?: string;
  ni?: string;
  nl?: string;
  no?: string;
  np?: string;
  nr?: string;
  nu?: string;
  nz?: string;
  om?: string;
  pa?: string;
  pe?: string;
  pf?: string;
  pg?: string;
  ph?: string;
  pk?: string;
  pl?: string;
  pm?: string;
  pn?: string;
  pr?: string;
  ps?: string;
  pt?: string;
  pw?: string;
  py?: string;
  qa?: string;
  re?: string;
  ro?: string;
  rs?: string;
  ru?: string;
  rw?: string;
  sa?: string;
  sb?: string;
  sc?: string;
  sd?: string;
  se?: string;
  sg?: string;
  sh?: string;
  si?: string;
  sj?: string;
  sk?: string;
  sl?: string;
  sm?: string;
  sn?: string;
  so?: string;
  sr?: string;
  ss?: string;
  st?: string;
  sv?: string;
  sx?: string;
  sy?: string;
  sz?: string;
  tc?: string;
  td?: string;
  tf?: string;
  tg?: string;
  th?: string;
  tj?: string;
  tk?: string;
  tl?: string;
  tm?: string;
  tn?: string;
  to?: string;
  tr?: string;
  tt?: string;
  tv?: string;
  tw?: string;
  tz?: string;
  ua?: string;
  ug?: string;
  um?: string;
  us?: string;
  uy?: string;
  uz?: string;
  va?: string;
  vc?: string;
  ve?: string;
  vg?: string;
  vi?: string;
  vn?: string;
  vu?: string;
  wf?: string;
  ws?: string;
  xk?: string;
  ye?: string;
  yt?: string;
  za?: string;
  zm?: string;
  zw?: string;
}

export type WebhookEventEvent = "link.created" | "link.updated" | "link.deleted" | "link.clicked" | "lead.created" | "sale.created";

export interface Workspace {
  /**
   * The AI limit of the workspace.
   */
  aiLimit: number;
  /**
   * The AI usage of the workspace.
   */
  aiUsage: number;
  /**
   * The date and time when the billing cycle starts for the workspace.
   */
  billingCycleStart: number;
  /**
   * Whether the workspace has conversion tracking enabled (d.to/conversions).
   */
  conversionEnabled: boolean;
  /**
   * The date and time when the workspace was created.
   */
  createdAt: string;
  /**
   * The domains of the workspace.
   */
  domains: Domain[];
  /**
   * The domains limit of the workspace.
   */
  domainsLimit: number;
  /**
   * Whether the workspace has claimed a free .link domain. (dub.link/free)
   */
  dotLinkClaimed: boolean;
  /**
   * The feature flags of the workspace, indicating which features are enabled.
   */
  flags?: { [key: string]: boolean };
  /**
   * The unique ID of the workspace.
   */
  id: string;
  /**
   * The invite code of the workspace.
   */
  inviteCode: string;
  /**
   * The links limit of the workspace.
   */
  linksLimit: number;
  /**
   * The links usage of the workspace.
   */
  linksUsage: number;
  /**
   * The logo of the workspace.
   */
  logo: string;
  /**
   * The name of the workspace.
   */
  name: string;
  /**
   * Whether the workspace has Dub Partners enabled.
   */
  partnersEnabled: boolean;
  /**
   * The date and time when the payment failed for the workspace.
   */
  paymentFailedAt: string;
  /**
   * [BETA – Dub Partners]: The ID of the payment method for partner payouts.
   */
  payoutMethodID: string;
  /**
   * The plan of the workspace.
   */
  plan: Plan;
  /**
   * The limit of tracked revenue in the current billing cycle (in cents).
   */
  salesLimit: number;
  /**
   * The dollar amount of tracked revenue in the current billing cycle (in cents).
   */
  salesUsage: number;
  /**
   * The slug of the workspace.
   */
  slug: string;
  /**
   * [BETA – Dub Conversions]: The Stripe Connect ID of the workspace.
   */
  stripeConnectID: string;
  /**
   * The Stripe ID of the workspace.
   */
  stripeID: string;
  /**
   * The tags limit of the workspace.
   */
  tagsLimit: number;
  /**
   * The usage of the workspace.
   */
  usage: number;
  /**
   * The usage limit of the workspace.
   */
  usageLimit: number;
  /**
   * The role of the authenticated user in the workspace.
   */
  users: User[];
  /**
   * The users limit of the workspace.
   */
  usersLimit: number;
  [property: string]: any;
}

export interface Domain {
  /**
   * Whether the domain is the primary domain for the workspace.
   */
  primary: boolean;
  /**
   * The domain name.
   */
  slug: string;
  /**
   * Whether the domain is verified.
   */
  verified: boolean;
  [property: string]: any;
}

/**
 * The plan of the workspace.
 */
export type Plan = "free" | "pro" | "business" | "business plus" | "business extra" | "business max" | "enterprise";

export interface User {
  /**
   * The role of the authenticated user in the workspace.
   */
  role: Role;
  [property: string]: any;
}

/**
 * The role of the authenticated user in the workspace.
 */
export type Role = "owner" | "member";

/**
 * Geo targeting information for the short link in JSON format `{[COUNTRY]:
 * https://example.com }`.
 */
export interface LinkGeoTargeting {
  ad?: string;
  ae?: string;
  af?: string;
  ag?: string;
  ai?: string;
  al?: string;
  am?: string;
  ao?: string;
  aq?: string;
  ar?: string;
  as?: string;
  at?: string;
  au?: string;
  aw?: string;
  ax?: string;
  az?: string;
  ba?: string;
  bb?: string;
  bd?: string;
  be?: string;
  bf?: string;
  bg?: string;
  bh?: string;
  bi?: string;
  bj?: string;
  bl?: string;
  bm?: string;
  bn?: string;
  bo?: string;
  bq?: string;
  br?: string;
  bs?: string;
  bt?: string;
  bv?: string;
  bw?: string;
  by?: string;
  bz?: string;
  ca?: string;
  cc?: string;
  cd?: string;
  cf?: string;
  cg?: string;
  ch?: string;
  ci?: string;
  ck?: string;
  cl?: string;
  cm?: string;
  cn?: string;
  co?: string;
  cr?: string;
  cu?: string;
  cv?: string;
  cw?: string;
  cx?: string;
  cy?: string;
  cz?: string;
  de?: string;
  dj?: string;
  dk?: string;
  dm?: string;
  do?: string;
  dz?: string;
  ec?: string;
  ee?: string;
  eg?: string;
  eh?: string;
  er?: string;
  es?: string;
  et?: string;
  fi?: string;
  fj?: string;
  fk?: string;
  fm?: string;
  fo?: string;
  fr?: string;
  ga?: string;
  gb?: string;
  gd?: string;
  ge?: string;
  gf?: string;
  gg?: string;
  gh?: string;
  gi?: string;
  gl?: string;
  gm?: string;
  gn?: string;
  gp?: string;
  gq?: string;
  gr?: string;
  gs?: string;
  gt?: string;
  gu?: string;
  gw?: string;
  gy?: string;
  hk?: string;
  hm?: string;
  hn?: string;
  hr?: string;
  ht?: string;
  hu?: string;
  id?: string;
  ie?: string;
  il?: string;
  im?: string;
  in?: string;
  io?: string;
  iq?: string;
  ir?: string;
  is?: string;
  it?: string;
  je?: string;
  jm?: string;
  jo?: string;
  jp?: string;
  ke?: string;
  kg?: string;
  kh?: string;
  ki?: string;
  km?: string;
  kn?: string;
  kp?: string;
  kr?: string;
  kw?: string;
  ky?: string;
  kz?: string;
  la?: string;
  lb?: string;
  lc?: string;
  li?: string;
  lk?: string;
  lr?: string;
  ls?: string;
  lt?: string;
  lu?: string;
  lv?: string;
  ly?: string;
  ma?: string;
  mc?: string;
  md?: string;
  me?: string;
  mf?: string;
  mg?: string;
  mh?: string;
  mk?: string;
  ml?: string;
  mm?: string;
  mn?: string;
  mo?: string;
  mp?: string;
  mq?: string;
  mr?: string;
  ms?: string;
  mt?: string;
  mu?: string;
  mv?: string;
  mw?: string;
  mx?: string;
  my?: string;
  mz?: string;
  na?: string;
  nc?: string;
  ne?: string;
  nf?: string;
  ng?: string;
  ni?: string;
  nl?: string;
  no?: string;
  np?: string;
  nr?: string;
  nu?: string;
  nz?: string;
  om?: string;
  pa?: string;
  pe?: string;
  pf?: string;
  pg?: string;
  ph?: string;
  pk?: string;
  pl?: string;
  pm?: string;
  pn?: string;
  pr?: string;
  ps?: string;
  pt?: string;
  pw?: string;
  py?: string;
  qa?: string;
  re?: string;
  ro?: string;
  rs?: string;
  ru?: string;
  rw?: string;
  sa?: string;
  sb?: string;
  sc?: string;
  sd?: string;
  se?: string;
  sg?: string;
  sh?: string;
  si?: string;
  sj?: string;
  sk?: string;
  sl?: string;
  sm?: string;
  sn?: string;
  so?: string;
  sr?: string;
  ss?: string;
  st?: string;
  sv?: string;
  sx?: string;
  sy?: string;
  sz?: string;
  tc?: string;
  td?: string;
  tf?: string;
  tg?: string;
  th?: string;
  tj?: string;
  tk?: string;
  tl?: string;
  tm?: string;
  tn?: string;
  to?: string;
  tr?: string;
  tt?: string;
  tv?: string;
  tw?: string;
  tz?: string;
  ua?: string;
  ug?: string;
  um?: string;
  us?: string;
  uy?: string;
  uz?: string;
  va?: string;
  vc?: string;
  ve?: string;
  vg?: string;
  vi?: string;
  vn?: string;
  vu?: string;
  wf?: string;
  ws?: string;
  xk?: string;
  ye?: string;
  yt?: string;
  za?: string;
  zm?: string;
  zw?: string;
}
