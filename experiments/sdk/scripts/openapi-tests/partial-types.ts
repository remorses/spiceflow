export interface AllExportedTypes {
  linkGeoTargeting: LinkGeoTargeting
  linkSchema: Link
  tagSchema: Tag
  [property: string]: any
}

export interface Link {
  /**
   * The Android destination URL for the short link for Android device targeting.
   */
  android: string
  /**
   * Whether the short link is archived.
   */
  archived: boolean
  /**
   * The number of clicks on the short link.
   */
  clicks: number
  /**
   * The comments for the short link.
   */
  comments: string
  /**
   * The date and time when the short link was created.
   */
  createdAt: string
  /**
   * The description of the short link generated via `api.dub.co/metatags`. Will be used for
   * Custom Social Media Cards if `proxy` is true.
   */
  description: string
  /**
   * Whether to allow search engines to index the short link.
   */
  doIndex: boolean
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will
   * be used (or `dub.sh` if the workspace has no domains).
   */
  domain: string
  /**
   * The URL to redirect to when the short link has expired.
   */
  expiredURL: string
  /**
   * The date and time when the short link will expire in ISO-8601 format.
   */
  expiresAt: string
  /**
   * This is the ID of the link in your database that is unique across your workspace. If set,
   * it can be used to identify the link in future API requests. Must be prefixed with 'ext_'
   * when passed as a query parameter.
   */
  externalID: string
  /**
   * Geo targeting information for the short link in JSON format `{[COUNTRY]:
   * https://example.com }`. Learn more: https://d.to/geo
   */
  geo: Geo
  /**
   * The unique ID of the short link.
   */
  id: string
  /**
   * The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  image: string
  /**
   * The iOS destination URL for the short link for iOS device targeting.
   */
  ios: string
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key: string
  /**
   * The date and time when the short link was last clicked.
   */
  lastClicked: string
  /**
   * [BETA]: The number of leads the short links has generated.
   */
  leads: number
  /**
   * The password required to access the destination URL of the short link.
   */
  password: string
  /**
   * The ID of the program the short link is associated with.
   */
  programID: string
  /**
   * The project ID of the short link. This field is deprecated – use `workspaceId` instead.
   */
  projectID: string
  /**
   * Whether the short link uses Custom Social Media Cards feature.
   */
  proxy: boolean
  /**
   * Whether the short link's stats are publicly accessible.
   */
  publicStats: boolean
  /**
   * The full URL of the QR code for the short link (e.g.
   * `https://api.dub.co/qr?url=https://dub.sh/try`).
   */
  qrCode: string
  /**
   * Whether the short link uses link cloaking.
   */
  rewrite: boolean
  /**
   * [BETA]: The total dollar amount of sales the short links has generated (in cents).
   */
  saleAmount: number
  /**
   * [BETA]: The number of sales the short links has generated.
   */
  sales: number
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string
  /**
   * The unique ID of the tag assigned to the short link. This field is deprecated – use
   * `tags` instead.
   */
  tagID: string
  /**
   * The tags assigned to the short link.
   */
  tags: Tag[]
  /**
   * The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom
   * Social Media Cards if `proxy` is true.
   */
  title: string
  /**
   * [BETA] Whether to track conversions for the short link.
   */
  trackConversion: boolean
  /**
   * The date and time when the short link was last updated.
   */
  updatedAt: string
  /**
   * The destination URL of the short link.
   */
  url: string
  /**
   * The user ID of the creator of the short link.
   */
  userID: string
  /**
   * The UTM campaign of the short link.
   */
  utmCampaign: string
  /**
   * The UTM content of the short link.
   */
  utmContent: string
  /**
   * The UTM medium of the short link.
   */
  utmMedium: string
  /**
   * The UTM source of the short link.
   */
  utmSource: string
  /**
   * The UTM term of the short link.
   */
  utmTerm: string
  /**
   * The custom link preview video (og:video). Will be used for Custom Social Media Cards if
   * `proxy` is true. Learn more: https://d.to/og
   */
  video: string
  /**
   * The IDs of the webhooks that the short link is associated with.
   */
  webhookIDS: string[]
  /**
   * The workspace ID of the short link.
   */
  workspaceID: string
  [property: string]: any
}

/**
 * Geo targeting information for the short link in JSON format `{[COUNTRY]:
 * https://example.com }`. Learn more: https://d.to/geo
 */
export interface Geo {
  ad?: string
  ae?: string
  af?: string
  ag?: string
  ai?: string
  al?: string
  am?: string
  ao?: string
  aq?: string
  ar?: string
  as?: string
  at?: string
  au?: string
  aw?: string
  ax?: string
  az?: string
  ba?: string
  bb?: string
  bd?: string
  be?: string
  bf?: string
  bg?: string
  bh?: string
  bi?: string
  bj?: string
  bl?: string
  bm?: string
  bn?: string
  bo?: string
  bq?: string
  br?: string
  bs?: string
  bt?: string
  bv?: string
  bw?: string
  by?: string
  bz?: string
  ca?: string
  cc?: string
  cd?: string
  cf?: string
  cg?: string
  ch?: string
  ci?: string
  ck?: string
  cl?: string
  cm?: string
  cn?: string
  co?: string
  cr?: string
  cu?: string
  cv?: string
  cw?: string
  cx?: string
  cy?: string
  cz?: string
  de?: string
  dj?: string
  dk?: string
  dm?: string
  do?: string
  dz?: string
  ec?: string
  ee?: string
  eg?: string
  eh?: string
  er?: string
  es?: string
  et?: string
  fi?: string
  fj?: string
  fk?: string
  fm?: string
  fo?: string
  fr?: string
  ga?: string
  gb?: string
  gd?: string
  ge?: string
  gf?: string
  gg?: string
  gh?: string
  gi?: string
  gl?: string
  gm?: string
  gn?: string
  gp?: string
  gq?: string
  gr?: string
  gs?: string
  gt?: string
  gu?: string
  gw?: string
  gy?: string
  hk?: string
  hm?: string
  hn?: string
  hr?: string
  ht?: string
  hu?: string
  id?: string
  ie?: string
  il?: string
  im?: string
  in?: string
  io?: string
  iq?: string
  ir?: string
  is?: string
  it?: string
  je?: string
  jm?: string
  jo?: string
  jp?: string
  ke?: string
  kg?: string
  kh?: string
  ki?: string
  km?: string
  kn?: string
  kp?: string
  kr?: string
  kw?: string
  ky?: string
  kz?: string
  la?: string
  lb?: string
  lc?: string
  li?: string
  lk?: string
  lr?: string
  ls?: string
  lt?: string
  lu?: string
  lv?: string
  ly?: string
  ma?: string
  mc?: string
  md?: string
  me?: string
  mf?: string
  mg?: string
  mh?: string
  mk?: string
  ml?: string
  mm?: string
  mn?: string
  mo?: string
  mp?: string
  mq?: string
  mr?: string
  ms?: string
  mt?: string
  mu?: string
  mv?: string
  mw?: string
  mx?: string
  my?: string
  mz?: string
  na?: string
  nc?: string
  ne?: string
  nf?: string
  ng?: string
  ni?: string
  nl?: string
  no?: string
  np?: string
  nr?: string
  nu?: string
  nz?: string
  om?: string
  pa?: string
  pe?: string
  pf?: string
  pg?: string
  ph?: string
  pk?: string
  pl?: string
  pm?: string
  pn?: string
  pr?: string
  ps?: string
  pt?: string
  pw?: string
  py?: string
  qa?: string
  re?: string
  ro?: string
  rs?: string
  ru?: string
  rw?: string
  sa?: string
  sb?: string
  sc?: string
  sd?: string
  se?: string
  sg?: string
  sh?: string
  si?: string
  sj?: string
  sk?: string
  sl?: string
  sm?: string
  sn?: string
  so?: string
  sr?: string
  ss?: string
  st?: string
  sv?: string
  sx?: string
  sy?: string
  sz?: string
  tc?: string
  td?: string
  tf?: string
  tg?: string
  th?: string
  tj?: string
  tk?: string
  tl?: string
  tm?: string
  tn?: string
  to?: string
  tr?: string
  tt?: string
  tv?: string
  tw?: string
  tz?: string
  ua?: string
  ug?: string
  um?: string
  us?: string
  uy?: string
  uz?: string
  va?: string
  vc?: string
  ve?: string
  vg?: string
  vi?: string
  vn?: string
  vu?: string
  wf?: string
  ws?: string
  xk?: string
  ye?: string
  yt?: string
  za?: string
  zm?: string
  zw?: string
}

export interface Tag {
  /**
   * The color of the tag.
   */
  color: Color
  /**
   * The unique ID of the tag.
   */
  id: string
  /**
   * The name of the tag.
   */
  name: string
  [property: string]: any
}

/**
 * The color of the tag.
 */
export type Color =
  | 'red'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'brown'

/**
 * Geo targeting information for the short link in JSON format `{[COUNTRY]:
 * https://example.com }`.
 */
export interface LinkGeoTargeting {
  ad?: string
  ae?: string
  af?: string
  ag?: string
  ai?: string
  al?: string
  am?: string
  ao?: string
  aq?: string
  ar?: string
  as?: string
  at?: string
  au?: string
  aw?: string
  ax?: string
  az?: string
  ba?: string
  bb?: string
  bd?: string
  be?: string
  bf?: string
  bg?: string
  bh?: string
  bi?: string
  bj?: string
  bl?: string
  bm?: string
  bn?: string
  bo?: string
  bq?: string
  br?: string
  bs?: string
  bt?: string
  bv?: string
  bw?: string
  by?: string
  bz?: string
  ca?: string
  cc?: string
  cd?: string
  cf?: string
  cg?: string
  ch?: string
  ci?: string
  ck?: string
  cl?: string
  cm?: string
  cn?: string
  co?: string
  cr?: string
  cu?: string
  cv?: string
  cw?: string
  cx?: string
  cy?: string
  cz?: string
  de?: string
  dj?: string
  dk?: string
  dm?: string
  do?: string
  dz?: string
  ec?: string
  ee?: string
  eg?: string
  eh?: string
  er?: string
  es?: string
  et?: string
  fi?: string
  fj?: string
  fk?: string
  fm?: string
  fo?: string
  fr?: string
  ga?: string
  gb?: string
  gd?: string
  ge?: string
  gf?: string
  gg?: string
  gh?: string
  gi?: string
  gl?: string
  gm?: string
  gn?: string
  gp?: string
  gq?: string
  gr?: string
  gs?: string
  gt?: string
  gu?: string
  gw?: string
  gy?: string
  hk?: string
  hm?: string
  hn?: string
  hr?: string
  ht?: string
  hu?: string
  id?: string
  ie?: string
  il?: string
  im?: string
  in?: string
  io?: string
  iq?: string
  ir?: string
  is?: string
  it?: string
  je?: string
  jm?: string
  jo?: string
  jp?: string
  ke?: string
  kg?: string
  kh?: string
  ki?: string
  km?: string
  kn?: string
  kp?: string
  kr?: string
  kw?: string
  ky?: string
  kz?: string
  la?: string
  lb?: string
  lc?: string
  li?: string
  lk?: string
  lr?: string
  ls?: string
  lt?: string
  lu?: string
  lv?: string
  ly?: string
  ma?: string
  mc?: string
  md?: string
  me?: string
  mf?: string
  mg?: string
  mh?: string
  mk?: string
  ml?: string
  mm?: string
  mn?: string
  mo?: string
  mp?: string
  mq?: string
  mr?: string
  ms?: string
  mt?: string
  mu?: string
  mv?: string
  mw?: string
  mx?: string
  my?: string
  mz?: string
  na?: string
  nc?: string
  ne?: string
  nf?: string
  ng?: string
  ni?: string
  nl?: string
  no?: string
  np?: string
  nr?: string
  nu?: string
  nz?: string
  om?: string
  pa?: string
  pe?: string
  pf?: string
  pg?: string
  ph?: string
  pk?: string
  pl?: string
  pm?: string
  pn?: string
  pr?: string
  ps?: string
  pt?: string
  pw?: string
  py?: string
  qa?: string
  re?: string
  ro?: string
  rs?: string
  ru?: string
  rw?: string
  sa?: string
  sb?: string
  sc?: string
  sd?: string
  se?: string
  sg?: string
  sh?: string
  si?: string
  sj?: string
  sk?: string
  sl?: string
  sm?: string
  sn?: string
  so?: string
  sr?: string
  ss?: string
  st?: string
  sv?: string
  sx?: string
  sy?: string
  sz?: string
  tc?: string
  td?: string
  tf?: string
  tg?: string
  th?: string
  tj?: string
  tk?: string
  tl?: string
  tm?: string
  tn?: string
  to?: string
  tr?: string
  tt?: string
  tv?: string
  tw?: string
  tz?: string
  ua?: string
  ug?: string
  um?: string
  us?: string
  uy?: string
  uz?: string
  va?: string
  vc?: string
  ve?: string
  vg?: string
  vi?: string
  vn?: string
  vu?: string
  wf?: string
  ws?: string
  xk?: string
  ye?: string
  yt?: string
  za?: string
  zm?: string
  zw?: string
}
