import type { Box } from '../../components/lesson-stage/stage-look';
import { catalog, type Age } from '../library';

// The shape of the clean, darker clearing a backdrop leaves for a lesson's
// props: a table in the lower middle, a band across the middle, or most of
// the frame.
export type Clearing = 'table' | 'band' | 'open';

export const clearingNames: Readonly<Record<Clearing, string>> = {
  table: '下方中间桌面',
  band: '中间横带',
  open: '整片开阔',
};

// One painted 16:9 backdrop, chosen by its tags: the place, its time of day
// and light, the school years it suits, its clearing and where that lies in
// the 1200×675 world, the part of the picture kept in view when the frame
// crops it, the subjects and kinds of problem it fits, and the prompt it was
// generated from, as docs/design/lesson-media.md gives it.
type BackdropEntry = Readonly<{
  file: string;
  setting: string;
  light: string;
  ages: readonly [Age, ...Age[]];
  clearing: Clearing;
  clearZone: Box;
  focus: string;
  fits: readonly [string, ...string[]];
  prompt: string;
}>;

const entries = {
  'garden-morning': {
    file: 'garden-morning.webp',
    setting: '菜园',
    light: '清晨暖光',
    ages: ['low'],
    clearing: 'table',
    clearZone: { x: 300, y: 200, width: 800, height: 350 },
    focus: 'center 56%',
    fits: ['称重和等量', '替换和比较'],
    prompt:
      "Create a full-bleed animated feature-film background plate for a Chinese children's educational mini scene, horizontal wide 16:9. A lush vegetable garden at golden morning with tactile sculpted 3D clay and painted wood, exceptionally art directed, honey light, layered foreground (huge leaves in the extreme lower corners, little nasturtium flowers and dew drops), middle ground (a large round/oval empty harvest workbench in honey wood spanning the entire central lower third, surface clearly visible, seen at a low three-quarter angle), and deep background (pastel hills, greenhouse, fruit tree, cheerful vegetable rows, a turquoise potting shed to the left, tiny butterflies, drifting mist). Keep the workbench surface empty and the center above it relatively uncluttered, as a readable darkish teal-green clearing for compositing an interactive balance scale. Leave headroom. No characters, no scale, no loose produce on the workbench, no type, no UI, no split panels, no marks. Moody teal shadows, apricot sun, saturated but beautiful. Looks like an opening establishing shot from a carefully lit 3D family animated short.",
  },
  'art-studio-evening': {
    file: 'art-studio-evening.webp',
    setting: '画室',
    light: '傍晚紫橙灯光',
    ages: ['low', 'middle'],
    clearing: 'open',
    clearZone: { x: 150, y: 270, width: 890, height: 350 },
    focus: 'center 60%',
    fits: ['配对和计数', '排列和分类'],
    prompt:
      'Wide 16:9 background for an interactive animated short for primary school children about arranging colored pencils. Warm inviting whimsical 3D animated film art studio, seen from a slightly high camera looking down at a large apricot maple artist worktable which fills the lower two thirds, clean broad clear central work surface, pale cream colored mat or paper texture in the central area only if subtle, richly detailed out at the extreme left and right edges with ceramic paint cups, curling scraps of colored paper, wooden toy star, spool, soft purple lamp, and a lavender wall with simple craft shapes far in the background. Tactile rounded clay/wood materials, soft gradient shadows, gorgeous purple/orange evening studio lighting, cheerful, child-scale. Leave the central 75% across the table entirely empty for large movable pencil sprites and later a teaching diagram. No pencils, no characters, no writing, no numbers, no labels, no UI. Family animated feature film production quality with appealing strong depth and atmospheric perspective.',
  },
  'railway-workshop-dusk': {
    file: 'railway-workshop-dusk.webp',
    setting: '火车工作间',
    light: '蓝调时分灯光',
    ages: ['high'],
    clearing: 'open',
    clearZone: { x: 140, y: 265, width: 860, height: 330 },
    focus: 'center 60%',
    fits: ['数轴和行程', '方程'],
    prompt:
      'Wide 16:9 background plate for a polished 2.5D interactive animated mathematics short for ages 10–12. A miniature railway engineering workshop at blue hour, rendered in tactile painted 3D wood and brass. Seen straight on from a slightly elevated cinematic camera. Warm pools of lamp light, teal walls, a huge round out-of-focus clock high in the far background, a few gears, drafting tools, brass rails and miniature decorative structures at the very edges. The central 80% is a clear broad deep petrol-blue horizontal workbench/dark matte blueprint surface with strong visual depth, spanning most of the middle and lower screen, deliberately uncluttered for overlaying two high contrast tracks, animated model trains and movable equation blocks. Muted behind central area so the teaching diagram reads, visually rich edges, magenta sunset rim light, rich dark teal and gold palette. No lettering, no symbols, no number lines, no actual trains, no graph and no split-panel or HUD.',
  },
  'forest-picnic-morning': {
    file: 'forest-picnic-morning.webp',
    setting: '林间草地',
    light: '清晨薄雾阳光',
    ages: ['low'],
    clearing: 'table',
    clearZone: { x: 250, y: 220, width: 700, height: 300 },
    focus: 'center 55%',
    fits: ['分东西和平均分', '配对和计数'],
    prompt:
      "Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A sunny forest clearing in early morning mist. Middle ground: a wide, low, round tree-stump table with a smooth pale wood top, seen from a low three-quarter angle, filling the central lower third, its top surface clearly visible. Foreground: giant ferns, little mushrooms and clover in the extreme lower corners, a few glistening dew drops. Background: birch and pine trunks fading into soft golden mist, slanting light shafts, a tiny wooden birdhouse on a far tree. Palette of fresh moss green, cream and honey gold with soft blue-green shadows. Big simple toy-like shapes, bright, cheerful and cozy for ages 6 to 8. Keep the table top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no text, letters, numbers or symbols, no signs with writing, no UI, no frames or split panels, no watermark.",
  },
  'pastry-shop-afternoon': {
    file: 'pastry-shop-afternoon.webp',
    setting: '街角点心铺',
    light: '午后奶油色暖光',
    ages: ['low'],
    clearing: 'table',
    clearZone: { x: 180, y: 300, width: 840, height: 230 },
    focus: 'center 65%',
    fits: ['买卖和凑钱', '加法和减法'],
    prompt:
      "Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A cozy little Chinese neighborhood pastry shop in the afternoon, warm creamy light pouring through a round window. Middle ground: a long, empty, honey-colored wooden counter top seen from a low three-quarter angle, filling the central lower third, its surface clearly visible. At the far left edge, stacked bamboo steamer baskets with soft steam; at the far right edge, out-of-focus glass jars of round candies and a potted plant; plain round paper lanterns without any writing hang near the top corners. Background: shelves of buns and mooncake molds softly blurred, a warm brick wall. Palette of cream, apricot, soft red and warm brown with gentle plum shadows. Big simple toy-like shapes, bright, cheerful and cozy for ages 6 to 8. Keep the counter top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no text, letters, numbers or symbols, no price tags, no signs with writing, no UI, no frames or split panels, no watermark.",
  },
  'toy-classroom-day': {
    file: 'toy-classroom-day.webp',
    setting: '积木玩具教室',
    light: '白天窗边光',
    ages: ['low'],
    clearing: 'open',
    clearZone: { x: 200, y: 260, width: 800, height: 330 },
    focus: 'center 60%',
    fits: ['图形和拼搭', '排列和分类'],
    prompt:
      "Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A bright playful classroom corner for young children in soft daytime window light, seen from a slightly high camera looking down. Most of the frame is a large, plain, soft felt play mat on the floor in a single muted sage tone. At the far left and right edges: low wooden shelves with toy boxes, a few wooden blocks, a toy train engine and a plush ball, a potted plant; in the background, a big window with sheer curtains and a pale wall with simple cut-paper clouds. Palette of sage, butter yellow, sky blue and warm wood with soft lilac shadows. Big simple toy-like shapes, bright, cheerful and cozy for ages 6 to 8. Keep the central play mat empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width and the middle half of the height, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no text, letters, numbers or symbols, no posters with writing, no UI, no frames or split panels, no watermark.",
  },
  'seaside-beach-noon': {
    file: 'seaside-beach-noon.webp',
    setting: '海边沙滩',
    light: '晴天正午',
    ages: ['low'],
    clearing: 'band',
    clearZone: { x: 150, y: 290, width: 900, height: 300 },
    focus: 'center 65%',
    fits: ['找规律', '数一数和比多少'],
    prompt:
      "Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A gentle seaside beach on a sunny midday, viewed straight on. A broad, smooth band of damp, slightly darker golden sand runs horizontally across the middle of the frame, flat and clean. Foreground: tufts of beach grass, a few shells and a little toy bucket in the extreme lower corners. Background: shallow turquoise waves with soft foam, a small red-and-white lighthouse on a far headland, puffy sculpted clouds in a clear sky. Palette of warm sand, turquoise, coral and white with soft teal shadows. Big simple toy-like shapes, bright, cheerful and cozy for ages 6 to 8. Keep the band of damp sand empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width and the middle third of the height, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no footprints, no text, letters, numbers or symbols, no signs with writing, no UI, no frames or split panels, no watermark.",
  },
  'town-market-afternoon': {
    file: 'town-market-afternoon.webp',
    setting: '小镇集市',
    light: '午后阳光',
    ages: ['middle'],
    clearing: 'band',
    clearZone: { x: 170, y: 230, width: 860, height: 200 },
    focus: 'center 50%',
    fits: ['买卖和价格', '乘法和除法'],
    prompt:
      "Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A lively small-town Chinese open-air market street in warm afternoon sun, viewed straight on from a slightly elevated camera. A long, plain, empty wooden stall counter runs horizontally across the middle of the frame, its top clearly visible. At the far left and right edges: striped cloth awnings, bamboo baskets of fruit and vegetables, hanging red lanterns without any writing, a bicycle with a basket. Background: whitewashed walls, grey tiled roofs, a small arched stone bridge and green hills softly out of focus. Palette of warm terracotta, leaf green, lantern red and sunlit cream with blue-violet shadows. More naturalistic detail and daylight, still warm and friendly, for ages 8 to 10. Keep the counter top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no text, letters, numbers or symbols, no price tags, no signs with writing, no UI, no frames or split panels, no watermark.",
  },
  'woodshop-morning': {
    file: 'woodshop-morning.webp',
    setting: '木工坊',
    light: '晨光斜照',
    ages: ['middle'],
    clearing: 'table',
    clearZone: { x: 150, y: 280, width: 900, height: 240 },
    focus: 'center 60%',
    fits: ['测量和长度', '面积和周长'],
    prompt:
      "Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A warm carpenter's workshop in slanting golden morning light. Middle ground: a large, flat, empty workbench of pale planed wood seen from a low three-quarter angle, filling the central lower third, its top surface clearly visible. At the far left and right edges: hand tools hanging on a pegboard, wooden clamps, curled wood shavings, a stack of planks, a small vise; sawdust motes glowing in the light beams. Background: a tall window with dusty light, shelves of wooden toys in progress, softly blurred. Palette of honey wood, olive green and warm brass with deep umber shadows. More naturalistic detail and daylight, still warm and friendly, for ages 8 to 10. Keep the workbench top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no rulers or tape measures, no text, letters, numbers or symbols, no UI, no frames or split panels, no watermark.",
  },
  'library-corner-rainy': {
    file: 'library-corner-rainy.webp',
    setting: '图书馆一角',
    light: '雨天室内灯光',
    ages: ['middle'],
    clearing: 'open',
    clearZone: { x: 250, y: 40, width: 630, height: 420 },
    focus: 'center 35%',
    fits: ['语文故事和阅读', '时间和日历'],
    prompt:
      "Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A quiet school library corner on a rainy afternoon, warm lamp light inside and cool blue-grey light from rain-streaked tall windows. The central part of the frame is wide and calm: a softly lit plain back wall in a muted deep green above a long, empty reading table. At the far left and right edges: tall wooden bookshelves with colorful book spines without any titles, a reading lamp with a warm glow, a globe, a cushioned window seat, a potted fern. Palette of deep green, warm amber, dusty rose and rainy blue. More naturalistic detail, still warm and friendly, for ages 8 to 10. Keep the wall and the table top empty, calm and slightly darker than their surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width and the middle half of the height, so story cards and pictures composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no text, letters, numbers or symbols, no posters, clocks or calendars, no UI, no frames or split panels, no watermark.",
  },
  'greenhouse-noon': {
    file: 'greenhouse-noon.webp',
    setting: '植物温室',
    light: '正午柔光',
    ages: ['middle'],
    clearing: 'table',
    clearZone: { x: 150, y: 290, width: 900, height: 240 },
    focus: 'center 65%',
    fits: ['统计和图表', '观察和记录'],
    prompt:
      "Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A glass greenhouse at midday with soft, diffused light through misted panes. Middle ground: a long, empty potting table with a smooth slate-grey top, seen from a low three-quarter angle, filling the central lower third, its surface clearly visible. At the far left and right edges: hanging ferns, trays of seedlings, terracotta pots, a watering can, climbing tomato vines. Background: sunlit glass panes with white frames, tall leafy plants and a hint of blue sky, softly blurred. Palette of fresh leaf green, slate grey, terracotta and pale sky blue with cool green shadows. More naturalistic detail and daylight, still warm and friendly, for ages 8 to 10. Keep the table top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no labels or plant tags, no text, letters, numbers or symbols, no UI, no frames or split panels, no watermark.",
  },
  'observatory-night': {
    file: 'observatory-night.webp',
    setting: '山顶天文台',
    light: '深夜星光',
    ages: ['high'],
    clearing: 'open',
    clearZone: { x: 200, y: 30, width: 820, height: 400 },
    focus: 'center 30%',
    fits: ['角度和方向', '比和比例尺'],
    prompt:
      "Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. Inside a small mountaintop observatory at night, the dome slit wide open to a deep, calm indigo sky with only faint tiny stars and a soft hint of the Milky Way near the top. At the far left and right edges: a large brass telescope, curved wooden dome ribs, a desk lamp with a small warm glow, rolled star charts, a celestial globe; distant snowy peaks under moonlight at the bottom edge. Palette of deep indigo, midnight teal, brass gold and cool silver with a touch of warm lamp orange. Cinematic, refined and less toy-like, a cooler sophisticated palette, for ages 10 to 12. Keep the central sky empty, calm and darker than its surroundings, with very low detail and no bright stars or highlights, spanning about the central 70 percent of the width and the middle half of the height, so diagrams and moving objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no constellation lines, no text, letters, numbers or symbols, no UI, no frames or split panels, no watermark.",
  },
  'science-lab-evening': {
    file: 'science-lab-evening.webp',
    setting: '科学实验室',
    light: '傍晚冷白灯光',
    ages: ['high'],
    clearing: 'table',
    clearZone: { x: 150, y: 330, width: 850, height: 260 },
    focus: 'center 65%',
    fits: ['分数和百分比', '浓度和配比'],
    prompt:
      "Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A cozy school science lab in the evening, cool white and teal lab lamps inside and a warm orange sunset glowing through the far windows. Middle ground: a long, clean, empty lab bench with a dark matte slate top, seen from a low three-quarter angle, filling the central lower third, its surface clearly visible. At the far left and right edges: glass flasks and beakers with softly glowing colored liquids, a microscope, a rack of test tubes, a potted succulent, a small brass balance. Background: cabinets with glass doors and the sunset windows, softly blurred. Palette of deep teal, slate, cool white and sunset orange with a touch of violet. Cinematic, refined and less toy-like, a cooler sophisticated palette, for ages 10 to 12. Keep the bench top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no measuring marks, no text, letters, numbers or symbols, no labels, no UI, no frames or split panels, no watermark.",
  },
  'city-model-studio-morning': {
    file: 'city-model-studio-morning.webp',
    setting: '城市模型工作室',
    light: '清晨蓝白光',
    ages: ['high'],
    clearing: 'table',
    clearZone: { x: 160, y: 360, width: 840, height: 240 },
    focus: 'center 70%',
    fits: ['几何和立体图形', '比例尺和地图'],
    prompt:
      "Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. An architect's city model studio in cool, clear early morning light, seen from a slightly elevated camera. Middle ground: a large, flat, empty model table with a matte grey-blue top, filling the central lower third, its surface clearly visible. At the far left and right edges: small white paper building models, sponge trees, rolled plans, a drafting lamp, a cutting mat and wooden set squares. Background: tall steel-framed windows with a soft city skyline and a river in morning haze. Palette of grey-blue, paper white, pale gold and soft sage with cool blue shadows. Cinematic, refined and less toy-like, a cooler sophisticated palette, for ages 10 to 12. Keep the model table top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no maps or grids on the table, no text, letters, numbers or symbols, no UI, no frames or split panels, no watermark.",
  },
  'river-bridge-dusk': {
    file: 'river-bridge-dusk.webp',
    setting: '河边大桥',
    light: '黄昏金光',
    ages: ['high'],
    clearing: 'band',
    clearZone: { x: 150, y: 180, width: 900, height: 260 },
    focus: 'center 45%',
    fits: ['行程和相遇', '工程问题'],
    prompt:
      "Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A wide, calm river at golden dusk, viewed straight on. A broad, smooth band of still, dark river water runs horizontally across the middle of the frame with only a soft blurred reflection of the sky. Foreground: reeds, stone steps and a mooring post in the extreme lower corners. Background, high above the water band: a long elegant stone-and-steel bridge spanning the far distance, a riverside town with warm window lights, layered hills in haze. Palette of deep teal water, golden amber sky, dusky rose and slate blue. Cinematic, refined and less toy-like, a cooler sophisticated palette, for ages 10 to 12. Keep the band of water empty, calm and darker than its surroundings, with low detail and no bright highlights or boats, spanning about the central 70 percent of the width and the middle third of the height, so tracks and moving objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no boats or vehicles, no text, letters, numbers or symbols, no signs with writing, no UI, no frames or split panels, no watermark.",
  },
} as const satisfies Record<string, BackdropEntry>;

export type BackdropId = keyof typeof entries;

// Every backdrop in the library, by id, each with the address of its picture.
export const backdrops = catalog<BackdropId, BackdropEntry>(
  entries,
  import.meta.glob<string>('./*.webp', { eager: true, query: '?url', import: 'default' }),
);

export type LibraryBackdrop = (typeof backdrops)[BackdropId];
