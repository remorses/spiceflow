from dataclasses import dataclass
from typing import Optional, List
from enum import Enum


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
class Geo:
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
  geo: Geo
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
class AllExportedTypes:
  link_schema: Link
  tag_schema: Tag
  link_geo_targeting: LinkGeoTargeting
