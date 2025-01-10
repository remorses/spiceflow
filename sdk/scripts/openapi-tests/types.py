from dataclasses import dataclass
from enum import Enum
from typing import Optional, List, Dict


@dataclass
class AnalyticsBrowsers:
  browser: str
  """The name of the browser"""

  clicks: float
  """The number of clicks from this browser"""

  leads: float
  """The number of leads from this browser"""

  sale_amount: float
  """The total amount of sales from this browser, in cents"""

  sales: float
  """The number of sales from this browser"""


class Country(Enum):
  """The 2-letter country code of the city: https://d.to/geo
  
  The 2-letter ISO 3166-1 country code for the country associated with the location of the
  user. Learn more: https://d.to/geo
  
  The country to retrieve analytics for.
  """
  AD = "AD"
  AE = "AE"
  AF = "AF"
  AG = "AG"
  AI = "AI"
  AL = "AL"
  AM = "AM"
  AO = "AO"
  AQ = "AQ"
  AR = "AR"
  AS = "AS"
  AT = "AT"
  AU = "AU"
  AW = "AW"
  AX = "AX"
  AZ = "AZ"
  BA = "BA"
  BB = "BB"
  BD = "BD"
  BE = "BE"
  BF = "BF"
  BG = "BG"
  BH = "BH"
  BI = "BI"
  BJ = "BJ"
  BL = "BL"
  BM = "BM"
  BN = "BN"
  BO = "BO"
  BQ = "BQ"
  BR = "BR"
  BS = "BS"
  BT = "BT"
  BV = "BV"
  BW = "BW"
  BY = "BY"
  BZ = "BZ"
  CA = "CA"
  CC = "CC"
  CD = "CD"
  CF = "CF"
  CG = "CG"
  CH = "CH"
  CI = "CI"
  CK = "CK"
  CL = "CL"
  CM = "CM"
  CN = "CN"
  CO = "CO"
  CR = "CR"
  CU = "CU"
  CV = "CV"
  CW = "CW"
  CX = "CX"
  CY = "CY"
  CZ = "CZ"
  DE = "DE"
  DJ = "DJ"
  DK = "DK"
  DM = "DM"
  DO = "DO"
  DZ = "DZ"
  EC = "EC"
  EE = "EE"
  EG = "EG"
  EH = "EH"
  ER = "ER"
  ES = "ES"
  ET = "ET"
  FI = "FI"
  FJ = "FJ"
  FK = "FK"
  FM = "FM"
  FO = "FO"
  FR = "FR"
  GA = "GA"
  GB = "GB"
  GD = "GD"
  GE = "GE"
  GF = "GF"
  GG = "GG"
  GH = "GH"
  GI = "GI"
  GL = "GL"
  GM = "GM"
  GN = "GN"
  GP = "GP"
  GQ = "GQ"
  GR = "GR"
  GS = "GS"
  GT = "GT"
  GU = "GU"
  GW = "GW"
  GY = "GY"
  HK = "HK"
  HM = "HM"
  HN = "HN"
  HR = "HR"
  HT = "HT"
  HU = "HU"
  ID = "ID"
  IE = "IE"
  IL = "IL"
  IM = "IM"
  IN = "IN"
  IO = "IO"
  IQ = "IQ"
  IR = "IR"
  IS = "IS"
  IT = "IT"
  JE = "JE"
  JM = "JM"
  JO = "JO"
  JP = "JP"
  KE = "KE"
  KG = "KG"
  KH = "KH"
  KI = "KI"
  KM = "KM"
  KN = "KN"
  KP = "KP"
  KR = "KR"
  KW = "KW"
  KY = "KY"
  KZ = "KZ"
  LA = "LA"
  LB = "LB"
  LC = "LC"
  LI = "LI"
  LK = "LK"
  LR = "LR"
  LS = "LS"
  LT = "LT"
  LU = "LU"
  LV = "LV"
  LY = "LY"
  MA = "MA"
  MC = "MC"
  MD = "MD"
  ME = "ME"
  MF = "MF"
  MG = "MG"
  MH = "MH"
  MK = "MK"
  ML = "ML"
  MM = "MM"
  MN = "MN"
  MO = "MO"
  MP = "MP"
  MQ = "MQ"
  MR = "MR"
  MS = "MS"
  MT = "MT"
  MU = "MU"
  MV = "MV"
  MW = "MW"
  MX = "MX"
  MY = "MY"
  MZ = "MZ"
  NA = "NA"
  NC = "NC"
  NE = "NE"
  NF = "NF"
  NG = "NG"
  NI = "NI"
  NL = "NL"
  NO = "NO"
  NP = "NP"
  NR = "NR"
  NU = "NU"
  NZ = "NZ"
  OM = "OM"
  PA = "PA"
  PE = "PE"
  PF = "PF"
  PG = "PG"
  PH = "PH"
  PK = "PK"
  PL = "PL"
  PM = "PM"
  PN = "PN"
  PR = "PR"
  PS = "PS"
  PT = "PT"
  PW = "PW"
  PY = "PY"
  QA = "QA"
  RE = "RE"
  RO = "RO"
  RS = "RS"
  RU = "RU"
  RW = "RW"
  SA = "SA"
  SB = "SB"
  SC = "SC"
  SD = "SD"
  SE = "SE"
  SG = "SG"
  SH = "SH"
  SI = "SI"
  SJ = "SJ"
  SK = "SK"
  SL = "SL"
  SM = "SM"
  SN = "SN"
  SO = "SO"
  SR = "SR"
  SS = "SS"
  ST = "ST"
  SV = "SV"
  SX = "SX"
  SY = "SY"
  SZ = "SZ"
  TC = "TC"
  TD = "TD"
  TF = "TF"
  TG = "TG"
  TH = "TH"
  TJ = "TJ"
  TK = "TK"
  TL = "TL"
  TM = "TM"
  TN = "TN"
  TO = "TO"
  TR = "TR"
  TT = "TT"
  TV = "TV"
  TW = "TW"
  TZ = "TZ"
  UA = "UA"
  UG = "UG"
  UM = "UM"
  US = "US"
  UY = "UY"
  UZ = "UZ"
  VA = "VA"
  VC = "VC"
  VE = "VE"
  VG = "VG"
  VI = "VI"
  VN = "VN"
  VU = "VU"
  WF = "WF"
  WS = "WS"
  XK = "XK"
  YE = "YE"
  YT = "YT"
  ZA = "ZA"
  ZM = "ZM"
  ZW = "ZW"


@dataclass
class AnalyticsCities:
  city: str
  """The name of the city"""

  clicks: float
  """The number of clicks from this city"""

  country: Country
  """The 2-letter country code of the city: https://d.to/geo"""

  leads: float
  """The number of leads from this city"""

  sale_amount: float
  """The total amount of sales from this city, in cents"""

  sales: float
  """The number of sales from this city"""


class Continent(Enum):
  """The 2-letter ISO 3166-1 code representing the continent associated with the location of
  the user.
  
  The continent to retrieve analytics for.
  """
  AF = "AF"
  AN = "AN"
  AS = "AS"
  EU = "EU"
  NA = "NA"
  OC = "OC"
  SA = "SA"


@dataclass
class AnalyticsContinents:
  clicks: float
  """The number of clicks from this continent"""

  continent: Continent
  """The 2-letter ISO 3166-1 code representing the continent associated with the location of
  the user.
  """
  leads: float
  """The number of leads from this continent"""

  sale_amount: float
  """The total amount of sales from this continent, in cents"""

  sales: float
  """The number of sales from this continent"""


@dataclass
class AnalyticsCount:
  clicks: float
  """The total number of clicks"""

  leads: float
  """The total number of leads"""

  sale_amount: float
  """The total amount of sales, in cents"""

  sales: float
  """The total number of sales"""


class City(Enum):
  EMPTY = "*"


@dataclass
class AnalyticsCountries:
  city: City
  clicks: float
  """The number of clicks from this country"""

  country: Country
  """The 2-letter ISO 3166-1 country code for the country associated with the location of the
  user. Learn more: https://d.to/geo
  """
  leads: float
  """The number of leads from this country"""

  sale_amount: float
  """The total amount of sales from this country, in cents"""

  sales: float
  """The number of sales from this country"""


@dataclass
class AnalyticsDevices:
  clicks: float
  """The number of clicks from this device"""

  device: str
  """The name of the device"""

  leads: float
  """The number of leads from this device"""

  sale_amount: float
  """The total amount of sales from this device, in cents"""

  sales: float
  """The number of sales from this device"""


@dataclass
class AnalyticsOS:
  clicks: float
  """The number of clicks from this OS"""

  leads: float
  """The number of leads from this OS"""

  os: str
  """The name of the OS"""

  sale_amount: float
  """The total amount of sales from this OS, in cents"""

  sales: float
  """The number of sales from this OS"""


@dataclass
class AnalyticsRefererUrls:
  clicks: float
  """The number of clicks from this referer to this URL"""

  leads: float
  """The number of leads from this referer to this URL"""

  referer_url: str
  """The full URL of the referer. If unknown, this will be `(direct)`"""

  sale_amount: float
  """The total amount of sales from this referer to this URL, in cents"""

  sales: float
  """The number of sales from this referer to this URL"""


@dataclass
class AnalyticsReferers:
  clicks: float
  """The number of clicks from this referer"""

  leads: float
  """The number of leads from this referer"""

  referer: str
  """The name of the referer. If unknown, this will be `(direct)`"""

  sale_amount: float
  """The total amount of sales from this referer, in cents"""

  sales: float
  """The number of sales from this referer"""


@dataclass
class AnalyticsTimeseries:
  clicks: float
  """The number of clicks in the interval"""

  leads: float
  """The number of leads in the interval"""

  sale_amount: float
  """The total amount of sales in the interval, in cents"""

  sales: float
  """The number of sales in the interval"""

  start: str
  """The starting timestamp of the interval"""


@dataclass
class AnalyticsTopLinks:
  clicks: float
  """The number of clicks from this link"""

  created_at: str
  """The creation timestamp of the short link"""

  domain: str
  """The domain of the short link"""

  id: str
  """The unique ID of the short link"""

  key: str
  """The key of the short link"""

  leads: float
  """The number of leads from this link"""

  link: str
  """The unique ID of the short link"""

  sale_amount: float
  """The total amount of sales from this link, in cents"""

  sales: float
  """The number of sales from this link"""

  short_link: str
  """The short link URL"""

  url: str
  """The destination URL of the short link"""


@dataclass
class AnalyticsTopUrls:
  clicks: float
  """The number of clicks from this URL"""

  leads: float
  """The number of leads from this URL"""

  sale_amount: float
  """The total amount of sales from this URL, in cents"""

  sales: float
  """The number of sales from this URL"""

  url: str
  """The destination URL"""


class Trigger(Enum):
  """The type of trigger method: link click or QR scan"""

  LINK = "link"
  QR = "qr"


@dataclass
class AnalyticsTriggers:
  clicks: float
  """The number of clicks from this trigger method"""

  leads: float
  """The number of leads from this trigger method"""

  sale_amount: float
  """The total amount of sales from this trigger method, in cents"""

  sales: float
  """The number of sales from this trigger method"""

  trigger: Trigger
  """The type of trigger method: link click or QR scan"""


@dataclass
class ClickEventClick:
  browser: str
  city: str
  continent: str
  country: str
  device: str
  id: str
  ip: str
  os: str
  referer: str
  referer_url: str
  region: str
  url: str
  qr: Optional[bool]


class ClickEventEvent(Enum):
  CLICK = "click"


@dataclass
class PurpleGeo:
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  ad: Optional[str]
  ae: Optional[str]
  af: Optional[str]
  ag: Optional[str]
  ai: Optional[str]
  al: Optional[str]
  am: Optional[str]
  ao: Optional[str]
  aq: Optional[str]
  ar: Optional[str]
  geo_as: Optional[str]
  at: Optional[str]
  au: Optional[str]
  aw: Optional[str]
  ax: Optional[str]
  az: Optional[str]
  ba: Optional[str]
  bb: Optional[str]
  bd: Optional[str]
  be: Optional[str]
  bf: Optional[str]
  bg: Optional[str]
  bh: Optional[str]
  bi: Optional[str]
  bj: Optional[str]
  bl: Optional[str]
  bm: Optional[str]
  bn: Optional[str]
  bo: Optional[str]
  bq: Optional[str]
  br: Optional[str]
  bs: Optional[str]
  bt: Optional[str]
  bv: Optional[str]
  bw: Optional[str]
  by: Optional[str]
  bz: Optional[str]
  ca: Optional[str]
  cc: Optional[str]
  cd: Optional[str]
  cf: Optional[str]
  cg: Optional[str]
  ch: Optional[str]
  ci: Optional[str]
  ck: Optional[str]
  cl: Optional[str]
  cm: Optional[str]
  cn: Optional[str]
  co: Optional[str]
  cr: Optional[str]
  cu: Optional[str]
  cv: Optional[str]
  cw: Optional[str]
  cx: Optional[str]
  cy: Optional[str]
  cz: Optional[str]
  de: Optional[str]
  dj: Optional[str]
  dk: Optional[str]
  dm: Optional[str]
  do: Optional[str]
  dz: Optional[str]
  ec: Optional[str]
  ee: Optional[str]
  eg: Optional[str]
  eh: Optional[str]
  er: Optional[str]
  es: Optional[str]
  et: Optional[str]
  fi: Optional[str]
  fj: Optional[str]
  fk: Optional[str]
  fm: Optional[str]
  fo: Optional[str]
  fr: Optional[str]
  ga: Optional[str]
  gb: Optional[str]
  gd: Optional[str]
  ge: Optional[str]
  gf: Optional[str]
  gg: Optional[str]
  gh: Optional[str]
  gi: Optional[str]
  gl: Optional[str]
  gm: Optional[str]
  gn: Optional[str]
  gp: Optional[str]
  gq: Optional[str]
  gr: Optional[str]
  gs: Optional[str]
  gt: Optional[str]
  gu: Optional[str]
  gw: Optional[str]
  gy: Optional[str]
  hk: Optional[str]
  hm: Optional[str]
  hn: Optional[str]
  hr: Optional[str]
  ht: Optional[str]
  hu: Optional[str]
  id: Optional[str]
  ie: Optional[str]
  il: Optional[str]
  im: Optional[str]
  geo_in: Optional[str]
  io: Optional[str]
  iq: Optional[str]
  ir: Optional[str]
  geo_is: Optional[str]
  it: Optional[str]
  je: Optional[str]
  jm: Optional[str]
  jo: Optional[str]
  jp: Optional[str]
  ke: Optional[str]
  kg: Optional[str]
  kh: Optional[str]
  ki: Optional[str]
  km: Optional[str]
  kn: Optional[str]
  kp: Optional[str]
  kr: Optional[str]
  kw: Optional[str]
  ky: Optional[str]
  kz: Optional[str]
  la: Optional[str]
  lb: Optional[str]
  lc: Optional[str]
  li: Optional[str]
  lk: Optional[str]
  lr: Optional[str]
  ls: Optional[str]
  lt: Optional[str]
  lu: Optional[str]
  lv: Optional[str]
  ly: Optional[str]
  ma: Optional[str]
  mc: Optional[str]
  md: Optional[str]
  me: Optional[str]
  mf: Optional[str]
  mg: Optional[str]
  mh: Optional[str]
  mk: Optional[str]
  ml: Optional[str]
  mm: Optional[str]
  mn: Optional[str]
  mo: Optional[str]
  mp: Optional[str]
  mq: Optional[str]
  mr: Optional[str]
  ms: Optional[str]
  mt: Optional[str]
  mu: Optional[str]
  mv: Optional[str]
  mw: Optional[str]
  mx: Optional[str]
  my: Optional[str]
  mz: Optional[str]
  na: Optional[str]
  nc: Optional[str]
  ne: Optional[str]
  nf: Optional[str]
  ng: Optional[str]
  ni: Optional[str]
  nl: Optional[str]
  no: Optional[str]
  np: Optional[str]
  nr: Optional[str]
  nu: Optional[str]
  nz: Optional[str]
  om: Optional[str]
  pa: Optional[str]
  pe: Optional[str]
  pf: Optional[str]
  pg: Optional[str]
  ph: Optional[str]
  pk: Optional[str]
  pl: Optional[str]
  pm: Optional[str]
  pn: Optional[str]
  pr: Optional[str]
  ps: Optional[str]
  pt: Optional[str]
  pw: Optional[str]
  py: Optional[str]
  qa: Optional[str]
  re: Optional[str]
  ro: Optional[str]
  rs: Optional[str]
  ru: Optional[str]
  rw: Optional[str]
  sa: Optional[str]
  sb: Optional[str]
  sc: Optional[str]
  sd: Optional[str]
  se: Optional[str]
  sg: Optional[str]
  sh: Optional[str]
  si: Optional[str]
  sj: Optional[str]
  sk: Optional[str]
  sl: Optional[str]
  sm: Optional[str]
  sn: Optional[str]
  so: Optional[str]
  sr: Optional[str]
  ss: Optional[str]
  st: Optional[str]
  sv: Optional[str]
  sx: Optional[str]
  sy: Optional[str]
  sz: Optional[str]
  tc: Optional[str]
  td: Optional[str]
  tf: Optional[str]
  tg: Optional[str]
  th: Optional[str]
  tj: Optional[str]
  tk: Optional[str]
  tl: Optional[str]
  tm: Optional[str]
  tn: Optional[str]
  to: Optional[str]
  tr: Optional[str]
  tt: Optional[str]
  tv: Optional[str]
  tw: Optional[str]
  tz: Optional[str]
  ua: Optional[str]
  ug: Optional[str]
  um: Optional[str]
  us: Optional[str]
  uy: Optional[str]
  uz: Optional[str]
  va: Optional[str]
  vc: Optional[str]
  ve: Optional[str]
  vg: Optional[str]
  vi: Optional[str]
  vn: Optional[str]
  vu: Optional[str]
  wf: Optional[str]
  ws: Optional[str]
  xk: Optional[str]
  ye: Optional[str]
  yt: Optional[str]
  za: Optional[str]
  zm: Optional[str]
  zw: Optional[str]


class Color(Enum):
  """The color of the tag."""

  BLUE = "blue"
  BROWN = "brown"
  GREEN = "green"
  PINK = "pink"
  PURPLE = "purple"
  RED = "red"
  YELLOW = "yellow"


@dataclass
class Tag:
  color: Color
  """The color of the tag."""

  id: str
  """The unique ID of the tag."""

  name: str
  """The name of the tag."""


@dataclass
class ClickEventLink:
  android: str
  """The Android destination URL for the short link for Android device targeting."""

  clicks: float
  """The number of clicks on the short link."""

  comments: str
  """The comments for the short link."""

  created_at: str
  description: str
  """The description of the short link generated via `api.dub.co/metatags`. Will be used for
  Custom Social Media Cards if `proxy` is true.
  """
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  expired_url: str
  expires_at: str
  external_id: str
  """This is the ID of the link in your database that is unique across your workspace. If set,
  it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
  when passed as a query parameter.
  """
  geo: PurpleGeo
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  id: str
  """The unique ID of the short link."""

  image: str
  """The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  ios: str
  """The iOS destination URL for the short link for iOS device targeting."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  last_clicked: str
  leads: float
  """[BETA]: The number of leads the short links has generated."""

  password: str
  """The password required to access the destination URL of the short link."""

  program_id: str
  """The ID of the program the short link is associated with."""

  project_id: str
  """The project ID of the short link. This field is deprecated – use `workspaceId` instead."""

  qr_code: str
  """The full URL of the QR code for the short link (e.g.
  `https://api.dub.co/qr?url=https://dub.sh/try`).
  """
  sale_amount: float
  """[BETA]: The total dollar amount of sales the short links has generated (in cents)."""

  sales: float
  """[BETA]: The number of sales the short links has generated."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""

  tag_id: str
  """The unique ID of the tag assigned to the short link. This field is deprecated – use
  `tags` instead.
  """
  tags: List[Tag]
  """The tags assigned to the short link."""

  title: str
  """The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  updated_at: str
  url: str
  user_id: str
  utm_campaign: str
  """The UTM campaign of the short link."""

  utm_content: str
  """The UTM content of the short link."""

  utm_medium: str
  """The UTM medium of the short link."""

  utm_source: str
  """The UTM source of the short link."""

  utm_term: str
  """The UTM term of the short link."""

  video: str
  """The custom link preview video (og:video). Will be used for Custom Social Media Cards if
  `proxy` is true. Learn more: https://d.to/og
  """
  webhook_ids: List[str]
  """The IDs of the webhooks that the short link is associated with."""

  workspace_id: str
  """The workspace ID of the short link."""

  archived: Optional[bool]
  do_index: Optional[bool]
  proxy: Optional[bool]
  public_stats: Optional[bool]
  rewrite: Optional[bool]
  track_conversion: Optional[bool]


@dataclass
class ClickEvent:
  browser: str
  """Deprecated. Use `click.browser` instead."""

  city: str
  """Deprecated. Use `click.city` instead."""

  click: ClickEventClick
  click_id: str
  """Deprecated. Use `click.id` instead."""

  continent: str
  """Deprecated. Use `click.continent` instead."""

  country: str
  """Deprecated. Use `click.country` instead."""

  device: str
  """Deprecated. Use `click.device` instead."""

  domain: str
  """Deprecated. Use `link.domain` instead."""

  event: ClickEventEvent
  ip: str
  """Deprecated. Use `click.ip` instead."""

  key: str
  """Deprecated. Use `link.key` instead."""

  link: ClickEventLink
  link_id: str
  """Deprecated. Use `link.id` instead."""

  os: str
  """Deprecated. Use `click.os` instead."""

  qr: float
  """Deprecated. Use `click.qr` instead."""

  url: str
  """Deprecated. Use `click.url` instead."""

  timestamp: Optional[str]


@dataclass
class RegisteredDomain:
  """The registered domain record."""

  created_at: str
  """The date the domain was created."""

  expires_at: str
  """The date the domain expires."""

  id: str
  """The ID of the registered domain record."""


@dataclass
class DomainSchema:
  archived: bool
  """Whether the domain is archived."""

  created_at: str
  """The date the domain was created."""

  expired_url: str
  """The URL to redirect to when a link under this domain has expired."""

  id: str
  """The unique identifier of the domain."""

  logo: str
  """The logo of the domain."""

  not_found_url: str
  """The URL to redirect to when a link under this domain doesn't exist."""

  placeholder: str
  """Provide context to your teammates in the link creation modal by showing them an example
  of a link to be shortened.
  """
  primary: bool
  """Whether the domain is the primary domain for the workspace."""

  registered_domain: RegisteredDomain
  """The registered domain record."""

  slug: str
  """The domain name."""

  updated_at: str
  """The date the domain was last updated."""

  verified: bool
  """Whether the domain is verified."""


@dataclass
class PurpleClick:
  browser: str
  city: str
  continent: str
  country: str
  device: str
  id: str
  ip: str
  os: str
  referer: str
  referer_url: str
  region: str
  url: str
  qr: Optional[bool]


class Interval(Enum):
  MONTH = "month"
  YEAR = "year"


class TypeEnum(Enum):
  FLAT = "flat"
  PERCENTAGE = "percentage"


@dataclass
class PurpleDiscount:
  amount: float
  coupon_id: str
  coupon_test_id: str
  duration: float
  id: str
  interval: Interval
  type: TypeEnum


@dataclass
class PurpleLink:
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  id: str
  """The unique ID of the short link."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  program_id: str
  """The ID of the program the short link is associated with."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""


@dataclass
class PurplePartner:
  email: str
  id: str
  name: str
  image: Optional[str]


@dataclass
class PurpleCustomer:
  created_at: str
  """The date the customer was created."""

  external_id: str
  """Unique identifier for the customer in the client's app."""

  id: str
  """The unique identifier of the customer in Dub."""

  name: str
  """Name of the customer."""

  avatar: Optional[str]
  """Avatar URL of the customer."""

  country: Optional[str]
  """Country of the customer."""

  discount: Optional[PurpleDiscount]
  email: Optional[str]
  """Email of the customer."""

  link: Optional[PurpleLink]
  partner: Optional[PurplePartner]


@dataclass
class FluffyGeo:
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  ad: Optional[str]
  ae: Optional[str]
  af: Optional[str]
  ag: Optional[str]
  ai: Optional[str]
  al: Optional[str]
  am: Optional[str]
  ao: Optional[str]
  aq: Optional[str]
  ar: Optional[str]
  geo_as: Optional[str]
  at: Optional[str]
  au: Optional[str]
  aw: Optional[str]
  ax: Optional[str]
  az: Optional[str]
  ba: Optional[str]
  bb: Optional[str]
  bd: Optional[str]
  be: Optional[str]
  bf: Optional[str]
  bg: Optional[str]
  bh: Optional[str]
  bi: Optional[str]
  bj: Optional[str]
  bl: Optional[str]
  bm: Optional[str]
  bn: Optional[str]
  bo: Optional[str]
  bq: Optional[str]
  br: Optional[str]
  bs: Optional[str]
  bt: Optional[str]
  bv: Optional[str]
  bw: Optional[str]
  by: Optional[str]
  bz: Optional[str]
  ca: Optional[str]
  cc: Optional[str]
  cd: Optional[str]
  cf: Optional[str]
  cg: Optional[str]
  ch: Optional[str]
  ci: Optional[str]
  ck: Optional[str]
  cl: Optional[str]
  cm: Optional[str]
  cn: Optional[str]
  co: Optional[str]
  cr: Optional[str]
  cu: Optional[str]
  cv: Optional[str]
  cw: Optional[str]
  cx: Optional[str]
  cy: Optional[str]
  cz: Optional[str]
  de: Optional[str]
  dj: Optional[str]
  dk: Optional[str]
  dm: Optional[str]
  do: Optional[str]
  dz: Optional[str]
  ec: Optional[str]
  ee: Optional[str]
  eg: Optional[str]
  eh: Optional[str]
  er: Optional[str]
  es: Optional[str]
  et: Optional[str]
  fi: Optional[str]
  fj: Optional[str]
  fk: Optional[str]
  fm: Optional[str]
  fo: Optional[str]
  fr: Optional[str]
  ga: Optional[str]
  gb: Optional[str]
  gd: Optional[str]
  ge: Optional[str]
  gf: Optional[str]
  gg: Optional[str]
  gh: Optional[str]
  gi: Optional[str]
  gl: Optional[str]
  gm: Optional[str]
  gn: Optional[str]
  gp: Optional[str]
  gq: Optional[str]
  gr: Optional[str]
  gs: Optional[str]
  gt: Optional[str]
  gu: Optional[str]
  gw: Optional[str]
  gy: Optional[str]
  hk: Optional[str]
  hm: Optional[str]
  hn: Optional[str]
  hr: Optional[str]
  ht: Optional[str]
  hu: Optional[str]
  id: Optional[str]
  ie: Optional[str]
  il: Optional[str]
  im: Optional[str]
  geo_in: Optional[str]
  io: Optional[str]
  iq: Optional[str]
  ir: Optional[str]
  geo_is: Optional[str]
  it: Optional[str]
  je: Optional[str]
  jm: Optional[str]
  jo: Optional[str]
  jp: Optional[str]
  ke: Optional[str]
  kg: Optional[str]
  kh: Optional[str]
  ki: Optional[str]
  km: Optional[str]
  kn: Optional[str]
  kp: Optional[str]
  kr: Optional[str]
  kw: Optional[str]
  ky: Optional[str]
  kz: Optional[str]
  la: Optional[str]
  lb: Optional[str]
  lc: Optional[str]
  li: Optional[str]
  lk: Optional[str]
  lr: Optional[str]
  ls: Optional[str]
  lt: Optional[str]
  lu: Optional[str]
  lv: Optional[str]
  ly: Optional[str]
  ma: Optional[str]
  mc: Optional[str]
  md: Optional[str]
  me: Optional[str]
  mf: Optional[str]
  mg: Optional[str]
  mh: Optional[str]
  mk: Optional[str]
  ml: Optional[str]
  mm: Optional[str]
  mn: Optional[str]
  mo: Optional[str]
  mp: Optional[str]
  mq: Optional[str]
  mr: Optional[str]
  ms: Optional[str]
  mt: Optional[str]
  mu: Optional[str]
  mv: Optional[str]
  mw: Optional[str]
  mx: Optional[str]
  my: Optional[str]
  mz: Optional[str]
  na: Optional[str]
  nc: Optional[str]
  ne: Optional[str]
  nf: Optional[str]
  ng: Optional[str]
  ni: Optional[str]
  nl: Optional[str]
  no: Optional[str]
  np: Optional[str]
  nr: Optional[str]
  nu: Optional[str]
  nz: Optional[str]
  om: Optional[str]
  pa: Optional[str]
  pe: Optional[str]
  pf: Optional[str]
  pg: Optional[str]
  ph: Optional[str]
  pk: Optional[str]
  pl: Optional[str]
  pm: Optional[str]
  pn: Optional[str]
  pr: Optional[str]
  ps: Optional[str]
  pt: Optional[str]
  pw: Optional[str]
  py: Optional[str]
  qa: Optional[str]
  re: Optional[str]
  ro: Optional[str]
  rs: Optional[str]
  ru: Optional[str]
  rw: Optional[str]
  sa: Optional[str]
  sb: Optional[str]
  sc: Optional[str]
  sd: Optional[str]
  se: Optional[str]
  sg: Optional[str]
  sh: Optional[str]
  si: Optional[str]
  sj: Optional[str]
  sk: Optional[str]
  sl: Optional[str]
  sm: Optional[str]
  sn: Optional[str]
  so: Optional[str]
  sr: Optional[str]
  ss: Optional[str]
  st: Optional[str]
  sv: Optional[str]
  sx: Optional[str]
  sy: Optional[str]
  sz: Optional[str]
  tc: Optional[str]
  td: Optional[str]
  tf: Optional[str]
  tg: Optional[str]
  th: Optional[str]
  tj: Optional[str]
  tk: Optional[str]
  tl: Optional[str]
  tm: Optional[str]
  tn: Optional[str]
  to: Optional[str]
  tr: Optional[str]
  tt: Optional[str]
  tv: Optional[str]
  tw: Optional[str]
  tz: Optional[str]
  ua: Optional[str]
  ug: Optional[str]
  um: Optional[str]
  us: Optional[str]
  uy: Optional[str]
  uz: Optional[str]
  va: Optional[str]
  vc: Optional[str]
  ve: Optional[str]
  vg: Optional[str]
  vi: Optional[str]
  vn: Optional[str]
  vu: Optional[str]
  wf: Optional[str]
  ws: Optional[str]
  xk: Optional[str]
  ye: Optional[str]
  yt: Optional[str]
  za: Optional[str]
  zm: Optional[str]
  zw: Optional[str]


@dataclass
class FluffyLink:
  android: str
  """The Android destination URL for the short link for Android device targeting."""

  clicks: float
  """The number of clicks on the short link."""

  comments: str
  """The comments for the short link."""

  created_at: str
  description: str
  """The description of the short link generated via `api.dub.co/metatags`. Will be used for
  Custom Social Media Cards if `proxy` is true.
  """
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  expired_url: str
  expires_at: str
  external_id: str
  """This is the ID of the link in your database that is unique across your workspace. If set,
  it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
  when passed as a query parameter.
  """
  geo: FluffyGeo
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  id: str
  """The unique ID of the short link."""

  image: str
  """The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  ios: str
  """The iOS destination URL for the short link for iOS device targeting."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  last_clicked: str
  leads: float
  """[BETA]: The number of leads the short links has generated."""

  password: str
  """The password required to access the destination URL of the short link."""

  program_id: str
  """The ID of the program the short link is associated with."""

  project_id: str
  """The project ID of the short link. This field is deprecated – use `workspaceId` instead."""

  qr_code: str
  """The full URL of the QR code for the short link (e.g.
  `https://api.dub.co/qr?url=https://dub.sh/try`).
  """
  sale_amount: float
  """[BETA]: The total dollar amount of sales the short links has generated (in cents)."""

  sales: float
  """[BETA]: The number of sales the short links has generated."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""

  tag_id: str
  """The unique ID of the tag assigned to the short link. This field is deprecated – use
  `tags` instead.
  """
  tags: List[Tag]
  """The tags assigned to the short link."""

  title: str
  """The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  updated_at: str
  url: str
  user_id: str
  utm_campaign: str
  """The UTM campaign of the short link."""

  utm_content: str
  """The UTM content of the short link."""

  utm_medium: str
  """The UTM medium of the short link."""

  utm_source: str
  """The UTM source of the short link."""

  utm_term: str
  """The UTM term of the short link."""

  video: str
  """The custom link preview video (og:video). Will be used for Custom Social Media Cards if
  `proxy` is true. Learn more: https://d.to/og
  """
  webhook_ids: List[str]
  """The IDs of the webhooks that the short link is associated with."""

  workspace_id: str
  """The workspace ID of the short link."""

  archived: Optional[bool]
  do_index: Optional[bool]
  proxy: Optional[bool]
  public_stats: Optional[bool]
  rewrite: Optional[bool]
  track_conversion: Optional[bool]


@dataclass
class LeadCreatedEventData:
  click: PurpleClick
  customer: PurpleCustomer
  event_name: str
  link: FluffyLink


class LeadCreatedEventEvent(Enum):
  LEAD_CREATED = "lead.created"


@dataclass
class LeadCreatedEvent:
  """Triggered when a lead is created."""

  created_at: str
  data: LeadCreatedEventData
  event: LeadCreatedEventEvent
  id: str


@dataclass
class LeadEventClick:
  browser: str
  city: str
  continent: str
  country: str
  device: str
  id: str
  ip: str
  os: str
  referer: str
  referer_url: str
  region: str
  url: str
  qr: Optional[bool]


@dataclass
class FluffyDiscount:
  amount: float
  coupon_id: str
  coupon_test_id: str
  duration: float
  id: str
  interval: Interval
  type: TypeEnum


@dataclass
class TentacledLink:
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  id: str
  """The unique ID of the short link."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  program_id: str
  """The ID of the program the short link is associated with."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""


@dataclass
class FluffyPartner:
  email: str
  id: str
  name: str
  image: Optional[str]


@dataclass
class LeadEventCustomer:
  created_at: str
  """The date the customer was created."""

  external_id: str
  """Unique identifier for the customer in the client's app."""

  id: str
  """The unique identifier of the customer in Dub."""

  name: str
  """Name of the customer."""

  avatar: Optional[str]
  """Avatar URL of the customer."""

  country: Optional[str]
  """Country of the customer."""

  discount: Optional[FluffyDiscount]
  email: Optional[str]
  """Email of the customer."""

  link: Optional[TentacledLink]
  partner: Optional[FluffyPartner]


class LeadEventEvent(Enum):
  LEAD = "lead"


@dataclass
class TentacledGeo:
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  ad: Optional[str]
  ae: Optional[str]
  af: Optional[str]
  ag: Optional[str]
  ai: Optional[str]
  al: Optional[str]
  am: Optional[str]
  ao: Optional[str]
  aq: Optional[str]
  ar: Optional[str]
  geo_as: Optional[str]
  at: Optional[str]
  au: Optional[str]
  aw: Optional[str]
  ax: Optional[str]
  az: Optional[str]
  ba: Optional[str]
  bb: Optional[str]
  bd: Optional[str]
  be: Optional[str]
  bf: Optional[str]
  bg: Optional[str]
  bh: Optional[str]
  bi: Optional[str]
  bj: Optional[str]
  bl: Optional[str]
  bm: Optional[str]
  bn: Optional[str]
  bo: Optional[str]
  bq: Optional[str]
  br: Optional[str]
  bs: Optional[str]
  bt: Optional[str]
  bv: Optional[str]
  bw: Optional[str]
  by: Optional[str]
  bz: Optional[str]
  ca: Optional[str]
  cc: Optional[str]
  cd: Optional[str]
  cf: Optional[str]
  cg: Optional[str]
  ch: Optional[str]
  ci: Optional[str]
  ck: Optional[str]
  cl: Optional[str]
  cm: Optional[str]
  cn: Optional[str]
  co: Optional[str]
  cr: Optional[str]
  cu: Optional[str]
  cv: Optional[str]
  cw: Optional[str]
  cx: Optional[str]
  cy: Optional[str]
  cz: Optional[str]
  de: Optional[str]
  dj: Optional[str]
  dk: Optional[str]
  dm: Optional[str]
  do: Optional[str]
  dz: Optional[str]
  ec: Optional[str]
  ee: Optional[str]
  eg: Optional[str]
  eh: Optional[str]
  er: Optional[str]
  es: Optional[str]
  et: Optional[str]
  fi: Optional[str]
  fj: Optional[str]
  fk: Optional[str]
  fm: Optional[str]
  fo: Optional[str]
  fr: Optional[str]
  ga: Optional[str]
  gb: Optional[str]
  gd: Optional[str]
  ge: Optional[str]
  gf: Optional[str]
  gg: Optional[str]
  gh: Optional[str]
  gi: Optional[str]
  gl: Optional[str]
  gm: Optional[str]
  gn: Optional[str]
  gp: Optional[str]
  gq: Optional[str]
  gr: Optional[str]
  gs: Optional[str]
  gt: Optional[str]
  gu: Optional[str]
  gw: Optional[str]
  gy: Optional[str]
  hk: Optional[str]
  hm: Optional[str]
  hn: Optional[str]
  hr: Optional[str]
  ht: Optional[str]
  hu: Optional[str]
  id: Optional[str]
  ie: Optional[str]
  il: Optional[str]
  im: Optional[str]
  geo_in: Optional[str]
  io: Optional[str]
  iq: Optional[str]
  ir: Optional[str]
  geo_is: Optional[str]
  it: Optional[str]
  je: Optional[str]
  jm: Optional[str]
  jo: Optional[str]
  jp: Optional[str]
  ke: Optional[str]
  kg: Optional[str]
  kh: Optional[str]
  ki: Optional[str]
  km: Optional[str]
  kn: Optional[str]
  kp: Optional[str]
  kr: Optional[str]
  kw: Optional[str]
  ky: Optional[str]
  kz: Optional[str]
  la: Optional[str]
  lb: Optional[str]
  lc: Optional[str]
  li: Optional[str]
  lk: Optional[str]
  lr: Optional[str]
  ls: Optional[str]
  lt: Optional[str]
  lu: Optional[str]
  lv: Optional[str]
  ly: Optional[str]
  ma: Optional[str]
  mc: Optional[str]
  md: Optional[str]
  me: Optional[str]
  mf: Optional[str]
  mg: Optional[str]
  mh: Optional[str]
  mk: Optional[str]
  ml: Optional[str]
  mm: Optional[str]
  mn: Optional[str]
  mo: Optional[str]
  mp: Optional[str]
  mq: Optional[str]
  mr: Optional[str]
  ms: Optional[str]
  mt: Optional[str]
  mu: Optional[str]
  mv: Optional[str]
  mw: Optional[str]
  mx: Optional[str]
  my: Optional[str]
  mz: Optional[str]
  na: Optional[str]
  nc: Optional[str]
  ne: Optional[str]
  nf: Optional[str]
  ng: Optional[str]
  ni: Optional[str]
  nl: Optional[str]
  no: Optional[str]
  np: Optional[str]
  nr: Optional[str]
  nu: Optional[str]
  nz: Optional[str]
  om: Optional[str]
  pa: Optional[str]
  pe: Optional[str]
  pf: Optional[str]
  pg: Optional[str]
  ph: Optional[str]
  pk: Optional[str]
  pl: Optional[str]
  pm: Optional[str]
  pn: Optional[str]
  pr: Optional[str]
  ps: Optional[str]
  pt: Optional[str]
  pw: Optional[str]
  py: Optional[str]
  qa: Optional[str]
  re: Optional[str]
  ro: Optional[str]
  rs: Optional[str]
  ru: Optional[str]
  rw: Optional[str]
  sa: Optional[str]
  sb: Optional[str]
  sc: Optional[str]
  sd: Optional[str]
  se: Optional[str]
  sg: Optional[str]
  sh: Optional[str]
  si: Optional[str]
  sj: Optional[str]
  sk: Optional[str]
  sl: Optional[str]
  sm: Optional[str]
  sn: Optional[str]
  so: Optional[str]
  sr: Optional[str]
  ss: Optional[str]
  st: Optional[str]
  sv: Optional[str]
  sx: Optional[str]
  sy: Optional[str]
  sz: Optional[str]
  tc: Optional[str]
  td: Optional[str]
  tf: Optional[str]
  tg: Optional[str]
  th: Optional[str]
  tj: Optional[str]
  tk: Optional[str]
  tl: Optional[str]
  tm: Optional[str]
  tn: Optional[str]
  to: Optional[str]
  tr: Optional[str]
  tt: Optional[str]
  tv: Optional[str]
  tw: Optional[str]
  tz: Optional[str]
  ua: Optional[str]
  ug: Optional[str]
  um: Optional[str]
  us: Optional[str]
  uy: Optional[str]
  uz: Optional[str]
  va: Optional[str]
  vc: Optional[str]
  ve: Optional[str]
  vg: Optional[str]
  vi: Optional[str]
  vn: Optional[str]
  vu: Optional[str]
  wf: Optional[str]
  ws: Optional[str]
  xk: Optional[str]
  ye: Optional[str]
  yt: Optional[str]
  za: Optional[str]
  zm: Optional[str]
  zw: Optional[str]


@dataclass
class LeadEventLink:
  android: str
  """The Android destination URL for the short link for Android device targeting."""

  clicks: float
  """The number of clicks on the short link."""

  comments: str
  """The comments for the short link."""

  created_at: str
  description: str
  """The description of the short link generated via `api.dub.co/metatags`. Will be used for
  Custom Social Media Cards if `proxy` is true.
  """
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  expired_url: str
  expires_at: str
  external_id: str
  """This is the ID of the link in your database that is unique across your workspace. If set,
  it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
  when passed as a query parameter.
  """
  geo: TentacledGeo
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  id: str
  """The unique ID of the short link."""

  image: str
  """The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  ios: str
  """The iOS destination URL for the short link for iOS device targeting."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  last_clicked: str
  leads: float
  """[BETA]: The number of leads the short links has generated."""

  password: str
  """The password required to access the destination URL of the short link."""

  program_id: str
  """The ID of the program the short link is associated with."""

  project_id: str
  """The project ID of the short link. This field is deprecated – use `workspaceId` instead."""

  qr_code: str
  """The full URL of the QR code for the short link (e.g.
  `https://api.dub.co/qr?url=https://dub.sh/try`).
  """
  sale_amount: float
  """[BETA]: The total dollar amount of sales the short links has generated (in cents)."""

  sales: float
  """[BETA]: The number of sales the short links has generated."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""

  tag_id: str
  """The unique ID of the tag assigned to the short link. This field is deprecated – use
  `tags` instead.
  """
  tags: List[Tag]
  """The tags assigned to the short link."""

  title: str
  """The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  updated_at: str
  url: str
  user_id: str
  utm_campaign: str
  """The UTM campaign of the short link."""

  utm_content: str
  """The UTM content of the short link."""

  utm_medium: str
  """The UTM medium of the short link."""

  utm_source: str
  """The UTM source of the short link."""

  utm_term: str
  """The UTM term of the short link."""

  video: str
  """The custom link preview video (og:video). Will be used for Custom Social Media Cards if
  `proxy` is true. Learn more: https://d.to/og
  """
  webhook_ids: List[str]
  """The IDs of the webhooks that the short link is associated with."""

  workspace_id: str
  """The workspace ID of the short link."""

  archived: Optional[bool]
  do_index: Optional[bool]
  proxy: Optional[bool]
  public_stats: Optional[bool]
  rewrite: Optional[bool]
  track_conversion: Optional[bool]


@dataclass
class LeadEvent:
  browser: str
  """Deprecated. Use `click.browser` instead."""

  city: str
  """Deprecated. Use `click.city` instead."""

  click: LeadEventClick
  click_id: str
  """Deprecated. Use `click.id` instead."""

  continent: str
  """Deprecated. Use `click.continent` instead."""

  country: str
  """Deprecated. Use `click.country` instead."""

  customer: LeadEventCustomer
  device: str
  """Deprecated. Use `click.device` instead."""

  domain: str
  """Deprecated. Use `link.domain` instead."""

  event: LeadEventEvent
  event_id: str
  event_name: str
  ip: str
  """Deprecated. Use `click.ip` instead."""

  key: str
  """Deprecated. Use `link.key` instead."""

  link: LeadEventLink
  link_id: str
  """Deprecated. Use `link.id` instead."""

  os: str
  """Deprecated. Use `click.os` instead."""

  qr: float
  """Deprecated. Use `click.qr` instead."""

  url: str
  """Deprecated. Use `click.url` instead."""

  timestamp: Optional[str]


@dataclass
class FluffyClick:
  browser: str
  city: str
  continent: str
  country: str
  device: str
  id: str
  ip: str
  os: str
  referer: str
  referer_url: str
  region: str
  url: str
  qr: Optional[bool]


@dataclass
class StickyGeo:
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  ad: Optional[str]
  ae: Optional[str]
  af: Optional[str]
  ag: Optional[str]
  ai: Optional[str]
  al: Optional[str]
  am: Optional[str]
  ao: Optional[str]
  aq: Optional[str]
  ar: Optional[str]
  geo_as: Optional[str]
  at: Optional[str]
  au: Optional[str]
  aw: Optional[str]
  ax: Optional[str]
  az: Optional[str]
  ba: Optional[str]
  bb: Optional[str]
  bd: Optional[str]
  be: Optional[str]
  bf: Optional[str]
  bg: Optional[str]
  bh: Optional[str]
  bi: Optional[str]
  bj: Optional[str]
  bl: Optional[str]
  bm: Optional[str]
  bn: Optional[str]
  bo: Optional[str]
  bq: Optional[str]
  br: Optional[str]
  bs: Optional[str]
  bt: Optional[str]
  bv: Optional[str]
  bw: Optional[str]
  by: Optional[str]
  bz: Optional[str]
  ca: Optional[str]
  cc: Optional[str]
  cd: Optional[str]
  cf: Optional[str]
  cg: Optional[str]
  ch: Optional[str]
  ci: Optional[str]
  ck: Optional[str]
  cl: Optional[str]
  cm: Optional[str]
  cn: Optional[str]
  co: Optional[str]
  cr: Optional[str]
  cu: Optional[str]
  cv: Optional[str]
  cw: Optional[str]
  cx: Optional[str]
  cy: Optional[str]
  cz: Optional[str]
  de: Optional[str]
  dj: Optional[str]
  dk: Optional[str]
  dm: Optional[str]
  do: Optional[str]
  dz: Optional[str]
  ec: Optional[str]
  ee: Optional[str]
  eg: Optional[str]
  eh: Optional[str]
  er: Optional[str]
  es: Optional[str]
  et: Optional[str]
  fi: Optional[str]
  fj: Optional[str]
  fk: Optional[str]
  fm: Optional[str]
  fo: Optional[str]
  fr: Optional[str]
  ga: Optional[str]
  gb: Optional[str]
  gd: Optional[str]
  ge: Optional[str]
  gf: Optional[str]
  gg: Optional[str]
  gh: Optional[str]
  gi: Optional[str]
  gl: Optional[str]
  gm: Optional[str]
  gn: Optional[str]
  gp: Optional[str]
  gq: Optional[str]
  gr: Optional[str]
  gs: Optional[str]
  gt: Optional[str]
  gu: Optional[str]
  gw: Optional[str]
  gy: Optional[str]
  hk: Optional[str]
  hm: Optional[str]
  hn: Optional[str]
  hr: Optional[str]
  ht: Optional[str]
  hu: Optional[str]
  id: Optional[str]
  ie: Optional[str]
  il: Optional[str]
  im: Optional[str]
  geo_in: Optional[str]
  io: Optional[str]
  iq: Optional[str]
  ir: Optional[str]
  geo_is: Optional[str]
  it: Optional[str]
  je: Optional[str]
  jm: Optional[str]
  jo: Optional[str]
  jp: Optional[str]
  ke: Optional[str]
  kg: Optional[str]
  kh: Optional[str]
  ki: Optional[str]
  km: Optional[str]
  kn: Optional[str]
  kp: Optional[str]
  kr: Optional[str]
  kw: Optional[str]
  ky: Optional[str]
  kz: Optional[str]
  la: Optional[str]
  lb: Optional[str]
  lc: Optional[str]
  li: Optional[str]
  lk: Optional[str]
  lr: Optional[str]
  ls: Optional[str]
  lt: Optional[str]
  lu: Optional[str]
  lv: Optional[str]
  ly: Optional[str]
  ma: Optional[str]
  mc: Optional[str]
  md: Optional[str]
  me: Optional[str]
  mf: Optional[str]
  mg: Optional[str]
  mh: Optional[str]
  mk: Optional[str]
  ml: Optional[str]
  mm: Optional[str]
  mn: Optional[str]
  mo: Optional[str]
  mp: Optional[str]
  mq: Optional[str]
  mr: Optional[str]
  ms: Optional[str]
  mt: Optional[str]
  mu: Optional[str]
  mv: Optional[str]
  mw: Optional[str]
  mx: Optional[str]
  my: Optional[str]
  mz: Optional[str]
  na: Optional[str]
  nc: Optional[str]
  ne: Optional[str]
  nf: Optional[str]
  ng: Optional[str]
  ni: Optional[str]
  nl: Optional[str]
  no: Optional[str]
  np: Optional[str]
  nr: Optional[str]
  nu: Optional[str]
  nz: Optional[str]
  om: Optional[str]
  pa: Optional[str]
  pe: Optional[str]
  pf: Optional[str]
  pg: Optional[str]
  ph: Optional[str]
  pk: Optional[str]
  pl: Optional[str]
  pm: Optional[str]
  pn: Optional[str]
  pr: Optional[str]
  ps: Optional[str]
  pt: Optional[str]
  pw: Optional[str]
  py: Optional[str]
  qa: Optional[str]
  re: Optional[str]
  ro: Optional[str]
  rs: Optional[str]
  ru: Optional[str]
  rw: Optional[str]
  sa: Optional[str]
  sb: Optional[str]
  sc: Optional[str]
  sd: Optional[str]
  se: Optional[str]
  sg: Optional[str]
  sh: Optional[str]
  si: Optional[str]
  sj: Optional[str]
  sk: Optional[str]
  sl: Optional[str]
  sm: Optional[str]
  sn: Optional[str]
  so: Optional[str]
  sr: Optional[str]
  ss: Optional[str]
  st: Optional[str]
  sv: Optional[str]
  sx: Optional[str]
  sy: Optional[str]
  sz: Optional[str]
  tc: Optional[str]
  td: Optional[str]
  tf: Optional[str]
  tg: Optional[str]
  th: Optional[str]
  tj: Optional[str]
  tk: Optional[str]
  tl: Optional[str]
  tm: Optional[str]
  tn: Optional[str]
  to: Optional[str]
  tr: Optional[str]
  tt: Optional[str]
  tv: Optional[str]
  tw: Optional[str]
  tz: Optional[str]
  ua: Optional[str]
  ug: Optional[str]
  um: Optional[str]
  us: Optional[str]
  uy: Optional[str]
  uz: Optional[str]
  va: Optional[str]
  vc: Optional[str]
  ve: Optional[str]
  vg: Optional[str]
  vi: Optional[str]
  vn: Optional[str]
  vu: Optional[str]
  wf: Optional[str]
  ws: Optional[str]
  xk: Optional[str]
  ye: Optional[str]
  yt: Optional[str]
  za: Optional[str]
  zm: Optional[str]
  zw: Optional[str]


@dataclass
class StickyLink:
  android: str
  """The Android destination URL for the short link for Android device targeting."""

  clicks: float
  """The number of clicks on the short link."""

  comments: str
  """The comments for the short link."""

  created_at: str
  description: str
  """The description of the short link generated via `api.dub.co/metatags`. Will be used for
  Custom Social Media Cards if `proxy` is true.
  """
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  expired_url: str
  expires_at: str
  external_id: str
  """This is the ID of the link in your database that is unique across your workspace. If set,
  it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
  when passed as a query parameter.
  """
  geo: StickyGeo
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  id: str
  """The unique ID of the short link."""

  image: str
  """The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  ios: str
  """The iOS destination URL for the short link for iOS device targeting."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  last_clicked: str
  leads: float
  """[BETA]: The number of leads the short links has generated."""

  password: str
  """The password required to access the destination URL of the short link."""

  program_id: str
  """The ID of the program the short link is associated with."""

  project_id: str
  """The project ID of the short link. This field is deprecated – use `workspaceId` instead."""

  qr_code: str
  """The full URL of the QR code for the short link (e.g.
  `https://api.dub.co/qr?url=https://dub.sh/try`).
  """
  sale_amount: float
  """[BETA]: The total dollar amount of sales the short links has generated (in cents)."""

  sales: float
  """[BETA]: The number of sales the short links has generated."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""

  tag_id: str
  """The unique ID of the tag assigned to the short link. This field is deprecated – use
  `tags` instead.
  """
  tags: List[Tag]
  """The tags assigned to the short link."""

  title: str
  """The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  updated_at: str
  url: str
  user_id: str
  utm_campaign: str
  """The UTM campaign of the short link."""

  utm_content: str
  """The UTM content of the short link."""

  utm_medium: str
  """The UTM medium of the short link."""

  utm_source: str
  """The UTM source of the short link."""

  utm_term: str
  """The UTM term of the short link."""

  video: str
  """The custom link preview video (og:video). Will be used for Custom Social Media Cards if
  `proxy` is true. Learn more: https://d.to/og
  """
  webhook_ids: List[str]
  """The IDs of the webhooks that the short link is associated with."""

  workspace_id: str
  """The workspace ID of the short link."""

  archived: Optional[bool]
  do_index: Optional[bool]
  proxy: Optional[bool]
  public_stats: Optional[bool]
  rewrite: Optional[bool]
  track_conversion: Optional[bool]


@dataclass
class LinkClickedEventData:
  click: FluffyClick
  link: StickyLink


class LinkClickedEventEvent(Enum):
  LINK_CLICKED = "link.clicked"


@dataclass
class LinkClickedEvent:
  """Triggered when a link is clicked."""

  created_at: str
  data: LinkClickedEventData
  event: LinkClickedEventEvent
  id: str


@dataclass
class LinkGeoTargeting:
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`.
  """
  ad: Optional[str]
  ae: Optional[str]
  af: Optional[str]
  ag: Optional[str]
  ai: Optional[str]
  al: Optional[str]
  am: Optional[str]
  ao: Optional[str]
  aq: Optional[str]
  ar: Optional[str]
  link_geo_targeting_as: Optional[str]
  at: Optional[str]
  au: Optional[str]
  aw: Optional[str]
  ax: Optional[str]
  az: Optional[str]
  ba: Optional[str]
  bb: Optional[str]
  bd: Optional[str]
  be: Optional[str]
  bf: Optional[str]
  bg: Optional[str]
  bh: Optional[str]
  bi: Optional[str]
  bj: Optional[str]
  bl: Optional[str]
  bm: Optional[str]
  bn: Optional[str]
  bo: Optional[str]
  bq: Optional[str]
  br: Optional[str]
  bs: Optional[str]
  bt: Optional[str]
  bv: Optional[str]
  bw: Optional[str]
  by: Optional[str]
  bz: Optional[str]
  ca: Optional[str]
  cc: Optional[str]
  cd: Optional[str]
  cf: Optional[str]
  cg: Optional[str]
  ch: Optional[str]
  ci: Optional[str]
  ck: Optional[str]
  cl: Optional[str]
  cm: Optional[str]
  cn: Optional[str]
  co: Optional[str]
  cr: Optional[str]
  cu: Optional[str]
  cv: Optional[str]
  cw: Optional[str]
  cx: Optional[str]
  cy: Optional[str]
  cz: Optional[str]
  de: Optional[str]
  dj: Optional[str]
  dk: Optional[str]
  dm: Optional[str]
  do: Optional[str]
  dz: Optional[str]
  ec: Optional[str]
  ee: Optional[str]
  eg: Optional[str]
  eh: Optional[str]
  er: Optional[str]
  es: Optional[str]
  et: Optional[str]
  fi: Optional[str]
  fj: Optional[str]
  fk: Optional[str]
  fm: Optional[str]
  fo: Optional[str]
  fr: Optional[str]
  ga: Optional[str]
  gb: Optional[str]
  gd: Optional[str]
  ge: Optional[str]
  gf: Optional[str]
  gg: Optional[str]
  gh: Optional[str]
  gi: Optional[str]
  gl: Optional[str]
  gm: Optional[str]
  gn: Optional[str]
  gp: Optional[str]
  gq: Optional[str]
  gr: Optional[str]
  gs: Optional[str]
  gt: Optional[str]
  gu: Optional[str]
  gw: Optional[str]
  gy: Optional[str]
  hk: Optional[str]
  hm: Optional[str]
  hn: Optional[str]
  hr: Optional[str]
  ht: Optional[str]
  hu: Optional[str]
  id: Optional[str]
  ie: Optional[str]
  il: Optional[str]
  im: Optional[str]
  link_geo_targeting_in: Optional[str]
  io: Optional[str]
  iq: Optional[str]
  ir: Optional[str]
  link_geo_targeting_is: Optional[str]
  it: Optional[str]
  je: Optional[str]
  jm: Optional[str]
  jo: Optional[str]
  jp: Optional[str]
  ke: Optional[str]
  kg: Optional[str]
  kh: Optional[str]
  ki: Optional[str]
  km: Optional[str]
  kn: Optional[str]
  kp: Optional[str]
  kr: Optional[str]
  kw: Optional[str]
  ky: Optional[str]
  kz: Optional[str]
  la: Optional[str]
  lb: Optional[str]
  lc: Optional[str]
  li: Optional[str]
  lk: Optional[str]
  lr: Optional[str]
  ls: Optional[str]
  lt: Optional[str]
  lu: Optional[str]
  lv: Optional[str]
  ly: Optional[str]
  ma: Optional[str]
  mc: Optional[str]
  md: Optional[str]
  me: Optional[str]
  mf: Optional[str]
  mg: Optional[str]
  mh: Optional[str]
  mk: Optional[str]
  ml: Optional[str]
  mm: Optional[str]
  mn: Optional[str]
  mo: Optional[str]
  mp: Optional[str]
  mq: Optional[str]
  mr: Optional[str]
  ms: Optional[str]
  mt: Optional[str]
  mu: Optional[str]
  mv: Optional[str]
  mw: Optional[str]
  mx: Optional[str]
  my: Optional[str]
  mz: Optional[str]
  na: Optional[str]
  nc: Optional[str]
  ne: Optional[str]
  nf: Optional[str]
  ng: Optional[str]
  ni: Optional[str]
  nl: Optional[str]
  no: Optional[str]
  np: Optional[str]
  nr: Optional[str]
  nu: Optional[str]
  nz: Optional[str]
  om: Optional[str]
  pa: Optional[str]
  pe: Optional[str]
  pf: Optional[str]
  pg: Optional[str]
  ph: Optional[str]
  pk: Optional[str]
  pl: Optional[str]
  pm: Optional[str]
  pn: Optional[str]
  pr: Optional[str]
  ps: Optional[str]
  pt: Optional[str]
  pw: Optional[str]
  py: Optional[str]
  qa: Optional[str]
  re: Optional[str]
  ro: Optional[str]
  rs: Optional[str]
  ru: Optional[str]
  rw: Optional[str]
  sa: Optional[str]
  sb: Optional[str]
  sc: Optional[str]
  sd: Optional[str]
  se: Optional[str]
  sg: Optional[str]
  sh: Optional[str]
  si: Optional[str]
  sj: Optional[str]
  sk: Optional[str]
  sl: Optional[str]
  sm: Optional[str]
  sn: Optional[str]
  so: Optional[str]
  sr: Optional[str]
  ss: Optional[str]
  st: Optional[str]
  sv: Optional[str]
  sx: Optional[str]
  sy: Optional[str]
  sz: Optional[str]
  tc: Optional[str]
  td: Optional[str]
  tf: Optional[str]
  tg: Optional[str]
  th: Optional[str]
  tj: Optional[str]
  tk: Optional[str]
  tl: Optional[str]
  tm: Optional[str]
  tn: Optional[str]
  to: Optional[str]
  tr: Optional[str]
  tt: Optional[str]
  tv: Optional[str]
  tw: Optional[str]
  tz: Optional[str]
  ua: Optional[str]
  ug: Optional[str]
  um: Optional[str]
  us: Optional[str]
  uy: Optional[str]
  uz: Optional[str]
  va: Optional[str]
  vc: Optional[str]
  ve: Optional[str]
  vg: Optional[str]
  vi: Optional[str]
  vn: Optional[str]
  vu: Optional[str]
  wf: Optional[str]
  ws: Optional[str]
  xk: Optional[str]
  ye: Optional[str]
  yt: Optional[str]
  za: Optional[str]
  zm: Optional[str]
  zw: Optional[str]


@dataclass
class LinkSchemaGeo:
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  ad: Optional[str]
  ae: Optional[str]
  af: Optional[str]
  ag: Optional[str]
  ai: Optional[str]
  al: Optional[str]
  am: Optional[str]
  ao: Optional[str]
  aq: Optional[str]
  ar: Optional[str]
  geo_as: Optional[str]
  at: Optional[str]
  au: Optional[str]
  aw: Optional[str]
  ax: Optional[str]
  az: Optional[str]
  ba: Optional[str]
  bb: Optional[str]
  bd: Optional[str]
  be: Optional[str]
  bf: Optional[str]
  bg: Optional[str]
  bh: Optional[str]
  bi: Optional[str]
  bj: Optional[str]
  bl: Optional[str]
  bm: Optional[str]
  bn: Optional[str]
  bo: Optional[str]
  bq: Optional[str]
  br: Optional[str]
  bs: Optional[str]
  bt: Optional[str]
  bv: Optional[str]
  bw: Optional[str]
  by: Optional[str]
  bz: Optional[str]
  ca: Optional[str]
  cc: Optional[str]
  cd: Optional[str]
  cf: Optional[str]
  cg: Optional[str]
  ch: Optional[str]
  ci: Optional[str]
  ck: Optional[str]
  cl: Optional[str]
  cm: Optional[str]
  cn: Optional[str]
  co: Optional[str]
  cr: Optional[str]
  cu: Optional[str]
  cv: Optional[str]
  cw: Optional[str]
  cx: Optional[str]
  cy: Optional[str]
  cz: Optional[str]
  de: Optional[str]
  dj: Optional[str]
  dk: Optional[str]
  dm: Optional[str]
  do: Optional[str]
  dz: Optional[str]
  ec: Optional[str]
  ee: Optional[str]
  eg: Optional[str]
  eh: Optional[str]
  er: Optional[str]
  es: Optional[str]
  et: Optional[str]
  fi: Optional[str]
  fj: Optional[str]
  fk: Optional[str]
  fm: Optional[str]
  fo: Optional[str]
  fr: Optional[str]
  ga: Optional[str]
  gb: Optional[str]
  gd: Optional[str]
  ge: Optional[str]
  gf: Optional[str]
  gg: Optional[str]
  gh: Optional[str]
  gi: Optional[str]
  gl: Optional[str]
  gm: Optional[str]
  gn: Optional[str]
  gp: Optional[str]
  gq: Optional[str]
  gr: Optional[str]
  gs: Optional[str]
  gt: Optional[str]
  gu: Optional[str]
  gw: Optional[str]
  gy: Optional[str]
  hk: Optional[str]
  hm: Optional[str]
  hn: Optional[str]
  hr: Optional[str]
  ht: Optional[str]
  hu: Optional[str]
  id: Optional[str]
  ie: Optional[str]
  il: Optional[str]
  im: Optional[str]
  geo_in: Optional[str]
  io: Optional[str]
  iq: Optional[str]
  ir: Optional[str]
  geo_is: Optional[str]
  it: Optional[str]
  je: Optional[str]
  jm: Optional[str]
  jo: Optional[str]
  jp: Optional[str]
  ke: Optional[str]
  kg: Optional[str]
  kh: Optional[str]
  ki: Optional[str]
  km: Optional[str]
  kn: Optional[str]
  kp: Optional[str]
  kr: Optional[str]
  kw: Optional[str]
  ky: Optional[str]
  kz: Optional[str]
  la: Optional[str]
  lb: Optional[str]
  lc: Optional[str]
  li: Optional[str]
  lk: Optional[str]
  lr: Optional[str]
  ls: Optional[str]
  lt: Optional[str]
  lu: Optional[str]
  lv: Optional[str]
  ly: Optional[str]
  ma: Optional[str]
  mc: Optional[str]
  md: Optional[str]
  me: Optional[str]
  mf: Optional[str]
  mg: Optional[str]
  mh: Optional[str]
  mk: Optional[str]
  ml: Optional[str]
  mm: Optional[str]
  mn: Optional[str]
  mo: Optional[str]
  mp: Optional[str]
  mq: Optional[str]
  mr: Optional[str]
  ms: Optional[str]
  mt: Optional[str]
  mu: Optional[str]
  mv: Optional[str]
  mw: Optional[str]
  mx: Optional[str]
  my: Optional[str]
  mz: Optional[str]
  na: Optional[str]
  nc: Optional[str]
  ne: Optional[str]
  nf: Optional[str]
  ng: Optional[str]
  ni: Optional[str]
  nl: Optional[str]
  no: Optional[str]
  np: Optional[str]
  nr: Optional[str]
  nu: Optional[str]
  nz: Optional[str]
  om: Optional[str]
  pa: Optional[str]
  pe: Optional[str]
  pf: Optional[str]
  pg: Optional[str]
  ph: Optional[str]
  pk: Optional[str]
  pl: Optional[str]
  pm: Optional[str]
  pn: Optional[str]
  pr: Optional[str]
  ps: Optional[str]
  pt: Optional[str]
  pw: Optional[str]
  py: Optional[str]
  qa: Optional[str]
  re: Optional[str]
  ro: Optional[str]
  rs: Optional[str]
  ru: Optional[str]
  rw: Optional[str]
  sa: Optional[str]
  sb: Optional[str]
  sc: Optional[str]
  sd: Optional[str]
  se: Optional[str]
  sg: Optional[str]
  sh: Optional[str]
  si: Optional[str]
  sj: Optional[str]
  sk: Optional[str]
  sl: Optional[str]
  sm: Optional[str]
  sn: Optional[str]
  so: Optional[str]
  sr: Optional[str]
  ss: Optional[str]
  st: Optional[str]
  sv: Optional[str]
  sx: Optional[str]
  sy: Optional[str]
  sz: Optional[str]
  tc: Optional[str]
  td: Optional[str]
  tf: Optional[str]
  tg: Optional[str]
  th: Optional[str]
  tj: Optional[str]
  tk: Optional[str]
  tl: Optional[str]
  tm: Optional[str]
  tn: Optional[str]
  to: Optional[str]
  tr: Optional[str]
  tt: Optional[str]
  tv: Optional[str]
  tw: Optional[str]
  tz: Optional[str]
  ua: Optional[str]
  ug: Optional[str]
  um: Optional[str]
  us: Optional[str]
  uy: Optional[str]
  uz: Optional[str]
  va: Optional[str]
  vc: Optional[str]
  ve: Optional[str]
  vg: Optional[str]
  vi: Optional[str]
  vn: Optional[str]
  vu: Optional[str]
  wf: Optional[str]
  ws: Optional[str]
  xk: Optional[str]
  ye: Optional[str]
  yt: Optional[str]
  za: Optional[str]
  zm: Optional[str]
  zw: Optional[str]


@dataclass
class Link:
  android: str
  """The Android destination URL for the short link for Android device targeting."""

  archived: bool
  """Whether the short link is archived."""

  clicks: float
  """The number of clicks on the short link."""

  comments: str
  """The comments for the short link."""

  created_at: str
  """The date and time when the short link was created."""

  description: str
  """The description of the short link generated via `api.dub.co/metatags`. Will be used for
  Custom Social Media Cards if `proxy` is true.
  """
  do_index: bool
  """Whether to allow search engines to index the short link."""

  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  expired_url: str
  """The URL to redirect to when the short link has expired."""

  expires_at: str
  """The date and time when the short link will expire in ISO-8601 format."""

  external_id: str
  """This is the ID of the link in your database that is unique across your workspace. If set,
  it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
  when passed as a query parameter.
  """
  geo: LinkSchemaGeo
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  id: str
  """The unique ID of the short link."""

  image: str
  """The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  ios: str
  """The iOS destination URL for the short link for iOS device targeting."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  last_clicked: str
  """The date and time when the short link was last clicked."""

  leads: float
  """[BETA]: The number of leads the short links has generated."""

  password: str
  """The password required to access the destination URL of the short link."""

  program_id: str
  """The ID of the program the short link is associated with."""

  project_id: str
  """The project ID of the short link. This field is deprecated – use `workspaceId` instead."""

  proxy: bool
  """Whether the short link uses Custom Social Media Cards feature."""

  public_stats: bool
  """Whether the short link's stats are publicly accessible."""

  qr_code: str
  """The full URL of the QR code for the short link (e.g.
  `https://api.dub.co/qr?url=https://dub.sh/try`).
  """
  rewrite: bool
  """Whether the short link uses link cloaking."""

  sale_amount: float
  """[BETA]: The total dollar amount of sales the short links has generated (in cents)."""

  sales: float
  """[BETA]: The number of sales the short links has generated."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""

  tag_id: str
  """The unique ID of the tag assigned to the short link. This field is deprecated – use
  `tags` instead.
  """
  tags: List[Tag]
  """The tags assigned to the short link."""

  title: str
  """The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  track_conversion: bool
  """[BETA] Whether to track conversions for the short link."""

  updated_at: str
  """The date and time when the short link was last updated."""

  url: str
  """The destination URL of the short link."""

  user_id: str
  """The user ID of the creator of the short link."""

  utm_campaign: str
  """The UTM campaign of the short link."""

  utm_content: str
  """The UTM content of the short link."""

  utm_medium: str
  """The UTM medium of the short link."""

  utm_source: str
  """The UTM source of the short link."""

  utm_term: str
  """The UTM term of the short link."""

  video: str
  """The custom link preview video (og:video). Will be used for Custom Social Media Cards if
  `proxy` is true. Learn more: https://d.to/og
  """
  webhook_ids: List[str]
  """The IDs of the webhooks that the short link is associated with."""

  workspace_id: str
  """The workspace ID of the short link."""


@dataclass
class DataGeo:
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  ad: Optional[str]
  ae: Optional[str]
  af: Optional[str]
  ag: Optional[str]
  ai: Optional[str]
  al: Optional[str]
  am: Optional[str]
  ao: Optional[str]
  aq: Optional[str]
  ar: Optional[str]
  geo_as: Optional[str]
  at: Optional[str]
  au: Optional[str]
  aw: Optional[str]
  ax: Optional[str]
  az: Optional[str]
  ba: Optional[str]
  bb: Optional[str]
  bd: Optional[str]
  be: Optional[str]
  bf: Optional[str]
  bg: Optional[str]
  bh: Optional[str]
  bi: Optional[str]
  bj: Optional[str]
  bl: Optional[str]
  bm: Optional[str]
  bn: Optional[str]
  bo: Optional[str]
  bq: Optional[str]
  br: Optional[str]
  bs: Optional[str]
  bt: Optional[str]
  bv: Optional[str]
  bw: Optional[str]
  by: Optional[str]
  bz: Optional[str]
  ca: Optional[str]
  cc: Optional[str]
  cd: Optional[str]
  cf: Optional[str]
  cg: Optional[str]
  ch: Optional[str]
  ci: Optional[str]
  ck: Optional[str]
  cl: Optional[str]
  cm: Optional[str]
  cn: Optional[str]
  co: Optional[str]
  cr: Optional[str]
  cu: Optional[str]
  cv: Optional[str]
  cw: Optional[str]
  cx: Optional[str]
  cy: Optional[str]
  cz: Optional[str]
  de: Optional[str]
  dj: Optional[str]
  dk: Optional[str]
  dm: Optional[str]
  do: Optional[str]
  dz: Optional[str]
  ec: Optional[str]
  ee: Optional[str]
  eg: Optional[str]
  eh: Optional[str]
  er: Optional[str]
  es: Optional[str]
  et: Optional[str]
  fi: Optional[str]
  fj: Optional[str]
  fk: Optional[str]
  fm: Optional[str]
  fo: Optional[str]
  fr: Optional[str]
  ga: Optional[str]
  gb: Optional[str]
  gd: Optional[str]
  ge: Optional[str]
  gf: Optional[str]
  gg: Optional[str]
  gh: Optional[str]
  gi: Optional[str]
  gl: Optional[str]
  gm: Optional[str]
  gn: Optional[str]
  gp: Optional[str]
  gq: Optional[str]
  gr: Optional[str]
  gs: Optional[str]
  gt: Optional[str]
  gu: Optional[str]
  gw: Optional[str]
  gy: Optional[str]
  hk: Optional[str]
  hm: Optional[str]
  hn: Optional[str]
  hr: Optional[str]
  ht: Optional[str]
  hu: Optional[str]
  id: Optional[str]
  ie: Optional[str]
  il: Optional[str]
  im: Optional[str]
  geo_in: Optional[str]
  io: Optional[str]
  iq: Optional[str]
  ir: Optional[str]
  geo_is: Optional[str]
  it: Optional[str]
  je: Optional[str]
  jm: Optional[str]
  jo: Optional[str]
  jp: Optional[str]
  ke: Optional[str]
  kg: Optional[str]
  kh: Optional[str]
  ki: Optional[str]
  km: Optional[str]
  kn: Optional[str]
  kp: Optional[str]
  kr: Optional[str]
  kw: Optional[str]
  ky: Optional[str]
  kz: Optional[str]
  la: Optional[str]
  lb: Optional[str]
  lc: Optional[str]
  li: Optional[str]
  lk: Optional[str]
  lr: Optional[str]
  ls: Optional[str]
  lt: Optional[str]
  lu: Optional[str]
  lv: Optional[str]
  ly: Optional[str]
  ma: Optional[str]
  mc: Optional[str]
  md: Optional[str]
  me: Optional[str]
  mf: Optional[str]
  mg: Optional[str]
  mh: Optional[str]
  mk: Optional[str]
  ml: Optional[str]
  mm: Optional[str]
  mn: Optional[str]
  mo: Optional[str]
  mp: Optional[str]
  mq: Optional[str]
  mr: Optional[str]
  ms: Optional[str]
  mt: Optional[str]
  mu: Optional[str]
  mv: Optional[str]
  mw: Optional[str]
  mx: Optional[str]
  my: Optional[str]
  mz: Optional[str]
  na: Optional[str]
  nc: Optional[str]
  ne: Optional[str]
  nf: Optional[str]
  ng: Optional[str]
  ni: Optional[str]
  nl: Optional[str]
  no: Optional[str]
  np: Optional[str]
  nr: Optional[str]
  nu: Optional[str]
  nz: Optional[str]
  om: Optional[str]
  pa: Optional[str]
  pe: Optional[str]
  pf: Optional[str]
  pg: Optional[str]
  ph: Optional[str]
  pk: Optional[str]
  pl: Optional[str]
  pm: Optional[str]
  pn: Optional[str]
  pr: Optional[str]
  ps: Optional[str]
  pt: Optional[str]
  pw: Optional[str]
  py: Optional[str]
  qa: Optional[str]
  re: Optional[str]
  ro: Optional[str]
  rs: Optional[str]
  ru: Optional[str]
  rw: Optional[str]
  sa: Optional[str]
  sb: Optional[str]
  sc: Optional[str]
  sd: Optional[str]
  se: Optional[str]
  sg: Optional[str]
  sh: Optional[str]
  si: Optional[str]
  sj: Optional[str]
  sk: Optional[str]
  sl: Optional[str]
  sm: Optional[str]
  sn: Optional[str]
  so: Optional[str]
  sr: Optional[str]
  ss: Optional[str]
  st: Optional[str]
  sv: Optional[str]
  sx: Optional[str]
  sy: Optional[str]
  sz: Optional[str]
  tc: Optional[str]
  td: Optional[str]
  tf: Optional[str]
  tg: Optional[str]
  th: Optional[str]
  tj: Optional[str]
  tk: Optional[str]
  tl: Optional[str]
  tm: Optional[str]
  tn: Optional[str]
  to: Optional[str]
  tr: Optional[str]
  tt: Optional[str]
  tv: Optional[str]
  tw: Optional[str]
  tz: Optional[str]
  ua: Optional[str]
  ug: Optional[str]
  um: Optional[str]
  us: Optional[str]
  uy: Optional[str]
  uz: Optional[str]
  va: Optional[str]
  vc: Optional[str]
  ve: Optional[str]
  vg: Optional[str]
  vi: Optional[str]
  vn: Optional[str]
  vu: Optional[str]
  wf: Optional[str]
  ws: Optional[str]
  xk: Optional[str]
  ye: Optional[str]
  yt: Optional[str]
  za: Optional[str]
  zm: Optional[str]
  zw: Optional[str]


@dataclass
class LinkWebhookEventData:
  android: str
  """The Android destination URL for the short link for Android device targeting."""

  clicks: float
  """The number of clicks on the short link."""

  comments: str
  """The comments for the short link."""

  created_at: str
  description: str
  """The description of the short link generated via `api.dub.co/metatags`. Will be used for
  Custom Social Media Cards if `proxy` is true.
  """
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  expired_url: str
  expires_at: str
  external_id: str
  """This is the ID of the link in your database that is unique across your workspace. If set,
  it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
  when passed as a query parameter.
  """
  geo: DataGeo
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  id: str
  """The unique ID of the short link."""

  image: str
  """The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  ios: str
  """The iOS destination URL for the short link for iOS device targeting."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  last_clicked: str
  leads: float
  """[BETA]: The number of leads the short links has generated."""

  password: str
  """The password required to access the destination URL of the short link."""

  program_id: str
  """The ID of the program the short link is associated with."""

  project_id: str
  """The project ID of the short link. This field is deprecated – use `workspaceId` instead."""

  qr_code: str
  """The full URL of the QR code for the short link (e.g.
  `https://api.dub.co/qr?url=https://dub.sh/try`).
  """
  sale_amount: float
  """[BETA]: The total dollar amount of sales the short links has generated (in cents)."""

  sales: float
  """[BETA]: The number of sales the short links has generated."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""

  tag_id: str
  """The unique ID of the tag assigned to the short link. This field is deprecated – use
  `tags` instead.
  """
  tags: List[Tag]
  """The tags assigned to the short link."""

  title: str
  """The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  updated_at: str
  url: str
  user_id: str
  utm_campaign: str
  """The UTM campaign of the short link."""

  utm_content: str
  """The UTM content of the short link."""

  utm_medium: str
  """The UTM medium of the short link."""

  utm_source: str
  """The UTM source of the short link."""

  utm_term: str
  """The UTM term of the short link."""

  video: str
  """The custom link preview video (og:video). Will be used for Custom Social Media Cards if
  `proxy` is true. Learn more: https://d.to/og
  """
  webhook_ids: List[str]
  """The IDs of the webhooks that the short link is associated with."""

  workspace_id: str
  """The workspace ID of the short link."""

  archived: Optional[bool]
  do_index: Optional[bool]
  proxy: Optional[bool]
  public_stats: Optional[bool]
  rewrite: Optional[bool]
  track_conversion: Optional[bool]


class LinkWebhookEventEvent(Enum):
  LINK_CREATED = "link.created"
  LINK_DELETED = "link.deleted"
  LINK_UPDATED = "link.updated"


@dataclass
class LinkWebhookEvent:
  """Triggered when a link is created, updated, or deleted."""

  created_at: str
  data: LinkWebhookEventData
  event: LinkWebhookEventEvent
  id: str


@dataclass
class TentacledClick:
  browser: str
  city: str
  continent: str
  country: str
  device: str
  id: str
  ip: str
  os: str
  referer: str
  referer_url: str
  region: str
  url: str
  qr: Optional[bool]


@dataclass
class TentacledDiscount:
  amount: float
  coupon_id: str
  coupon_test_id: str
  duration: float
  id: str
  interval: Interval
  type: TypeEnum


@dataclass
class IndigoLink:
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  id: str
  """The unique ID of the short link."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  program_id: str
  """The ID of the program the short link is associated with."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""


@dataclass
class TentacledPartner:
  email: str
  id: str
  name: str
  image: Optional[str]


@dataclass
class FluffyCustomer:
  created_at: str
  """The date the customer was created."""

  external_id: str
  """Unique identifier for the customer in the client's app."""

  id: str
  """The unique identifier of the customer in Dub."""

  name: str
  """Name of the customer."""

  avatar: Optional[str]
  """Avatar URL of the customer."""

  country: Optional[str]
  """Country of the customer."""

  discount: Optional[TentacledDiscount]
  email: Optional[str]
  """Email of the customer."""

  link: Optional[IndigoLink]
  partner: Optional[TentacledPartner]


@dataclass
class IndigoGeo:
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  ad: Optional[str]
  ae: Optional[str]
  af: Optional[str]
  ag: Optional[str]
  ai: Optional[str]
  al: Optional[str]
  am: Optional[str]
  ao: Optional[str]
  aq: Optional[str]
  ar: Optional[str]
  geo_as: Optional[str]
  at: Optional[str]
  au: Optional[str]
  aw: Optional[str]
  ax: Optional[str]
  az: Optional[str]
  ba: Optional[str]
  bb: Optional[str]
  bd: Optional[str]
  be: Optional[str]
  bf: Optional[str]
  bg: Optional[str]
  bh: Optional[str]
  bi: Optional[str]
  bj: Optional[str]
  bl: Optional[str]
  bm: Optional[str]
  bn: Optional[str]
  bo: Optional[str]
  bq: Optional[str]
  br: Optional[str]
  bs: Optional[str]
  bt: Optional[str]
  bv: Optional[str]
  bw: Optional[str]
  by: Optional[str]
  bz: Optional[str]
  ca: Optional[str]
  cc: Optional[str]
  cd: Optional[str]
  cf: Optional[str]
  cg: Optional[str]
  ch: Optional[str]
  ci: Optional[str]
  ck: Optional[str]
  cl: Optional[str]
  cm: Optional[str]
  cn: Optional[str]
  co: Optional[str]
  cr: Optional[str]
  cu: Optional[str]
  cv: Optional[str]
  cw: Optional[str]
  cx: Optional[str]
  cy: Optional[str]
  cz: Optional[str]
  de: Optional[str]
  dj: Optional[str]
  dk: Optional[str]
  dm: Optional[str]
  do: Optional[str]
  dz: Optional[str]
  ec: Optional[str]
  ee: Optional[str]
  eg: Optional[str]
  eh: Optional[str]
  er: Optional[str]
  es: Optional[str]
  et: Optional[str]
  fi: Optional[str]
  fj: Optional[str]
  fk: Optional[str]
  fm: Optional[str]
  fo: Optional[str]
  fr: Optional[str]
  ga: Optional[str]
  gb: Optional[str]
  gd: Optional[str]
  ge: Optional[str]
  gf: Optional[str]
  gg: Optional[str]
  gh: Optional[str]
  gi: Optional[str]
  gl: Optional[str]
  gm: Optional[str]
  gn: Optional[str]
  gp: Optional[str]
  gq: Optional[str]
  gr: Optional[str]
  gs: Optional[str]
  gt: Optional[str]
  gu: Optional[str]
  gw: Optional[str]
  gy: Optional[str]
  hk: Optional[str]
  hm: Optional[str]
  hn: Optional[str]
  hr: Optional[str]
  ht: Optional[str]
  hu: Optional[str]
  id: Optional[str]
  ie: Optional[str]
  il: Optional[str]
  im: Optional[str]
  geo_in: Optional[str]
  io: Optional[str]
  iq: Optional[str]
  ir: Optional[str]
  geo_is: Optional[str]
  it: Optional[str]
  je: Optional[str]
  jm: Optional[str]
  jo: Optional[str]
  jp: Optional[str]
  ke: Optional[str]
  kg: Optional[str]
  kh: Optional[str]
  ki: Optional[str]
  km: Optional[str]
  kn: Optional[str]
  kp: Optional[str]
  kr: Optional[str]
  kw: Optional[str]
  ky: Optional[str]
  kz: Optional[str]
  la: Optional[str]
  lb: Optional[str]
  lc: Optional[str]
  li: Optional[str]
  lk: Optional[str]
  lr: Optional[str]
  ls: Optional[str]
  lt: Optional[str]
  lu: Optional[str]
  lv: Optional[str]
  ly: Optional[str]
  ma: Optional[str]
  mc: Optional[str]
  md: Optional[str]
  me: Optional[str]
  mf: Optional[str]
  mg: Optional[str]
  mh: Optional[str]
  mk: Optional[str]
  ml: Optional[str]
  mm: Optional[str]
  mn: Optional[str]
  mo: Optional[str]
  mp: Optional[str]
  mq: Optional[str]
  mr: Optional[str]
  ms: Optional[str]
  mt: Optional[str]
  mu: Optional[str]
  mv: Optional[str]
  mw: Optional[str]
  mx: Optional[str]
  my: Optional[str]
  mz: Optional[str]
  na: Optional[str]
  nc: Optional[str]
  ne: Optional[str]
  nf: Optional[str]
  ng: Optional[str]
  ni: Optional[str]
  nl: Optional[str]
  no: Optional[str]
  np: Optional[str]
  nr: Optional[str]
  nu: Optional[str]
  nz: Optional[str]
  om: Optional[str]
  pa: Optional[str]
  pe: Optional[str]
  pf: Optional[str]
  pg: Optional[str]
  ph: Optional[str]
  pk: Optional[str]
  pl: Optional[str]
  pm: Optional[str]
  pn: Optional[str]
  pr: Optional[str]
  ps: Optional[str]
  pt: Optional[str]
  pw: Optional[str]
  py: Optional[str]
  qa: Optional[str]
  re: Optional[str]
  ro: Optional[str]
  rs: Optional[str]
  ru: Optional[str]
  rw: Optional[str]
  sa: Optional[str]
  sb: Optional[str]
  sc: Optional[str]
  sd: Optional[str]
  se: Optional[str]
  sg: Optional[str]
  sh: Optional[str]
  si: Optional[str]
  sj: Optional[str]
  sk: Optional[str]
  sl: Optional[str]
  sm: Optional[str]
  sn: Optional[str]
  so: Optional[str]
  sr: Optional[str]
  ss: Optional[str]
  st: Optional[str]
  sv: Optional[str]
  sx: Optional[str]
  sy: Optional[str]
  sz: Optional[str]
  tc: Optional[str]
  td: Optional[str]
  tf: Optional[str]
  tg: Optional[str]
  th: Optional[str]
  tj: Optional[str]
  tk: Optional[str]
  tl: Optional[str]
  tm: Optional[str]
  tn: Optional[str]
  to: Optional[str]
  tr: Optional[str]
  tt: Optional[str]
  tv: Optional[str]
  tw: Optional[str]
  tz: Optional[str]
  ua: Optional[str]
  ug: Optional[str]
  um: Optional[str]
  us: Optional[str]
  uy: Optional[str]
  uz: Optional[str]
  va: Optional[str]
  vc: Optional[str]
  ve: Optional[str]
  vg: Optional[str]
  vi: Optional[str]
  vn: Optional[str]
  vu: Optional[str]
  wf: Optional[str]
  ws: Optional[str]
  xk: Optional[str]
  ye: Optional[str]
  yt: Optional[str]
  za: Optional[str]
  zm: Optional[str]
  zw: Optional[str]


@dataclass
class IndecentLink:
  android: str
  """The Android destination URL for the short link for Android device targeting."""

  clicks: float
  """The number of clicks on the short link."""

  comments: str
  """The comments for the short link."""

  created_at: str
  description: str
  """The description of the short link generated via `api.dub.co/metatags`. Will be used for
  Custom Social Media Cards if `proxy` is true.
  """
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  expired_url: str
  expires_at: str
  external_id: str
  """This is the ID of the link in your database that is unique across your workspace. If set,
  it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
  when passed as a query parameter.
  """
  geo: IndigoGeo
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  id: str
  """The unique ID of the short link."""

  image: str
  """The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  ios: str
  """The iOS destination URL for the short link for iOS device targeting."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  last_clicked: str
  leads: float
  """[BETA]: The number of leads the short links has generated."""

  password: str
  """The password required to access the destination URL of the short link."""

  program_id: str
  """The ID of the program the short link is associated with."""

  project_id: str
  """The project ID of the short link. This field is deprecated – use `workspaceId` instead."""

  qr_code: str
  """The full URL of the QR code for the short link (e.g.
  `https://api.dub.co/qr?url=https://dub.sh/try`).
  """
  sale_amount: float
  """[BETA]: The total dollar amount of sales the short links has generated (in cents)."""

  sales: float
  """[BETA]: The number of sales the short links has generated."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""

  tag_id: str
  """The unique ID of the tag assigned to the short link. This field is deprecated – use
  `tags` instead.
  """
  tags: List[Tag]
  """The tags assigned to the short link."""

  title: str
  """The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  updated_at: str
  url: str
  user_id: str
  utm_campaign: str
  """The UTM campaign of the short link."""

  utm_content: str
  """The UTM content of the short link."""

  utm_medium: str
  """The UTM medium of the short link."""

  utm_source: str
  """The UTM source of the short link."""

  utm_term: str
  """The UTM term of the short link."""

  video: str
  """The custom link preview video (og:video). Will be used for Custom Social Media Cards if
  `proxy` is true. Learn more: https://d.to/og
  """
  webhook_ids: List[str]
  """The IDs of the webhooks that the short link is associated with."""

  workspace_id: str
  """The workspace ID of the short link."""

  archived: Optional[bool]
  do_index: Optional[bool]
  proxy: Optional[bool]
  public_stats: Optional[bool]
  rewrite: Optional[bool]
  track_conversion: Optional[bool]


@dataclass
class DataSale:
  amount: float
  currency: str
  invoice_id: str
  payment_processor: str


@dataclass
class SaleCreatedEventData:
  click: TentacledClick
  customer: FluffyCustomer
  event_name: str
  link: IndecentLink
  sale: DataSale


class SaleCreatedEventEvent(Enum):
  SALE_CREATED = "sale.created"


@dataclass
class SaleCreatedEvent:
  """Triggered when a sale is created."""

  created_at: str
  data: SaleCreatedEventData
  event: SaleCreatedEventEvent
  id: str


@dataclass
class SaleEventClick:
  browser: str
  city: str
  continent: str
  country: str
  device: str
  id: str
  ip: str
  os: str
  referer: str
  referer_url: str
  region: str
  url: str
  qr: Optional[bool]


@dataclass
class StickyDiscount:
  amount: float
  coupon_id: str
  coupon_test_id: str
  duration: float
  id: str
  interval: Interval
  type: TypeEnum


@dataclass
class HilariousLink:
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  id: str
  """The unique ID of the short link."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  program_id: str
  """The ID of the program the short link is associated with."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""


@dataclass
class StickyPartner:
  email: str
  id: str
  name: str
  image: Optional[str]


@dataclass
class SaleEventCustomer:
  created_at: str
  """The date the customer was created."""

  external_id: str
  """Unique identifier for the customer in the client's app."""

  id: str
  """The unique identifier of the customer in Dub."""

  name: str
  """Name of the customer."""

  avatar: Optional[str]
  """Avatar URL of the customer."""

  country: Optional[str]
  """Country of the customer."""

  discount: Optional[StickyDiscount]
  email: Optional[str]
  """Email of the customer."""

  link: Optional[HilariousLink]
  partner: Optional[StickyPartner]


class SaleEventEvent(Enum):
  SALE = "sale"


@dataclass
class IndecentGeo:
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  ad: Optional[str]
  ae: Optional[str]
  af: Optional[str]
  ag: Optional[str]
  ai: Optional[str]
  al: Optional[str]
  am: Optional[str]
  ao: Optional[str]
  aq: Optional[str]
  ar: Optional[str]
  geo_as: Optional[str]
  at: Optional[str]
  au: Optional[str]
  aw: Optional[str]
  ax: Optional[str]
  az: Optional[str]
  ba: Optional[str]
  bb: Optional[str]
  bd: Optional[str]
  be: Optional[str]
  bf: Optional[str]
  bg: Optional[str]
  bh: Optional[str]
  bi: Optional[str]
  bj: Optional[str]
  bl: Optional[str]
  bm: Optional[str]
  bn: Optional[str]
  bo: Optional[str]
  bq: Optional[str]
  br: Optional[str]
  bs: Optional[str]
  bt: Optional[str]
  bv: Optional[str]
  bw: Optional[str]
  by: Optional[str]
  bz: Optional[str]
  ca: Optional[str]
  cc: Optional[str]
  cd: Optional[str]
  cf: Optional[str]
  cg: Optional[str]
  ch: Optional[str]
  ci: Optional[str]
  ck: Optional[str]
  cl: Optional[str]
  cm: Optional[str]
  cn: Optional[str]
  co: Optional[str]
  cr: Optional[str]
  cu: Optional[str]
  cv: Optional[str]
  cw: Optional[str]
  cx: Optional[str]
  cy: Optional[str]
  cz: Optional[str]
  de: Optional[str]
  dj: Optional[str]
  dk: Optional[str]
  dm: Optional[str]
  do: Optional[str]
  dz: Optional[str]
  ec: Optional[str]
  ee: Optional[str]
  eg: Optional[str]
  eh: Optional[str]
  er: Optional[str]
  es: Optional[str]
  et: Optional[str]
  fi: Optional[str]
  fj: Optional[str]
  fk: Optional[str]
  fm: Optional[str]
  fo: Optional[str]
  fr: Optional[str]
  ga: Optional[str]
  gb: Optional[str]
  gd: Optional[str]
  ge: Optional[str]
  gf: Optional[str]
  gg: Optional[str]
  gh: Optional[str]
  gi: Optional[str]
  gl: Optional[str]
  gm: Optional[str]
  gn: Optional[str]
  gp: Optional[str]
  gq: Optional[str]
  gr: Optional[str]
  gs: Optional[str]
  gt: Optional[str]
  gu: Optional[str]
  gw: Optional[str]
  gy: Optional[str]
  hk: Optional[str]
  hm: Optional[str]
  hn: Optional[str]
  hr: Optional[str]
  ht: Optional[str]
  hu: Optional[str]
  id: Optional[str]
  ie: Optional[str]
  il: Optional[str]
  im: Optional[str]
  geo_in: Optional[str]
  io: Optional[str]
  iq: Optional[str]
  ir: Optional[str]
  geo_is: Optional[str]
  it: Optional[str]
  je: Optional[str]
  jm: Optional[str]
  jo: Optional[str]
  jp: Optional[str]
  ke: Optional[str]
  kg: Optional[str]
  kh: Optional[str]
  ki: Optional[str]
  km: Optional[str]
  kn: Optional[str]
  kp: Optional[str]
  kr: Optional[str]
  kw: Optional[str]
  ky: Optional[str]
  kz: Optional[str]
  la: Optional[str]
  lb: Optional[str]
  lc: Optional[str]
  li: Optional[str]
  lk: Optional[str]
  lr: Optional[str]
  ls: Optional[str]
  lt: Optional[str]
  lu: Optional[str]
  lv: Optional[str]
  ly: Optional[str]
  ma: Optional[str]
  mc: Optional[str]
  md: Optional[str]
  me: Optional[str]
  mf: Optional[str]
  mg: Optional[str]
  mh: Optional[str]
  mk: Optional[str]
  ml: Optional[str]
  mm: Optional[str]
  mn: Optional[str]
  mo: Optional[str]
  mp: Optional[str]
  mq: Optional[str]
  mr: Optional[str]
  ms: Optional[str]
  mt: Optional[str]
  mu: Optional[str]
  mv: Optional[str]
  mw: Optional[str]
  mx: Optional[str]
  my: Optional[str]
  mz: Optional[str]
  na: Optional[str]
  nc: Optional[str]
  ne: Optional[str]
  nf: Optional[str]
  ng: Optional[str]
  ni: Optional[str]
  nl: Optional[str]
  no: Optional[str]
  np: Optional[str]
  nr: Optional[str]
  nu: Optional[str]
  nz: Optional[str]
  om: Optional[str]
  pa: Optional[str]
  pe: Optional[str]
  pf: Optional[str]
  pg: Optional[str]
  ph: Optional[str]
  pk: Optional[str]
  pl: Optional[str]
  pm: Optional[str]
  pn: Optional[str]
  pr: Optional[str]
  ps: Optional[str]
  pt: Optional[str]
  pw: Optional[str]
  py: Optional[str]
  qa: Optional[str]
  re: Optional[str]
  ro: Optional[str]
  rs: Optional[str]
  ru: Optional[str]
  rw: Optional[str]
  sa: Optional[str]
  sb: Optional[str]
  sc: Optional[str]
  sd: Optional[str]
  se: Optional[str]
  sg: Optional[str]
  sh: Optional[str]
  si: Optional[str]
  sj: Optional[str]
  sk: Optional[str]
  sl: Optional[str]
  sm: Optional[str]
  sn: Optional[str]
  so: Optional[str]
  sr: Optional[str]
  ss: Optional[str]
  st: Optional[str]
  sv: Optional[str]
  sx: Optional[str]
  sy: Optional[str]
  sz: Optional[str]
  tc: Optional[str]
  td: Optional[str]
  tf: Optional[str]
  tg: Optional[str]
  th: Optional[str]
  tj: Optional[str]
  tk: Optional[str]
  tl: Optional[str]
  tm: Optional[str]
  tn: Optional[str]
  to: Optional[str]
  tr: Optional[str]
  tt: Optional[str]
  tv: Optional[str]
  tw: Optional[str]
  tz: Optional[str]
  ua: Optional[str]
  ug: Optional[str]
  um: Optional[str]
  us: Optional[str]
  uy: Optional[str]
  uz: Optional[str]
  va: Optional[str]
  vc: Optional[str]
  ve: Optional[str]
  vg: Optional[str]
  vi: Optional[str]
  vn: Optional[str]
  vu: Optional[str]
  wf: Optional[str]
  ws: Optional[str]
  xk: Optional[str]
  ye: Optional[str]
  yt: Optional[str]
  za: Optional[str]
  zm: Optional[str]
  zw: Optional[str]


@dataclass
class SaleEventLink:
  android: str
  """The Android destination URL for the short link for Android device targeting."""

  clicks: float
  """The number of clicks on the short link."""

  comments: str
  """The comments for the short link."""

  created_at: str
  description: str
  """The description of the short link generated via `api.dub.co/metatags`. Will be used for
  Custom Social Media Cards if `proxy` is true.
  """
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  expired_url: str
  expires_at: str
  external_id: str
  """This is the ID of the link in your database that is unique across your workspace. If set,
  it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
  when passed as a query parameter.
  """
  geo: IndecentGeo
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  id: str
  """The unique ID of the short link."""

  image: str
  """The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  ios: str
  """The iOS destination URL for the short link for iOS device targeting."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  last_clicked: str
  leads: float
  """[BETA]: The number of leads the short links has generated."""

  password: str
  """The password required to access the destination URL of the short link."""

  program_id: str
  """The ID of the program the short link is associated with."""

  project_id: str
  """The project ID of the short link. This field is deprecated – use `workspaceId` instead."""

  qr_code: str
  """The full URL of the QR code for the short link (e.g.
  `https://api.dub.co/qr?url=https://dub.sh/try`).
  """
  sale_amount: float
  """[BETA]: The total dollar amount of sales the short links has generated (in cents)."""

  sales: float
  """[BETA]: The number of sales the short links has generated."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""

  tag_id: str
  """The unique ID of the tag assigned to the short link. This field is deprecated – use
  `tags` instead.
  """
  tags: List[Tag]
  """The tags assigned to the short link."""

  title: str
  """The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  updated_at: str
  url: str
  user_id: str
  utm_campaign: str
  """The UTM campaign of the short link."""

  utm_content: str
  """The UTM content of the short link."""

  utm_medium: str
  """The UTM medium of the short link."""

  utm_source: str
  """The UTM source of the short link."""

  utm_term: str
  """The UTM term of the short link."""

  video: str
  """The custom link preview video (og:video). Will be used for Custom Social Media Cards if
  `proxy` is true. Learn more: https://d.to/og
  """
  webhook_ids: List[str]
  """The IDs of the webhooks that the short link is associated with."""

  workspace_id: str
  """The workspace ID of the short link."""

  archived: Optional[bool]
  do_index: Optional[bool]
  proxy: Optional[bool]
  public_stats: Optional[bool]
  rewrite: Optional[bool]
  track_conversion: Optional[bool]


class PaymentProcessor(Enum):
  """The payment processor via which the sale was made."""

  PADDLE = "paddle"
  SHOPIFY = "shopify"
  STRIPE = "stripe"


@dataclass
class SaleEventSale:
  amount: int
  """The amount of the sale. Should be passed in cents."""

  invoice_id: str
  """The invoice ID of the sale."""

  payment_processor: PaymentProcessor
  """The payment processor via which the sale was made."""


@dataclass
class SaleEvent:
  browser: str
  """Deprecated. Use `click.browser` instead."""

  city: str
  """Deprecated. Use `click.city` instead."""

  click: SaleEventClick
  click_id: str
  """Deprecated. Use `click.id` instead."""

  continent: str
  """Deprecated. Use `click.continent` instead."""

  country: str
  """Deprecated. Use `click.country` instead."""

  customer: SaleEventCustomer
  device: str
  """Deprecated. Use `click.device` instead."""

  domain: str
  """Deprecated. Use `link.domain` instead."""

  event: SaleEventEvent
  event_id: str
  event_name: str
  invoice_id: str
  """Deprecated. Use `sale.invoiceId` instead."""

  ip: str
  """Deprecated. Use `click.ip` instead."""

  key: str
  """Deprecated. Use `link.key` instead."""

  link: SaleEventLink
  link_id: str
  """Deprecated. Use `link.id` instead."""

  os: str
  """Deprecated. Use `click.os` instead."""

  payment_processor: str
  """Deprecated. Use `sale.paymentProcessor` instead."""

  qr: float
  """Deprecated. Use `click.qr` instead."""

  sale: SaleEventSale
  sale_amount: float
  """Deprecated. Use `sale.amount` instead."""

  url: str
  """Deprecated. Use `click.url` instead."""

  timestamp: Optional[str]


@dataclass
class StickyClick:
  browser: str
  city: str
  continent: str
  country: str
  device: str
  id: str
  ip: str
  os: str
  referer: str
  referer_url: str
  region: str
  url: str
  qr: Optional[bool]


@dataclass
class IndigoDiscount:
  amount: float
  coupon_id: str
  coupon_test_id: str
  duration: float
  id: str
  interval: Interval
  type: TypeEnum


@dataclass
class AmbitiousLink:
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  id: str
  """The unique ID of the short link."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  program_id: str
  """The ID of the program the short link is associated with."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""


@dataclass
class IndigoPartner:
  email: str
  id: str
  name: str
  image: Optional[str]


@dataclass
class TentacledCustomer:
  created_at: str
  """The date the customer was created."""

  external_id: str
  """Unique identifier for the customer in the client's app."""

  id: str
  """The unique identifier of the customer in Dub."""

  name: str
  """Name of the customer."""

  avatar: Optional[str]
  """Avatar URL of the customer."""

  country: Optional[str]
  """Country of the customer."""

  discount: Optional[IndigoDiscount]
  email: Optional[str]
  """Email of the customer."""

  link: Optional[AmbitiousLink]
  partner: Optional[IndigoPartner]


@dataclass
class HilariousGeo:
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  ad: Optional[str]
  ae: Optional[str]
  af: Optional[str]
  ag: Optional[str]
  ai: Optional[str]
  al: Optional[str]
  am: Optional[str]
  ao: Optional[str]
  aq: Optional[str]
  ar: Optional[str]
  geo_as: Optional[str]
  at: Optional[str]
  au: Optional[str]
  aw: Optional[str]
  ax: Optional[str]
  az: Optional[str]
  ba: Optional[str]
  bb: Optional[str]
  bd: Optional[str]
  be: Optional[str]
  bf: Optional[str]
  bg: Optional[str]
  bh: Optional[str]
  bi: Optional[str]
  bj: Optional[str]
  bl: Optional[str]
  bm: Optional[str]
  bn: Optional[str]
  bo: Optional[str]
  bq: Optional[str]
  br: Optional[str]
  bs: Optional[str]
  bt: Optional[str]
  bv: Optional[str]
  bw: Optional[str]
  by: Optional[str]
  bz: Optional[str]
  ca: Optional[str]
  cc: Optional[str]
  cd: Optional[str]
  cf: Optional[str]
  cg: Optional[str]
  ch: Optional[str]
  ci: Optional[str]
  ck: Optional[str]
  cl: Optional[str]
  cm: Optional[str]
  cn: Optional[str]
  co: Optional[str]
  cr: Optional[str]
  cu: Optional[str]
  cv: Optional[str]
  cw: Optional[str]
  cx: Optional[str]
  cy: Optional[str]
  cz: Optional[str]
  de: Optional[str]
  dj: Optional[str]
  dk: Optional[str]
  dm: Optional[str]
  do: Optional[str]
  dz: Optional[str]
  ec: Optional[str]
  ee: Optional[str]
  eg: Optional[str]
  eh: Optional[str]
  er: Optional[str]
  es: Optional[str]
  et: Optional[str]
  fi: Optional[str]
  fj: Optional[str]
  fk: Optional[str]
  fm: Optional[str]
  fo: Optional[str]
  fr: Optional[str]
  ga: Optional[str]
  gb: Optional[str]
  gd: Optional[str]
  ge: Optional[str]
  gf: Optional[str]
  gg: Optional[str]
  gh: Optional[str]
  gi: Optional[str]
  gl: Optional[str]
  gm: Optional[str]
  gn: Optional[str]
  gp: Optional[str]
  gq: Optional[str]
  gr: Optional[str]
  gs: Optional[str]
  gt: Optional[str]
  gu: Optional[str]
  gw: Optional[str]
  gy: Optional[str]
  hk: Optional[str]
  hm: Optional[str]
  hn: Optional[str]
  hr: Optional[str]
  ht: Optional[str]
  hu: Optional[str]
  id: Optional[str]
  ie: Optional[str]
  il: Optional[str]
  im: Optional[str]
  geo_in: Optional[str]
  io: Optional[str]
  iq: Optional[str]
  ir: Optional[str]
  geo_is: Optional[str]
  it: Optional[str]
  je: Optional[str]
  jm: Optional[str]
  jo: Optional[str]
  jp: Optional[str]
  ke: Optional[str]
  kg: Optional[str]
  kh: Optional[str]
  ki: Optional[str]
  km: Optional[str]
  kn: Optional[str]
  kp: Optional[str]
  kr: Optional[str]
  kw: Optional[str]
  ky: Optional[str]
  kz: Optional[str]
  la: Optional[str]
  lb: Optional[str]
  lc: Optional[str]
  li: Optional[str]
  lk: Optional[str]
  lr: Optional[str]
  ls: Optional[str]
  lt: Optional[str]
  lu: Optional[str]
  lv: Optional[str]
  ly: Optional[str]
  ma: Optional[str]
  mc: Optional[str]
  md: Optional[str]
  me: Optional[str]
  mf: Optional[str]
  mg: Optional[str]
  mh: Optional[str]
  mk: Optional[str]
  ml: Optional[str]
  mm: Optional[str]
  mn: Optional[str]
  mo: Optional[str]
  mp: Optional[str]
  mq: Optional[str]
  mr: Optional[str]
  ms: Optional[str]
  mt: Optional[str]
  mu: Optional[str]
  mv: Optional[str]
  mw: Optional[str]
  mx: Optional[str]
  my: Optional[str]
  mz: Optional[str]
  na: Optional[str]
  nc: Optional[str]
  ne: Optional[str]
  nf: Optional[str]
  ng: Optional[str]
  ni: Optional[str]
  nl: Optional[str]
  no: Optional[str]
  np: Optional[str]
  nr: Optional[str]
  nu: Optional[str]
  nz: Optional[str]
  om: Optional[str]
  pa: Optional[str]
  pe: Optional[str]
  pf: Optional[str]
  pg: Optional[str]
  ph: Optional[str]
  pk: Optional[str]
  pl: Optional[str]
  pm: Optional[str]
  pn: Optional[str]
  pr: Optional[str]
  ps: Optional[str]
  pt: Optional[str]
  pw: Optional[str]
  py: Optional[str]
  qa: Optional[str]
  re: Optional[str]
  ro: Optional[str]
  rs: Optional[str]
  ru: Optional[str]
  rw: Optional[str]
  sa: Optional[str]
  sb: Optional[str]
  sc: Optional[str]
  sd: Optional[str]
  se: Optional[str]
  sg: Optional[str]
  sh: Optional[str]
  si: Optional[str]
  sj: Optional[str]
  sk: Optional[str]
  sl: Optional[str]
  sm: Optional[str]
  sn: Optional[str]
  so: Optional[str]
  sr: Optional[str]
  ss: Optional[str]
  st: Optional[str]
  sv: Optional[str]
  sx: Optional[str]
  sy: Optional[str]
  sz: Optional[str]
  tc: Optional[str]
  td: Optional[str]
  tf: Optional[str]
  tg: Optional[str]
  th: Optional[str]
  tj: Optional[str]
  tk: Optional[str]
  tl: Optional[str]
  tm: Optional[str]
  tn: Optional[str]
  to: Optional[str]
  tr: Optional[str]
  tt: Optional[str]
  tv: Optional[str]
  tw: Optional[str]
  tz: Optional[str]
  ua: Optional[str]
  ug: Optional[str]
  um: Optional[str]
  us: Optional[str]
  uy: Optional[str]
  uz: Optional[str]
  va: Optional[str]
  vc: Optional[str]
  ve: Optional[str]
  vg: Optional[str]
  vi: Optional[str]
  vn: Optional[str]
  vu: Optional[str]
  wf: Optional[str]
  ws: Optional[str]
  xk: Optional[str]
  ye: Optional[str]
  yt: Optional[str]
  za: Optional[str]
  zm: Optional[str]
  zw: Optional[str]


@dataclass
class CunningLink:
  android: str
  """The Android destination URL for the short link for Android device targeting."""

  clicks: float
  """The number of clicks on the short link."""

  comments: str
  """The comments for the short link."""

  created_at: str
  description: str
  """The description of the short link generated via `api.dub.co/metatags`. Will be used for
  Custom Social Media Cards if `proxy` is true.
  """
  domain: str
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  expired_url: str
  expires_at: str
  external_id: str
  """This is the ID of the link in your database that is unique across your workspace. If set,
  it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
  when passed as a query parameter.
  """
  geo: HilariousGeo
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  id: str
  """The unique ID of the short link."""

  image: str
  """The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  ios: str
  """The iOS destination URL for the short link for iOS device targeting."""

  key: str
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  last_clicked: str
  leads: float
  """[BETA]: The number of leads the short links has generated."""

  password: str
  """The password required to access the destination URL of the short link."""

  program_id: str
  """The ID of the program the short link is associated with."""

  project_id: str
  """The project ID of the short link. This field is deprecated – use `workspaceId` instead."""

  qr_code: str
  """The full URL of the QR code for the short link (e.g.
  `https://api.dub.co/qr?url=https://dub.sh/try`).
  """
  sale_amount: float
  """[BETA]: The total dollar amount of sales the short links has generated (in cents)."""

  sales: float
  """[BETA]: The number of sales the short links has generated."""

  short_link: str
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""

  tag_id: str
  """The unique ID of the tag assigned to the short link. This field is deprecated – use
  `tags` instead.
  """
  tags: List[Tag]
  """The tags assigned to the short link."""

  title: str
  """The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  updated_at: str
  url: str
  user_id: str
  utm_campaign: str
  """The UTM campaign of the short link."""

  utm_content: str
  """The UTM content of the short link."""

  utm_medium: str
  """The UTM medium of the short link."""

  utm_source: str
  """The UTM source of the short link."""

  utm_term: str
  """The UTM term of the short link."""

  video: str
  """The custom link preview video (og:video). Will be used for Custom Social Media Cards if
  `proxy` is true. Learn more: https://d.to/og
  """
  webhook_ids: List[str]
  """The IDs of the webhooks that the short link is associated with."""

  workspace_id: str
  """The workspace ID of the short link."""

  archived: Optional[bool]
  do_index: Optional[bool]
  proxy: Optional[bool]
  public_stats: Optional[bool]
  rewrite: Optional[bool]
  track_conversion: Optional[bool]


@dataclass
class WebhookEventData:
  android: Optional[str]
  """The Android destination URL for the short link for Android device targeting."""

  archived: Optional[bool]
  click: Optional[StickyClick]
  clicks: Optional[float]
  """The number of clicks on the short link."""

  comments: Optional[str]
  """The comments for the short link."""

  created_at: Optional[str]
  customer: Optional[TentacledCustomer]
  description: Optional[str]
  """The description of the short link generated via `api.dub.co/metatags`. Will be used for
  Custom Social Media Cards if `proxy` is true.
  """
  do_index: Optional[bool]
  domain: Optional[str]
  """The domain of the short link. If not provided, the primary domain for the workspace will
  be used (or `dub.sh` if the workspace has no domains).
  """
  event_name: Optional[str]
  expired_url: Optional[str]
  expires_at: Optional[str]
  external_id: Optional[str]
  """This is the ID of the link in your database that is unique across your workspace. If set,
  it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
  when passed as a query parameter.
  """
  geo: Optional[DataGeo]
  """Geo targeting information for the short link in JSON format `{[COUNTRY]:
  https://example.com }`. Learn more: https://d.to/geo
  """
  id: Optional[str]
  """The unique ID of the short link."""

  image: Optional[str]
  """The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  ios: Optional[str]
  """The iOS destination URL for the short link for iOS device targeting."""

  key: Optional[str]
  """The short link slug. If not provided, a random 7-character slug will be generated."""

  last_clicked: Optional[str]
  leads: Optional[float]
  """[BETA]: The number of leads the short links has generated."""

  link: Optional[CunningLink]
  password: Optional[str]
  """The password required to access the destination URL of the short link."""

  program_id: Optional[str]
  """The ID of the program the short link is associated with."""

  project_id: Optional[str]
  """The project ID of the short link. This field is deprecated – use `workspaceId` instead."""

  proxy: Optional[bool]
  public_stats: Optional[bool]
  qr_code: Optional[str]
  """The full URL of the QR code for the short link (e.g.
  `https://api.dub.co/qr?url=https://dub.sh/try`).
  """
  rewrite: Optional[bool]
  sale: Optional[DataSale]
  sale_amount: Optional[float]
  """[BETA]: The total dollar amount of sales the short links has generated (in cents)."""

  sales: Optional[float]
  """[BETA]: The number of sales the short links has generated."""

  short_link: Optional[str]
  """The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`)."""

  tag_id: Optional[str]
  """The unique ID of the tag assigned to the short link. This field is deprecated – use
  `tags` instead.
  """
  tags: Optional[List[Tag]]
  """The tags assigned to the short link."""

  title: Optional[str]
  """The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
  Social Media Cards if `proxy` is true.
  """
  track_conversion: Optional[bool]
  updated_at: Optional[str]
  url: Optional[str]
  user_id: Optional[str]
  utm_campaign: Optional[str]
  """The UTM campaign of the short link."""

  utm_content: Optional[str]
  """The UTM content of the short link."""

  utm_medium: Optional[str]
  """The UTM medium of the short link."""

  utm_source: Optional[str]
  """The UTM source of the short link."""

  utm_term: Optional[str]
  """The UTM term of the short link."""

  video: Optional[str]
  """The custom link preview video (og:video). Will be used for Custom Social Media Cards if
  `proxy` is true. Learn more: https://d.to/og
  """
  webhook_ids: Optional[List[str]]
  """The IDs of the webhooks that the short link is associated with."""

  workspace_id: Optional[str]
  """The workspace ID of the short link."""


class WebhookEventEvent(Enum):
  LEAD_CREATED = "lead.created"
  LINK_CLICKED = "link.clicked"
  LINK_CREATED = "link.created"
  LINK_DELETED = "link.deleted"
  LINK_UPDATED = "link.updated"
  SALE_CREATED = "sale.created"


@dataclass
class WebhookEvent:
  """Webhook event schema
  
  Triggered when a link is created, updated, or deleted.
  
  Triggered when a link is clicked.
  
  Triggered when a lead is created.
  
  Triggered when a sale is created.
  """
  created_at: str
  data: WebhookEventData
  event: WebhookEventEvent
  id: str


@dataclass
class Domain:
  primary: bool
  """Whether the domain is the primary domain for the workspace."""

  slug: str
  """The domain name."""

  verified: bool
  """Whether the domain is verified."""


class Plan(Enum):
  """The plan of the workspace."""

  BUSINESS = "business"
  BUSINESS_EXTRA = "business extra"
  BUSINESS_MAX = "business max"
  BUSINESS_PLUS = "business plus"
  ENTERPRISE = "enterprise"
  FREE = "free"
  PRO = "pro"


class Role(Enum):
  """The role of the authenticated user in the workspace."""

  MEMBER = "member"
  OWNER = "owner"


@dataclass
class User:
  role: Role
  """The role of the authenticated user in the workspace."""


@dataclass
class Workspace:
  ai_limit: float
  """The AI limit of the workspace."""

  ai_usage: float
  """The AI usage of the workspace."""

  billing_cycle_start: float
  """The date and time when the billing cycle starts for the workspace."""

  conversion_enabled: bool
  """Whether the workspace has conversion tracking enabled (d.to/conversions)."""

  created_at: str
  """The date and time when the workspace was created."""

  domains: List[Domain]
  """The domains of the workspace."""

  domains_limit: float
  """The domains limit of the workspace."""

  dot_link_claimed: bool
  """Whether the workspace has claimed a free .link domain. (dub.link/free)"""

  id: str
  """The unique ID of the workspace."""

  invite_code: str
  """The invite code of the workspace."""

  links_limit: float
  """The links limit of the workspace."""

  links_usage: float
  """The links usage of the workspace."""

  logo: str
  """The logo of the workspace."""

  name: str
  """The name of the workspace."""

  partners_enabled: bool
  """Whether the workspace has Dub Partners enabled."""

  payment_failed_at: str
  """The date and time when the payment failed for the workspace."""

  payout_method_id: str
  """[BETA – Dub Partners]: The ID of the payment method for partner payouts."""

  plan: Plan
  """The plan of the workspace."""

  sales_limit: float
  """The limit of tracked revenue in the current billing cycle (in cents)."""

  sales_usage: float
  """The dollar amount of tracked revenue in the current billing cycle (in cents)."""

  slug: str
  """The slug of the workspace."""

  stripe_connect_id: str
  """[BETA – Dub Conversions]: The Stripe Connect ID of the workspace."""

  stripe_id: str
  """The Stripe ID of the workspace."""

  tags_limit: float
  """The tags limit of the workspace."""

  usage: float
  """The usage of the workspace."""

  usage_limit: float
  """The usage limit of the workspace."""

  users: List[User]
  """The role of the authenticated user in the workspace."""

  users_limit: float
  """The users limit of the workspace."""

  flags: Optional[Dict[str, bool]]
  """The feature flags of the workspace, indicating which features are enabled."""


@dataclass
class All:
  analytics_browsers: AnalyticsBrowsers
  analytics_cities: AnalyticsCities
  analytics_continents: AnalyticsContinents
  analytics_count: AnalyticsCount
  analytics_countries: AnalyticsCountries
  analytics_devices: AnalyticsDevices
  analytics_os: AnalyticsOS
  analytics_referer_urls: AnalyticsRefererUrls
  analytics_referers: AnalyticsReferers
  analytics_timeseries: AnalyticsTimeseries
  analytics_top_links: AnalyticsTopLinks
  analytics_top_urls: AnalyticsTopUrls
  analytics_triggers: AnalyticsTriggers
  click_event: ClickEvent
  domain_schema: DomainSchema
  lead_created_event: LeadCreatedEvent
  lead_event: LeadEvent
  link_clicked_event: LinkClickedEvent
  link_schema: Link
  link_webhook_event: LinkWebhookEvent
  sale_created_event: SaleCreatedEvent
  sale_event: SaleEvent
  tag_schema: Tag
  webhook_event: WebhookEvent
  workspace_schema: Workspace
  continent_code: Continent
  country_code: Country
  link_geo_targeting: LinkGeoTargeting
  region_code: str
