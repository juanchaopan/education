// The painted backdrops of the lesson library, by id, each with one short
// sentence of what its scenery shows around the lesson's props. A lesson's
// content names the backdrop it plays on, so a question about the scenery,
// such as the butterflies in the garden, is answered from this sentence and
// nothing is made up. The pictures themselves, and how a lesson picks one,
// are the site's media library (apps/web/src/features/learning/media/).
export const backdropScenery = {
  'garden-morning':
    '清晨的菜园：左边有一间蓝绿色的小木屋，右上是结着苹果的果树，远处有玻璃温室、菜地和小山，天上飞着几只蝴蝶。',
  'art-studio-evening':
    '傍晚的画室：两边放着颜料杯、彩纸、木头星星和一盏紫色的灯，后面是淡紫色的墙。',
  'railway-workshop-dusk':
    '傍晚的火车模型工作间：墙是蓝绿色的，高处挂着一个大圆钟，两边有齿轮、铜轨道和小模型。',
  'forest-picnic-morning':
    '清晨的林间草地：前面有大蕨叶、小蘑菇和三叶草，后面是白桦树和松树，远处树上挂着一个小鸟屋。',
  'pastry-shop-afternoon':
    '午后的街角点心铺：左边叠着冒热气的竹蒸笼，右边有装糖果的玻璃罐，上面挂着圆圆的纸灯笼。',
  'toy-classroom-day':
    '白天的玩具教室：两边的矮木架上有积木、玩具小火车和毛绒球，后面是一扇大窗户和剪纸云朵。',
  'seaside-beach-noon':
    '正午的海边沙滩：角落里有海草、贝壳和一只玩具小桶，远处是浅蓝色的海浪和一座红白相间的灯塔。',
  'town-market-afternoon':
    '午后的小镇集市：两边有条纹布棚、装水果蔬菜的竹筐、红灯笼和一辆自行车，远处是白墙、灰瓦和小石桥。',
  'woodshop-morning':
    '早上的木工坊：两边挂着工具，有木夹子、刨花和一摞木板，后面是窗户和放着木头玩具的架子。',
  'library-corner-rainy':
    '下雨天的图书馆一角：两边是高高的书架，有一盏台灯、一个地球仪和一盆蕨，窗外在下雨。',
  'greenhouse-noon':
    '正午的植物温室：两边有吊着的蕨、育苗盘、陶土花盆、喷壶和番茄藤，后面是玻璃窗和高高的绿植。',
  'observatory-night':
    '深夜山顶的天文台：圆顶开着，能看到星星；两边有一架大铜望远镜、台灯、星图和天球仪，下面是雪山。',
  'science-lab-evening':
    '傍晚的科学实验室：两边有装彩色液体的烧瓶、显微镜、试管架和一架小铜天平，远处窗外是晚霞。',
  'city-model-studio-morning':
    '清晨的城市模型工作室：两边有白纸做的楼房模型、海绵小树和图纸，后面的大窗外是城市和河。',
  'river-bridge-dusk':
    '黄昏的河边：中间是平静的河水，角落里有芦苇和石阶，远处是一座长桥、亮着灯的小镇和山。',
} as const;

export type BackdropId = keyof typeof backdropScenery;
