# 绘景、讲课角色和书的封面的风格说明与提示词

绘景库和角色库（见 [课堂公共部件与绘景库](lesson-kit.md#绘景库和角色库)）、封面库（见 [家长书架与按书安排练习](bookshelf.md#封面库)）里的图都按这份说明，用 OpenAI 的图像模型生成。Claude Code 不自己画这些图：它按维护者的批准调用图像模型，或者接收维护者在 Codex 里生成的图，再把图转成 WebP、量出空地、填好清单、加上 story 和视觉基准。

库里 #48 的三张背景（菜园、画室、火车工作间）和小兔是这套风格最早的样子，它们的提示词记在 `apps/web/src/features/learning/media/` 的清单里。下面的 12 张背景和 3 个角色是第一批按这份说明生成的图，清单里记的提示词和这里一致。书的封面见文末的[书的封面](#书的封面)。

## 统一风格

### 背景

- **像动画长片的开场镜头**：电影级的 2.5D/3D 手作质感，用捏塑的黏土、上色的木头、毛毡和纸做的材质，形状圆润；有前景、中景、远景三层，远处有空气透视，景深柔和。
- **光影有方向**：一个明确的主光（晨光、午后阳光、灯光、星光），阴影偏冷，亮部偏暖；颜色饱满但不刺眼，不用荧光色。
- **中间留空地**：题目的道具叠在空地上，所以空地要干净、偏暗、色调统一、细节少，没有高光和花纹。空地左右不超过画面中间约 70% 的宽度：手机竖着拿时，画面只显示世界里 x 从 145 到 1055 的一段，也就是中间 76%。上下大约占画面中间的一半，上方留出天空或墙面。
- **细节放在四周**：最丰富的东西放在左右两边和四个角，前景的大叶子、工具、杂物只露出一部分。
- **不画**：人物和动物、文字、字母、数字、符号、有字的招牌、界面、边框、分格画面、水印，也不画题目要让孩子操作的东西（例如天平、铅笔、火车）。
- **空地的三种形状**：下方中间一张桌面或台面（`table`），从低处约四分之三的角度看过去，台面要看得清；中间一条横带（`band`），例如一条湿沙、一个长柜台、一段平静的河面；整片开阔（`open`），画面大半是平整的地面、墙面或天空。
- **按年龄段调整**：低年级（1–2）形状更大更简单、颜色更暖更亮、像玩具；中年级（3–4）细节更多，更接近真实的日光和材质，仍然亲切；高年级（5–6）更像电影、更精致，配色更冷、更沉稳，少一些稚气。

### 讲课角色

- 一个角色一张图：全身、透明底、竖幅 2:3，角色占画面高度的约 90%，居中，轮廓清楚，耳朵、尾巴、翅膀都在画面里。
- 姿势统一：身体微微前倾，一只手（爪、翅）朝观看者的右边指，眼睛也看向右边，像在请孩子看画面里的东西。题目可以把角色左右翻转放在另一边。
- 和小兔同样的质感：3D 动画长片级别，柔和的手绘纹理，暖色轮廓光，比例讨喜。
- 衣服的颜色要和背景分得开，不和空地的颜色撞色。
- 不画站台、场景、轮廓外的影子、其他物品和文字。

## 出图和交付

两种出图方式，用同一条提示词：

- **调用 Images API**：维护者批准这次的张数后，用维护者自己的 OpenAI 密钥调用 `POST /v1/images/generations`。模型 `gpt-image-2.5-sunburst`，`quality: high`，`output_format: png`；背景 `size: 1680x944`（16:9，两边都是 16 的倍数）、`background: opaque`，角色 `size: 1024x1536`、`background: transparent`。密钥只放在本机仓库以外的密钥文件里，只交给发请求的进程，不写进仓库、日志、截图和提交。第一批 15 张每张用了 1162 到 1372 个图像输出 token，按当时的价格每张约 0.04 美元。
- **在 Codex 里用 ImageGen**：维护者把提示词贴进 Codex，背景出横幅 16:9，角色出透明底竖幅，用能给的最高分辨率。

图存成 PNG，文件名是下面表里的 id，例如 `forest-picnic-morning.png`、`squirrel.png`。入库时背景转成 WebP 并压到每张不超过 400 KB，保持原尺寸；角色缩成 512×768 的 WebP，保留透明底。然后量出每张背景的空地在 1200×675 世界里的矩形，定好画框比例不同时保留的位置（`focus`），填好清单的标签，每张图加一个 story，在固定镜像里生成视觉基准。

出图后维护者逐张看：

- [ ] 空地干净、偏暗、没有杂物和高光，大小够放这一类题的道具。
- [ ] 画面里没有人物、动物、文字、乱码字母、数字和符号。
- [ ] 手机竖着拿时（只看中间 76% 的宽度），空地仍然在画面里。
- [ ] 适合这个年龄段的孩子，和库里现有的图放在一起风格一致。
- [ ] 角色的透明底干净，没有白边和残留的背景。

不合适的用同一条提示词重新生成；改了提示词时，这份文件和清单里记的都是最后用的那一条。

## 背景

| id                          | 年龄段 | 场景           | 时间和色调     | 空地     | 适合                         |
| --------------------------- | ------ | -------------- | -------------- | -------- | ---------------------------- |
| `forest-picnic-morning`     | 低年级 | 林间草地       | 清晨薄雾阳光   | 下方桌面 | 分东西和平均分、配对和计数   |
| `pastry-shop-afternoon`     | 低年级 | 街角点心铺     | 午后奶油色暖光 | 下方桌面 | 买卖和凑钱、加法和减法       |
| `toy-classroom-day`         | 低年级 | 积木玩具教室   | 白天窗边光     | 整片开阔 | 图形和拼搭、排列和分类       |
| `seaside-beach-noon`        | 低年级 | 海边沙滩       | 晴天正午       | 中间横带 | 找规律、数一数和比多少       |
| `town-market-afternoon`     | 中年级 | 小镇集市       | 午后阳光       | 中间横带 | 买卖和价格、乘法和除法       |
| `woodshop-morning`          | 中年级 | 木工坊         | 晨光斜照       | 下方桌面 | 测量和长度、面积和周长       |
| `library-corner-rainy`      | 中年级 | 图书馆一角     | 雨天室内灯光   | 整片开阔 | 语文故事和阅读、时间和日历   |
| `greenhouse-noon`           | 中年级 | 植物温室       | 正午柔光       | 下方桌面 | 统计和图表、观察和记录       |
| `observatory-night`         | 高年级 | 山顶天文台     | 深夜星光       | 整片开阔 | 角度和方向、比和比例尺       |
| `science-lab-evening`       | 高年级 | 科学实验室     | 傍晚冷白灯光   | 下方桌面 | 分数和百分比、浓度和配比     |
| `city-model-studio-morning` | 高年级 | 城市模型工作室 | 清晨蓝白光     | 下方桌面 | 几何和立体图形、比例尺和地图 |
| `river-bridge-dusk`         | 高年级 | 河边大桥       | 黄昏金光       | 中间横带 | 行程和相遇、工程问题         |

### `forest-picnic-morning` 林间草地

- 年龄段：低年级。空地：下方桌面，一张低矮的圆树桩桌。
- 用途：把东西分给几个小伙伴、一个对一个配对、数数。

```text
Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A sunny forest clearing in early morning mist. Middle ground: a wide, low, round tree-stump table with a smooth pale wood top, seen from a low three-quarter angle, filling the central lower third, its top surface clearly visible. Foreground: giant ferns, little mushrooms and clover in the extreme lower corners, a few glistening dew drops. Background: birch and pine trunks fading into soft golden mist, slanting light shafts, a tiny wooden birdhouse on a far tree. Palette of fresh moss green, cream and honey gold with soft blue-green shadows. Big simple toy-like shapes, bright, cheerful and cozy for ages 6 to 8. Keep the table top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no text, letters, numbers or symbols, no signs with writing, no UI, no frames or split panels, no watermark.
```

### `pastry-shop-afternoon` 街角点心铺

- 年龄段：低年级。空地：下方桌面，一段空着的木柜台。
- 用途：买东西、凑钱和找零、十以内和百以内的加减。

```text
Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A cozy little Chinese neighborhood pastry shop in the afternoon, warm creamy light pouring through a round window. Middle ground: a long, empty, honey-colored wooden counter top seen from a low three-quarter angle, filling the central lower third, its surface clearly visible. At the far left edge, stacked bamboo steamer baskets with soft steam; at the far right edge, out-of-focus glass jars of round candies and a potted plant; plain round paper lanterns without any writing hang near the top corners. Background: shelves of buns and mooncake molds softly blurred, a warm brick wall. Palette of cream, apricot, soft red and warm brown with gentle plum shadows. Big simple toy-like shapes, bright, cheerful and cozy for ages 6 to 8. Keep the counter top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no text, letters, numbers or symbols, no price tags, no signs with writing, no UI, no frames or split panels, no watermark.
```

### `toy-classroom-day` 积木玩具教室

- 年龄段：低年级。空地：整片开阔，教室中间一大块素色地垫。
- 用途：拼图形、搭积木、按颜色和形状排队或分类。

```text
Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A bright playful classroom corner for young children in soft daytime window light, seen from a slightly high camera looking down. Most of the frame is a large, plain, soft felt play mat on the floor in a single muted sage tone. At the far left and right edges: low wooden shelves with toy boxes, a few wooden blocks, a toy train engine and a plush ball, a potted plant; in the background, a big window with sheer curtains and a pale wall with simple cut-paper clouds. Palette of sage, butter yellow, sky blue and warm wood with soft lilac shadows. Big simple toy-like shapes, bright, cheerful and cozy for ages 6 to 8. Keep the central play mat empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width and the middle half of the height, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no text, letters, numbers or symbols, no posters with writing, no UI, no frames or split panels, no watermark.
```

### `seaside-beach-noon` 海边沙滩

- 年龄段：低年级。空地：中间横带，一条平整的湿沙。
- 用途：贝壳和脚印的规律、数一数、比多少。

```text
Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A gentle seaside beach on a sunny midday, viewed straight on. A broad, smooth band of damp, slightly darker golden sand runs horizontally across the middle of the frame, flat and clean. Foreground: tufts of beach grass, a few shells and a little toy bucket in the extreme lower corners. Background: shallow turquoise waves with soft foam, a small red-and-white lighthouse on a far headland, puffy sculpted clouds in a clear sky. Palette of warm sand, turquoise, coral and white with soft teal shadows. Big simple toy-like shapes, bright, cheerful and cozy for ages 6 to 8. Keep the band of damp sand empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width and the middle third of the height, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no footprints, no text, letters, numbers or symbols, no signs with writing, no UI, no frames or split panels, no watermark.
```

### `town-market-afternoon` 小镇集市

- 年龄段：中年级。空地：中间横带，一张空着的长摊台。
- 用途：单价、数量和总价，乘法和除法，凑整。

```text
Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A lively small-town Chinese open-air market street in warm afternoon sun, viewed straight on from a slightly elevated camera. A long, plain, empty wooden stall counter runs horizontally across the middle of the frame, its top clearly visible. At the far left and right edges: striped cloth awnings, bamboo baskets of fruit and vegetables, hanging red lanterns without any writing, a bicycle with a basket. Background: whitewashed walls, grey tiled roofs, a small arched stone bridge and green hills softly out of focus. Palette of warm terracotta, leaf green, lantern red and sunlit cream with blue-violet shadows. More naturalistic detail and daylight, still warm and friendly, for ages 8 to 10. Keep the counter top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no text, letters, numbers or symbols, no price tags, no signs with writing, no UI, no frames or split panels, no watermark.
```

### `woodshop-morning` 木工坊

- 年龄段：中年级。空地：下方桌面，一张刨得平平的空工作台。
- 用途：量长度、拼木板算面积和周长、单位换算。

```text
Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A warm carpenter's workshop in slanting golden morning light. Middle ground: a large, flat, empty workbench of pale planed wood seen from a low three-quarter angle, filling the central lower third, its top surface clearly visible. At the far left and right edges: hand tools hanging on a pegboard, wooden clamps, curled wood shavings, a stack of planks, a small vise; sawdust motes glowing in the light beams. Background: a tall window with dusty light, shelves of wooden toys in progress, softly blurred. Palette of honey wood, olive green and warm brass with deep umber shadows. More naturalistic detail and daylight, still warm and friendly, for ages 8 to 10. Keep the workbench top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no rulers or tape measures, no text, letters, numbers or symbols, no UI, no frames or split panels, no watermark.
```

### `library-corner-rainy` 图书馆一角

- 年龄段：中年级。空地：整片开阔，书架之间一面素墙和下面一张空的长阅读桌。
- 用途：语文故事和阅读理解、看图说话、时间和日历。

```text
Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A quiet school library corner on a rainy afternoon, warm lamp light inside and cool blue-grey light from rain-streaked tall windows. The central part of the frame is wide and calm: a softly lit plain back wall in a muted deep green above a long, empty reading table. At the far left and right edges: tall wooden bookshelves with colorful book spines without any titles, a reading lamp with a warm glow, a globe, a cushioned window seat, a potted fern. Palette of deep green, warm amber, dusty rose and rainy blue. More naturalistic detail, still warm and friendly, for ages 8 to 10. Keep the wall and the table top empty, calm and slightly darker than their surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width and the middle half of the height, so story cards and pictures composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no text, letters, numbers or symbols, no posters, clocks or calendars, no UI, no frames or split panels, no watermark.
```

### `greenhouse-noon` 植物温室

- 年龄段：中年级。空地：下方桌面，一张空的长育苗台。
- 用途：记录植物长高、做统计表和条形图、观察比较。

```text
Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A glass greenhouse at midday with soft, diffused light through misted panes. Middle ground: a long, empty potting table with a smooth slate-grey top, seen from a low three-quarter angle, filling the central lower third, its surface clearly visible. At the far left and right edges: hanging ferns, trays of seedlings, terracotta pots, a watering can, climbing tomato vines. Background: sunlit glass panes with white frames, tall leafy plants and a hint of blue sky, softly blurred. Palette of fresh leaf green, slate grey, terracotta and pale sky blue with cool green shadows. More naturalistic detail and daylight, still warm and friendly, for ages 8 to 10. Keep the table top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no labels or plant tags, no text, letters, numbers or symbols, no UI, no frames or split panels, no watermark.
```

### `observatory-night` 山顶天文台

- 年龄段：高年级。空地：整片开阔，穹顶开口里一大片安静的深蓝夜空。
- 用途：角度和方向、比和比例尺、太空和科学题。

```text
Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. Inside a small mountaintop observatory at night, the dome slit wide open to a deep, calm indigo sky with only faint tiny stars and a soft hint of the Milky Way near the top. At the far left and right edges: a large brass telescope, curved wooden dome ribs, a desk lamp with a small warm glow, rolled star charts, a celestial globe; distant snowy peaks under moonlight at the bottom edge. Palette of deep indigo, midnight teal, brass gold and cool silver with a touch of warm lamp orange. Cinematic, refined and less toy-like, a cooler sophisticated palette, for ages 10 to 12. Keep the central sky empty, calm and darker than its surroundings, with very low detail and no bright stars or highlights, spanning about the central 70 percent of the width and the middle half of the height, so diagrams and moving objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no constellation lines, no text, letters, numbers or symbols, no UI, no frames or split panels, no watermark.
```

### `science-lab-evening` 科学实验室

- 年龄段：高年级。空地：下方桌面，一张空的深色实验台。
- 用途：分数和百分比、溶液浓度和配比、实验数据。

```text
Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A cozy school science lab in the evening, cool white and teal lab lamps inside and a warm orange sunset glowing through the far windows. Middle ground: a long, clean, empty lab bench with a dark matte slate top, seen from a low three-quarter angle, filling the central lower third, its surface clearly visible. At the far left and right edges: glass flasks and beakers with softly glowing colored liquids, a microscope, a rack of test tubes, a potted succulent, a small brass balance. Background: cabinets with glass doors and the sunset windows, softly blurred. Palette of deep teal, slate, cool white and sunset orange with a touch of violet. Cinematic, refined and less toy-like, a cooler sophisticated palette, for ages 10 to 12. Keep the bench top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no measuring marks, no text, letters, numbers or symbols, no labels, no UI, no frames or split panels, no watermark.
```

### `city-model-studio-morning` 城市模型工作室

- 年龄段：高年级。空地：下方桌面，一张空的大模型台。
- 用途：几何和立体图形、展开图、比例尺和地图。

```text
Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. An architect's city model studio in cool, clear early morning light, seen from a slightly elevated camera. Middle ground: a large, flat, empty model table with a matte grey-blue top, filling the central lower third, its surface clearly visible. At the far left and right edges: small white paper building models, sponge trees, rolled plans, a drafting lamp, a cutting mat and wooden set squares. Background: tall steel-framed windows with a soft city skyline and a river in morning haze. Palette of grey-blue, paper white, pale gold and soft sage with cool blue shadows. Cinematic, refined and less toy-like, a cooler sophisticated palette, for ages 10 to 12. Keep the model table top empty, calm and slightly darker than its surroundings, with low detail and no bright highlights, spanning about the central 70 percent of the width, and keep the space above it uncluttered, so interactive objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no maps or grids on the table, no text, letters, numbers or symbols, no UI, no frames or split panels, no watermark.
```

### `river-bridge-dusk` 河边大桥

- 年龄段：高年级。空地：中间横带，一段平静的深色河面。
- 用途：两船或两车相遇和追及、工程问题、行程图。

```text
Wide 16:9 full-bleed background plate for a Chinese children's interactive animated lesson, made like an opening establishing shot from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, layered foreground, middle ground and deep background with atmospheric perspective and gentle depth of field. A wide, calm river at golden dusk, viewed straight on. A broad, smooth band of still, dark river water runs horizontally across the middle of the frame with only a soft blurred reflection of the sky. Foreground: reeds, stone steps and a mooring post in the extreme lower corners. Background, high above the water band: a long elegant stone-and-steel bridge spanning the far distance, a riverside town with warm window lights, layered hills in haze. Palette of deep teal water, golden amber sky, dusky rose and slate blue. Cinematic, refined and less toy-like, a cooler sophisticated palette, for ages 10 to 12. Keep the band of water empty, calm and darker than its surroundings, with low detail and no bright highlights or boats, spanning about the central 70 percent of the width and the middle third of the height, so tracks and moving objects composited there read clearly; put the richest detail at the outer edges and corners. No characters or animals, no boats or vehicles, no text, letters, numbers or symbols, no signs with writing, no UI, no frames or split panels, no watermark.
```

## 讲课角色

| id         | 名字       | 年龄段 | 性格                                                                                             |
| ---------- | ---------- | ------ | ------------------------------------------------------------------------------------------------ |
| `squirrel` | 小松鼠     | 低年级 | 林子里的小管家，热心、爱数东西，说话慢慢的；常请孩子一起数一数、分一分，答错了也笑着再来一次。   |
| `raccoon`  | 小浣熊     | 中年级 | 手巧的小工匠，爱拆爱装、好问为什么，说话爽快；常让孩子先动手量一量、试一试，再一起想道理。       |
| `owl`      | 猫头鹰博士 | 高年级 | 沉稳的天文学家，说话清楚、有条理；常问孩子是怎么想的，帮孩子把想法画成图、写成式子，不替孩子算。 |

小兔（`rabbit`）也在库里，是菜园里的小园丁，属于低年级。

### `squirrel` 小松鼠

```text
Transparent full-body character sprite for a polished family animated movie. One small expressive red squirrel, with a big fluffy curled tail, tufted ears, round black curious eyes, a cream belly and tiny paws, wearing a little moss-green knitted vest and a small butter-yellow scarf. Standing and leaning forward slightly with one paw pointing conversationally toward the viewer's right, eyes looking right, a warm encouraging smile. Visible whole body including the tip of the tail and the ear tufts, clear silhouette, centered, subject uses 90 percent of the vertical image. 3D animated feature-quality character with soft hand-painted texture and warm rim light, appealing proportions, gentle and cute for ages 6 to 8, high production values. No platform, no scene, no shadows outside the silhouette, no other objects or text. True transparent background.
```

### `raccoon` 小浣熊

```text
Transparent full-body character sprite for a polished family animated movie. One expressive young raccoon tinkerer, with a soft grey coat, a dark mask around bright curious eyes, a ringed bushy tail and nimble little hands, wearing a rolled-sleeve sky-blue shirt and a mustard canvas work apron with empty pockets, small round goggles pushed up on the forehead. Standing and leaning forward slightly with one hand pointing conversationally toward the viewer's right, eyes looking right, an eager, curious grin. Visible whole body including the tip of the tail and the ears, clear silhouette, centered, subject uses 90 percent of the vertical image. 3D animated feature-quality character with soft hand-painted texture and warm rim light, appealing, slightly more grown-up proportions for ages 8 to 10, high production values. No platform, no scene, no tools, no shadows outside the silhouette, no other objects or text. True transparent background.
```

### `owl` 猫头鹰博士

```text
Transparent full-body character sprite for a polished family animated movie. One wise, friendly tawny owl astronomer, with soft brown-and-cream patterned feathers, large warm amber eyes behind small round brass-rimmed glasses, and short ear tufts, wearing a deep teal scholar's waistcoat with a tiny brass star pin. Standing upright and leaning forward slightly with one wing raised and its feather tips pointing conversationally toward the viewer's right like a hand, eyes looking right, a calm, thoughtful smile. Visible whole body including the feet and tail feathers, clear silhouette, centered, subject uses 90 percent of the vertical image. 3D animated feature-quality character with soft hand-painted texture and cool silver rim light, refined and not babyish, appealing for ages 10 to 12, high production values. No platform, no scene, no books, no shadows outside the silhouette, no other objects or text. True transparent background.
```

## 书的封面

封面是书架和孩子题库首页的书卡上代表一本书的竖版图片，放在封面库里。它和绘景是两套图：绘景是题目页的整屏背景，封面不在题目里出现，绘景也不拿来当封面。

### 风格

- **和绘景同一种质感**：2.5D/3D 手作，捏塑的黏土、上色的木头、毛毡和纸，形状圆润，景深柔和，一个明确的主光，阴影偏冷、亮部偏暖。
- **中间一个主体**：一件代表这本书内容的东西，例如算盘和积木、翻开的书和毛笔、地球仪，占画面中间约六成；四周是柔和、简单的底色和很少的小道具，不画成一整个场景。
- **底色按科目**：数学偏苔绿和蜂蜜黄，语文偏杏色和陶土橙，英语偏天青和灰蓝，其他科目偏米色和麦色，和默认封面的科目色一致，书架上一眼分得出科目。
- **按年龄段调整**：和背景一样，低年级更像玩具、更暖更亮，高年级更精致、配色更沉稳。
- **给书卡留位置**：左上角干净，书卡在那里放「学完」的勾；外圈约 8% 不放重要的东西，书卡的圆角会裁掉一点。
- **不画**：人物和动物、文字、字母、数字、符号、书名、界面、边框、水印。书名由页面写在封面下面。

### 出图和交付

- 维护者在 Codex 里用 ImageGen 出竖幅图，用能给的最高分辨率。
- 入库时保留中间裁成 3:4，缩到 768×1024，转成 WebP，每张不超过 80 KB；文件名是封面 id，放进 `apps/web/src/shared/media/covers/`，在清单 `covers.ts` 里记科目、年龄段、主体和提示词，加一个 story，在固定镜像里生成视觉基准。
- 封面 id 按画的主体起名（例如 `abacus-sprout`），不按书起名，因为几本书可以用同一张封面。书在书单里用 `cover` 引用它。
- 不预先批量生成。`/change` 导入一本新书时问维护者：新建一张、挑一张已有的，或者照下面的写法在 Codex 里生成。

出图后维护者看：

- [ ] 缩到书卡大小（约 180px 宽）时主体还认得出。
- [ ] 画面里没有人物、动物、文字、乱码字母、数字和符号。
- [ ] 左上角干净，放得下「学完」的勾。
- [ ] 和书架上其他封面放在一起风格一致，科目的颜色分得出。

| id              | 科目 | 年龄段 | 主体                       | 用于的书          |
| --------------- | ---- | ------ | -------------------------- | ----------------- |
| `abacus-sprout` | 数学 | 低年级 | 小算盘、几块积木和一盆小芽 | `g1-math-xueersi` |

### `abacus-sprout` 算盘和小芽

- 科目：数学。年龄段：低年级。
- 用于「一年级 / 数学 / 学而思」。

```text
Portrait 3:4 book cover illustration for a Chinese children's learning app, made like a still from a carefully lit 3D family animated feature: tactile sculpted clay, painted wood, felt and paper materials, soft rounded shapes, gentle depth of field, one warm key light from the upper right with soft cool shadows. One centered hero object: a small wooden abacus with chunky round clay beads in honey yellow, leaf green and coral, standing slightly angled, with three plain toy building blocks at its foot and a tiny potted sprout beside it. Behind it, a calm, simple backdrop of soft sage green with a faint paper texture and a gentle glow, no scenery. The group fills about the middle 60 percent of the frame; keep the upper left corner plain and empty, and keep anything important out of the outer 8 percent so rounded card corners never cut it. Palette of sage, honey yellow, warm wood and coral with soft teal shadows. Big simple toy-like shapes, bright, cheerful and cozy for ages 6 to 8. No characters or animals, no text, letters, numbers or symbols on the blocks or anywhere, no title, no UI, no frames, borders or split panels, no watermark.
```

## 以后加图

新题在库里挑不到合适的背景时，按同一套风格生成一张通用的背景加进库里：提示词的开头一段（从「Wide 16:9 full-bleed background plate」到「gentle depth of field.」）和结尾的空地、不画清单照抄上面的，中间写场景、光线、四周的细节、配色和年龄段那一句；在这份文件的背景表里加一行和一节，再按「出图和交付」入库。加角色也一样，照抄角色提示词的姿势、质感和透明底要求。

加封面时，照抄封面提示词的开头一段（从「Portrait 3:4 book cover illustration」到「soft cool shadows.」）和结尾的留位置、不画清单，中间写主体、底色、配色和年龄段那一句；在「书的封面」的表里加一行和一节，再按那里的「出图和交付」入库。
