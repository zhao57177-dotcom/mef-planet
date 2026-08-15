/* ============================================================
   Mef训计星球 — 增肌自律计划 App
   数据驱动 · 本地持久化 · 提醒系统
   ============================================================ */
'use strict';

/* ---------- 个人档案 & 营养测算 ---------- */
const PROFILE = {
  age: 36, sex: '男', height: 177, weight: 53.1, // InBody实测约106斤，偏瘦
  goal: '增肌(瘦体型增重)',
  bodyFat: 12.2,        // InBody实测体脂率
  muscle: 25.6,         // InBody实测骨骼肌 kg
  bodyFatHint: '体脂12.2%偏低，优先增肌增重；翼状肩胛需矫正体态'
};
// Mifflin-St Jeor: BMR = 10*W + 6.25*H - 5*A + 5(男)
const BMR = Math.round(10 * PROFILE.weight + 6.25 * PROFILE.height - 5 * PROFILE.age + 5); // ≈1462
const TDEE = Math.round(BMR * 1.55); // 中等活动(每周练4天) ≈2266
// InBody建议热量≈2567 kcal；取接近值作为初始目标，后续按体重动态建议
const TARGET = {
  kcal: 2560,            // 接近InBody建议摄入2567，维持+~300盈余（体脂已低，可适度盈余）
  protein: 140,          // ~2.6 g/kg，偏瘦体型增肌高蛋白
  fat: 70,               // ~1.3 g/kg
  carbs: 320,            // 剩余热量给碳水
  water: 3.0             // 升/天
};

/* ---------- 饮食计划（每日模板，可自由替换） ---------- */
const MEALS = [
  { id:'breakfast', time:'07:30', name:'早餐 · 唤醒代谢', kcal:560,
    items:'燕麦 60g(干) + 全脂牛奶 250ml + 鸡蛋2个(全蛋) + 香蕉1根 + 核桃6颗',
    macro:'蛋白≈26g · 碳水≈65g · 脂肪≈20g' },
  { id:'snack_am', time:'10:30', name:'上午加餐', kcal:270,
    items:'无糖希腊酸奶 150g + 乳清蛋白半勺(15g)',
    macro:'蛋白≈20g · 碳水≈12g · 脂肪≈4g' },
  { id:'lunch', time:'12:30', name:'午餐 · 主餐', kcal:600,
    items:'米饭 160g(熟) + 鸡胸肉 150g + 西兰花/青菜 + 橄榄油 8g + 味噌汤',
    macro:'蛋白≈38g · 碳水≈65g · 脂肪≈16g' },
  { id:'pre', time:'16:00', name:'训练前加餐', kcal:260,
    items:'香蕉1根 + 全麦面包1片 + 花生酱 10g（训练前30分钟）',
    macro:'蛋白≈6g · 碳水≈45g · 脂肪≈6g' },
  { id:'dinner', time:'19:00', name:'晚餐 · 练后修复', kcal:650,
    items:'牛肉/三文鱼 150g + 米饭 160g + 时蔬 + 橄榄油 8g（训练后1小时内吃完）',
    macro:'蛋白≈38g · 碳水≈65g · 脂肪≈20g' },
  { id:'bed', time:'22:00', name:'睡前加餐', kcal:250,
    items:' cottage cheese 150g 或 酪蛋白粉半勺 + 杏仁8颗（缓释蛋白，防夜间分解）',
    macro:'蛋白≈22g · 碳水≈10g · 脂肪≈12g' }
];

/* 每餐"看着吃"的直观份量（不用秤也能估） */
const MEAL_LOOK = {
  breakfast:'🤲 燕麦≈马克杯1/3杯(干) · 牛奶1杯 · 鸡蛋2个 · 香蕉1根(中等) · 核桃6颗',
  snack_am:'🤲 酸奶≈小半碗(拳头大) · 蛋白粉半勺(约15g粉)',
  lunch:'🤲 米饭≈1.3小碗(熟) · 鸡胸≈掌心大1.5块 · 青菜1大捧 · 油约1.5茶匙',
  pre:'🤲 香蕉1根 · 全麦面包1片 · 花生酱薄薄1汤匙',
  dinner:'🤲 肉≈掌心大1.5块 · 米饭1.3小碗 · 蔬菜1大捧 · 油1.5茶匙',
  bed:'🤲 cottage cheese≈小半碗 · 或酪蛋白半勺 · 杏仁8颗'
};
/* 每日宏量"看着吃"对照 */
const MACRO_LOOK = '🤲 看着吃：蛋白≈掌心瘦肉4-5块/天 · 碳水≈熟米饭3.5小碗/天 · 脂肪≈烹饪油2勺+坚果1小把/天';

/* ---------- 补剂（非医疗建议，按需选择） ---------- */
const SUPPS = [
  { name:'乳清蛋白粉', dose:'训练后/加餐 1勺(30g)', note:'补足日常蛋白缺口' },
  { name:'肌酸一水合物', dose:'每日 5g（任意时间）', note:'提升力量与肌细胞储水，安全有效' },
  { name:'维生素D3', dose:'每日 2000IU', note:'室内办公易缺乏，助睾酮与免疫' },
  { name:'鱼油 Omega-3', dose:'每日 1-2g', note:'抗炎、助恢复' },
  { name:'镁(甘氨酸镁)', dose:'睡前 200-400mg', note:'改善睡眠质量' }
];

/* 每周采购清单（由六餐模板换算的周用量，分量含直观量） */
const SHOPPING = [
  { cat:'🥩 蛋白质', items:[
    {n:'鸡胸肉', q:'≈1.05kg（午餐每日150g）'},
    {n:'牛肉/三文鱼', q:'≈1.05kg（晚餐每日150g）'},
    {n:'鸡蛋', q:'≈14个（早餐2个/日）'},
    {n:'全脂牛奶', q:'≈1.75L（早餐250ml）'},
    {n:'无糖希腊酸奶', q:'≈1.05kg（上午加餐150g）'},
    {n:'cottage cheese 或 酪蛋白粉', q:'≈1.05kg/1罐（睡前150g/半勺）'},
    {n:'乳清蛋白粉', q:'1罐（加餐半勺）'}
  ]},
  { cat:'🍚 主食碳水', items:[
    {n:'燕麦(干)', q:'≈420g（早餐60g）'},
    {n:'大米(生)', q:'≈800g（午晚各160g熟）'},
    {n:'香蕉', q:'≈14根（早+训前）'},
    {n:'全麦面包', q:'≈7片（训前）'}
  ]},
  { cat:'🥦 蔬菜', items:[
    {n:'西兰花/青菜', q:'≈2.1kg（午晚各1大捧）'},
    {n:'味噌(汤料)', q:'1包'}
  ]},
  { cat:'🥑 脂肪坚果', items:[
    {n:'橄榄油', q:'≈110g（烹饪约16g/日）'},
    {n:'花生酱', q:'≈70g（训前10g）'},
    {n:'核桃', q:'≈42颗（早餐6颗）'},
    {n:'杏仁', q:'≈56颗（睡前8颗）'}
  ]},
  { cat:'💊 补剂', items:[
    {n:'肌酸一水合物', q:'每日 5g'},
    {n:'维生素D3', q:'每日 2000IU'},
    {n:'鱼油 Omega-3', q:'每日 1-2g'},
    {n:'镁(甘氨酸镁)', q:'睡前 200-400mg'}
  ]}
];

/* ---------- 训练计划：Upper/Lower 4天分化 ---------- */
// 器械为主：杠铃、哑铃、龙门架/绳索、固定器械、腿举机、提踵机
const WEEK = {
  // getDay(): 0=日 1=一 2=二 3=三 4=四 5=五 6=六
  1:{ key:1, name:'周一', type:'train', tag:'上肢A', title:'上肢A · 推为主 + 体态激活',
      focus:'胸 / 肩前束 / 肱三 / 背阔（兼顾翼状肩胛矫正）', dur:'65-80分钟',
      exercises:[
        {n:'胸小肌 doorway 拉伸', e:'门框', s:'2', r:'45s/侧', rest:'—', note:'改善翼状肩胛：小臂贴门框，身体前倾，感受胸肩前侧拉伸'},
        {n:'前锯肌 Wall Slide', e:'墙面', s:'2', r:'12', rest:'45s', note:'改善翼状肩胛：臀/背/手贴墙，手臂上下滑动，肩胛始终贴墙'},
        {n:'俯身 Y 字举', e:'轻哑铃/徒手', s:'3', r:'12', rest:'45s', note:'强化下斜方肌：胸贴斜板或俯身，拇指朝上举成Y'},
        {n:'杠铃卧推', e:'杠铃卧推架', s:'4', r:'8-10', rest:'90s', note:'大重量复合动作，核心收紧，杠落胸中部'},
        {n:'上斜哑铃推举', e:'可调斜板+哑铃', s:'3', r:'10-12', rest:'75s', note:'上胸发展，肘部45°避免肩峰挤压'},
        {n:'坐姿绳索划船', e:'龙门架/划船机', s:'3', r:'10-12', rest:'75s', note:'夹紧肩胛，背阔主导'},
        {n:'哑铃肩上推举', e:'哑铃', s:'3', r:'10-12', rest:'75s', note:'坐姿稳定，避免腰椎代偿'},
        {n:'高位下拉', e:'背阔下拉机', s:'3', r:'10-12', rest:'75s', note:'想象用肘部把身体拉起'},
        {n:'绳索三头下压', e:'龙门架绳索', s:'3', r:'12-15', rest:'60s', note:'小臂固定，纯肘伸'}
      ]},
  2:{ key:2, name:'周二', type:'train', tag:'下肢A', title:'下肢A · 股四头为主',
      focus:'股四 / 臀 / 腘绳 / 小腿', dur:'60-75分钟',
      exercises:[
        {n:'杠铃深蹲', e:'深蹲架', s:'4', r:'8-10', rest:'120s', note:'全脚掌发力，蹲到大腿略低于水平'},
        {n:'腿举', e:'腿举机', s:'3', r:'12-15', rest:'90s', note:'幅度到位，膝盖对准脚尖'},
        {n:'罗马尼亚硬拉', e:'杠铃/哑铃', s:'3', r:'10', rest:'90s', note:'髋部后推，背挺直，腘绳拉伸感'},
        {n:'腿屈伸', e:'腿伸展机', s:'3', r:'12-15', rest:'60s', note:'顶峰收缩1秒'},
        {n:'站姿提踵', e:'提踵机/自由', s:'4', r:'15-20', rest:'45s', note:'全程，顶端停顿'},
        {n:'悬垂举腿', e:'单杠/吊环', s:'3', r:'12-15', rest:'60s', note:'下腹，避免摆腿'}
      ]},
  3:{ key:3, name:'周三', type:'rest', tag:'主动恢复', title:'休息日 · 体态矫正 + 主动恢复',
      focus:'翼状肩胛评估 / 胸椎灵活 / 拉伸泡沫轴', dur:'25-40分钟',
      exercises:[
        {n:'体态自检：翼状肩胛', e:'镜子/徒手', s:'1', r:'2min', rest:'—', note:'自然站立，观察肩胛骨内侧缘是否翘起；拍照对比，每周三记录'},
        {n:'胸小肌 doorway 拉伸', e:'门框', s:'2', r:'45s/侧', rest:'—', note:'松解紧张胸小肌，让肩胛骨能贴回胸廓'},
        {n:'前锯肌 Wall Slide', e:'墙面', s:'2', r:'15', rest:'45s', note:'激活前锯肌，改善肩胛骨外翻'},
        {n:'俯身 Y-T-W-L', e:'轻哑铃/徒手', s:'2', r:'各8次', rest:'60s', note:'全面强化下斜方、菱形肌、肩外旋肌群'},
        {n:'胸椎旋转伸展', e:'瑜伽垫', s:'2', r:'10/侧', rest:'—', note:'打开胸椎活动度，减少代偿'},
        {n:'全身拉伸+泡沫轴', e:'瑜伽垫', s:'1', r:'10-15min', rest:'—', note:'重点髋屈肌、胸、背'}
      ]},
  4:{ key:4, name:'周四', type:'train', tag:'上肢B', title:'上肢B · 拉为主 + 体态强化',
      focus:'背 / 肱二 / 后束 / 胸(次) + 翼状肩胛强化', dur:'65-80分钟',
      exercises:[
        {n:'胸椎旋转伸展', e:'瑜伽垫', s:'2', r:'10/侧', rest:'—', note:'改善翼状肩胛：侧卧屈膝，双手前伸，上方手臂打开向后转，眼随手动'},
        {n:'前锯肌 Scapular Push-up', e:'瑜伽垫', s:'2', r:'12', rest:'45s', note:'改善翼状肩胛：平板支撑位，只动肩胛骨做前伸与后缩'},
        {n:'俯身 T-W 举', e:'轻哑铃/徒手', s:'3', r:'12', rest:'45s', note:'强化菱形肌+下斜方：俯身，双臂外展成T再屈肘成W'},
        {n:'引体向上(或负重)', e:'单杠', s:'4', r:'6-10', rest:'90s', note:'无力可弹力带辅助，重在下放控制'},
        {n:'杠铃俯身划船', e:'杠铃', s:'3', r:'8-10', rest:'90s', note:'背阔主导，脊柱中立'},
        {n:'哑铃卧推', e:'平板+哑铃', s:'3', r:'10-12', rest:'75s', note:'比杠铃更易找胸肌感受'},
        {n:'面拉', e:'龙门架绳索', s:'3', r:'15', rest:'60s', note:'后束+肩外旋，护肩'},
        {n:'坐姿肩推(器械)', e:'肩推机', s:'3', r:'10-12', rest:'75s', note:'稳定可上更大重量'},
        {n:'锤式弯举', e:'哑铃', s:'3', r:'12', rest:'60s', note:'练肱肌，让手臂更粗'}
      ]},
  5:{ key:5, name:'周五', type:'train', tag:'下肢B', title:'下肢B · 腘绳/臀为主',
      focus:'臀 / 腘绳 / 股四(次) / 小腿', dur:'60-75分钟',
      exercises:[
        {n:'罗马尼亚硬拉(重)', e:'杠铃', s:'4', r:'6-8', rest:'120s', note:'腘绳与臀的黄金动作'},
        {n:'保加利亚分腿蹲', e:'哑铃+凳', s:'3', r:'10/腿', rest:'75s', note:'前脚脚跟发力，臀感强'},
        {n:'臀冲', e:'杠铃+凳', s:'3', r:'12', rest:'75s', note:'顶端夹紧臀，别仰头'},
        {n:'俯卧腿弯举', e:'腿弯举机', s:'3', r:'12-15', rest:'60s', note:'离心慢放'},
        {n:'坐姿提踵', e:'提踵机', s:'4', r:'15-20', rest:'45s', note:'比站立更孤立小腿'},
        {n:'平板支撑', e:'徒手', s:'3', r:'45s', rest:'45s', note:'核心稳定，臀腹收紧'}
      ]},
  6:{ key:6, name:'周六', type:'rest', tag:'可选有氧', title:'休息/可选低强度',
      focus:'徒步 / 骑行 / 完全休息', dur:'自由',
      exercises:[
        {n:'低强度有氧(可选)', e:'跑步机/户外', s:'1', r:'20-30min', rest:'—', note:'心率<130，不消耗增肌盈余'},
        {n:'完全休息', e:'—', s:'1', r:'—', rest:'—', note:'若本周很累就彻底休息'}
      ]},
  0:{ key:0, name:'周日', type:'rest', tag:'完全休息', title:'完全休息日',
      focus:'恢复 / 备餐 / 睡眠', dur:'—',
      exercises:[
        {n:'备餐(批量做饭)', e:'厨房', s:'1', r:'—', rest:'—', note:'把下周鸡胸/米饭分装，降低执行阻力'},
        {n:'早睡', e:'—', s:'1', r:'23:00前', rest:'—', note:'周日早睡，开启新一周'}
      ]}
};

/* ---------- 睡眠计划 ---------- */
const SLEEP = {
  target:'23:00 准备 → 23:30 入睡 → 07:00 起床（7.5h）',
  points:[
    '36岁恢复能力下降，睡眠是增肌的"隐形训练"，目标 7.5-8 小时。',
    '23:00 关大灯，调暗手机/用夜览，给褪黑素分泌信号。',
    '睡前1小时不刷短视频（蓝光+多巴胺最伤睡眠）。',
    '卧室温度 18-20℃，可戴眼罩耳塞。',
    '固定起床时间比固定入睡更重要，周末也别赖床超1小时。',
    '若入睡困难，睡前 200-400mg 镁 + 一本纸质书。'
  ],
  windDown:[
    {t:'22:30', c:'洗漱，调暗灯光', d:'准备酪蛋白加餐一起吃完'},
    {t:'22:50', c:'躺下，手机放远', d:'只听白噪音/轻音乐或冥想'},
    {t:'23:00', c:'熄灯', d:'闭眼，4-7-8呼吸法助眠'},
    {t:'23:30', c:'进入深睡', d:'理想入睡点'}
  ]
};

/* ---------- 休息/恢复计划 ---------- */
const REST = {
  points:[
    '训练日之间必有睡眠与营养支撑，不熬大夜。',
    '每 4-6 周安排 1 次"减载周"：重量降到 50-60%，组数减半，让关节与神经恢复。',
    '判断该休息：持续酸痛>72h、睡眠差、训练重量连续下滑 → 多休1天。',
    '主动恢复（散步/拉伸）比完全躺平更利血液循环。',
    '进步节奏：新手前8周以"动作标准+规律"为主，别急着冲大重量。'
  ],
  phases:[
    {p:'第1-4周 · 地基期', d:'重量选"最后1组还能多做2-3次"的程度，重点学动作模式与打卡习惯。'},
    {p:'第5-8周 · 加量期', d:'在动作标准前提下，每2周主项重量+2.5-5kg，其余+小重量。'},
    {p:'第9-12周 · 突破期', d:'引入进阶组数(如递增组/暂停组)，蛋白与热量保持盈余。'},
    {p:'第13周 · 减载周', d:'量减半、强度降，体检式复盘围度与体重。'}
  ]
};

/* ---------- 每日时间轴（工作日模板） ---------- */
const TIMELINE = [
  {t:'07:00', c:'起床 · 喝500ml温水 · 晒晨光', d:'启动代谢，补水，调生物钟', type:'water'},
  {t:'07:30', c:'早餐', d:'见"饮食"页模板', type:'meal'},
  {t:'08:00', c:'出发/工作', d:'工位备好水壶(3L目标)', type:'water'},
  {t:'10:30', c:'上午加餐', d:'酸奶+蛋白粉', type:'meal'},
  {t:'12:30', c:'午餐', d:'主餐，七分饱偏撑', type:'meal'},
  {t:'15:30', c:'补水小歇', d:'再喝500ml', type:'water'},
  {t:'16:00', c:'训练前加餐', d:'香蕉+花生酱，补充糖原', type:'meal'},
  {t:'16:30', c:'训练（训练日）', d:'见"训练"页当日动作', type:'train'},
  {t:'18:00', c:'拉伸+蛋白质补充', d:'练后30分钟内补蛋白', type:'supp'},
  {t:'19:00', c:'晚餐', d:'练后正餐，修复肌肉', type:'meal'},
  {t:'22:00', c:'睡前酪蛋白', d:'缓释蛋白防分解', type:'meal'},
  {t:'23:00', c:'准备睡觉', d:'调暗灯光，远离屏幕', type:'sleep'},
  {t:'23:30', c:'入睡', d:'目标7.5h深睡', type:'sleep'}
];

/* ---------- 默认提醒（可被用户开关/编辑） ---------- */
let REMINDERS = [
  {time:'07:00', label:'起床喝水', type:'water'},
  {time:'07:30', label:'早餐时间', type:'meal'},
  {time:'10:30', label:'上午加餐', type:'meal'},
  {time:'12:30', label:'午餐时间', type:'meal'},
  {time:'16:00', label:'训练前加餐', type:'meal'},
  {time:'16:30', label:'该去训练啦💪', type:'train'},
  {time:'19:00', label:'练后晚餐', type:'meal'},
  {time:'22:00', label:'睡前酪蛋白', type:'meal'},
  {time:'23:00', label:'准备睡觉', type:'sleep'}
];

/* ============================================================
   状态持久化
   ============================================================ */
const STORE_KEY = 'mef_planet_v1';
const todayKey = () => new Date().toISOString().slice(0,10);
function loadState(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }catch(e){ return {}; }
}
function saveState(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
let state = loadState();
state.checklists = state.checklists || {};   // {date:{itemId:true}}
state.weightLog  = state.weightLog || [];     // [{date,weight}]
state.remindersOn = state.remindersOn || false;
state.remEdits = state.remEdits || {};        // {index:{time,label,on}}
state.trainEdits = state.trainEdits || {};    // {weekKey:[exercises]}
state.waterToday = state.waterToday || {};    // {date:count}
state.trainLog   = state.trainLog || {};      // {date:{dayKey, items:[{name,weight,sets,reps}]}}
state.measure    = state.measure || {};       // {date:{arm,chest,waist,thigh,bf}}
state.shopCheck  = state.shopCheck || {};     // {key:true}
state.videoLinks = state.videoLinks || {};    // {动作名: 固定示范视频URL}
state.profile    = state.profile || { age:36, sex:'男', height:177, weight:53.1, activity:'moderate', goal:'增肌' };
state.target     = state.target || null;       // 用户应用后的目标；null=按档案实时自动测算

/* ============================================================
   工具函数
   ============================================================ */
function $(sel,root){ return (root||document).querySelector(sel); }
function el(tag,cls,html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
function pad(n){ return n<10?'0'+n:''+n; }
function nowHM(){ const d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); }
function toast(msg){
  const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.add('hidden'),2600);
}
function getDayPlan(d){ const g=(d||new Date()).getDay(); return WEEK[g]; }

/* 档案驱动的动态测算（建议式自适应） */
function getProfile(){ return state.profile; }
function calcBMR(p){ return Math.round(10*p.weight + 6.25*p.height - 5*p.age + 5); } // 男
function actFactor(a){ return ({sedentary:1.2, light:1.375, moderate:1.55, active:1.725})[a] || 1.55; }
function calcTDEE(p){ return Math.round(calcBMR(p)*actFactor(p.activity)); }
function calcTarget(p){
  const tdee=calcTDEE(p);
  const adj = p.goal==='减脂' ? -400 : p.goal==='维持' ? 0 : 400; // 增肌默认 +400 盈余
  const kcal = Math.round(tdee + adj);
  let protein = Math.round(p.weight*2.4);   // ~2.4 g/kg
  let fat = Math.round(p.weight*1.0);       // ~1.0 g/kg
  let carbs = Math.round((kcal - protein*4 - fat*9)/4);
  if(carbs<50) carbs=50;
  let water = Math.round(Math.max(2.5, Math.min(4, p.weight*0.05))*10)/10;
  return {kcal, protein, fat, carbs, water};
}
function currentTarget(){ return state.target || calcTarget(getProfile()); }
function latestWeight(){ if(state.weightLog.length){ const s=state.weightLog.slice().sort((a,b)=>a.date<b.date?-1:1); return s[s.length-1].weight; } return getProfile().weight; }
function computeSuggestion(){ const w=latestWeight(); return calcTarget(Object.assign({}, getProfile(), {weight:w})); }
function targetDiffers(a,b){ return Math.abs(a.kcal-b.kcal)>5 || Math.abs(a.protein-b.protein)>2 || Math.abs(a.carbs-b.carbs)>3 || Math.abs(a.fat-b.fat)>2; }

/* 今日打卡项：训练日含训练，非训练日不含（可传 date 计算历史某天） */
function todayItems(date){
  const plan = getDayPlan(date);
  const items = [
    {id:'wake',   time:'07:00', cat:'water', title:'起床 · 喝500ml温水', sub:'启动代谢 + 晨光'},
    {id:'breakfast', time:'07:30', cat:'meal', title:'早餐', sub:'燕麦/蛋/奶/香蕉'},
    {id:'snack_am', time:'10:30', cat:'meal', title:'上午加餐', sub:'酸奶+蛋白粉'},
    {id:'lunch', time:'12:30', cat:'meal', title:'午餐 · 主餐', sub:'鸡胸+米饭+蔬菜'},
    {id:'pre', time:'16:00', cat:'meal', title:'训练前加餐', sub:'香蕉+花生酱'},
  ];
  if(plan.type==='train'){
    items.push({id:'train', time:'16:30', cat:'train', title:'完成今日训练：'+plan.title, sub:plan.focus+' · '+plan.dur});
    items.push({id:'posture', time:'训练前后', cat:'train', title:'体态激活/拉伸：胸小肌+前锯肌+Y字举', sub:'改善翼状肩胛，别跳过'});
  } else {
    items.push({id:'posture', time:'任意', cat:'train', title:'休息日体态自检：翼状肩胛+胸椎灵活', sub:'照镜子/拍照，记录变化'});
  }
  items.push(
    {id:'dinner', time:'19:00', cat:'meal', title:'练后晚餐', sub:'牛肉/鱼+米饭'},
    {id:'water', time:'全天', cat:'water', title:'喝够 '+currentTarget().water+'L 水', sub:'约 8 杯，均匀喝'},
    {id:'bed', time:'22:00', cat:'meal', title:'睡前酪蛋白', sub:'缓释蛋白防分解'},
    {id:'sleep', time:'23:00', cat:'sleep', title:'准备睡觉', sub:'调暗灯光·远离屏幕'},
    {id:'asleep', time:'23:30', cat:'sleep', title:'入睡', sub:'目标 7.5h 深睡'}
  );
  return items;
}

/* 完成度 & 连续天数 */
function dayDoneRatio(dateKey){
  const list = state.checklists[dateKey];
  if(!list) return 0;
  // 以"训练日是否训练 + 餐食/水/睡眠"综合判断；简化为清单比例
  const items = todayItems();
  let done=0; for(const it of items){ if(list[it.id]) done++; }
  return done/items.length;
}
function computeStreak(){
  let streak=0; const d=new Date();
  // 从昨天往前数连续完成的日子
  for(let i=1;i<400;i++){
    const dt=new Date(d); dt.setDate(d.getDate()-i);
    const k=dt.toISOString().slice(0,10);
    const list=state.checklists[k];
    if(!list){ break; }
    const items=todayItems(dt); // 用当天计划
    const total=items.length; let done=0; for(const it of items){ if(list[it.id]) done++; }
    if(total>0 && done/total>=0.8) streak++; else break;
  }
  // 今天若已完成也计入
  const tk=todayKey(); const tl=state.checklists[tk];
  if(tl){ const items=todayItems(); let done=0; for(const it of items){ if(tl[it.id]) done++; }
    if(items.length && done/items.length>=0.8) streak++; }
  return streak;
}

/* ============================================================
   渲染：底部导航 & 视图路由
   ============================================================ */
let view='today';
const TABS=[
  {id:'today', ic:'🏠', label:'今日'},
  {id:'train', ic:'🏋️', label:'训练'},
  {id:'diet', ic:'🍱', label:'饮食'},
  {id:'routine', ic:'🌙', label:'作息'},
  {id:'videos', ic:'🎬', label:'示范'},
  {id:'discipline', ic:'🔥', label:'自律'}
];
function renderTabbar(){
  const nav=$('#tabbar'); nav.innerHTML='';
  TABS.forEach(t=>{
    const b=el('button','tab'+(view===t.id?' active':''),'<span class="ic">'+t.ic+'</span><span>'+t.label+'</span>');
    b.onclick=()=>{ view=t.id; render(); };
    nav.appendChild(b);
  });
}
function render(){
  renderTabbar();
  const v=$('#view'); v.innerHTML='';
  if(view==='today') renderToday(v);
  else if(view==='train') renderTrain(v);
  else if(view==='diet') renderDiet(v);
  else if(view==='routine') renderRoutine(v);
  else if(view==='videos') renderVideos(v);
  else if(view==='discipline') renderDiscipline(v);
  window.scrollTo(0,0);
}

/* ---------- 今日视图 ---------- */
function renderToday(v){
  const plan=getDayPlan();
  const items=todayItems();
  const tk=todayKey(); const list=state.checklists[tk]||{};
  let done=0; items.forEach(it=>{ if(list[it.id]) done++; });
  const ratio=items.length? done/items.length : 0;
  const R=104, C=2*Math.PI*46, off=C*(1-ratio);

  const card=el('div','card');
  card.innerHTML=
    '<div class="ring-wrap">'+
      '<div class="ring">'+
        '<svg width="104" height="104"><circle cx="52" cy="52" r="46" stroke="rgba(167,139,250,.18)" stroke-width="10" fill="none"/>'+
        '<circle cx="52" cy="52" r="46" stroke="url(#rg)" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"/>'+
        '<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#f0abfc"/></linearGradient></defs>'+
        '</svg>'+
        '<div class="pct"><b>'+Math.round(ratio*100)+'%</b><span>今日完成</span></div>'+
      '</div>'+
      '<div class="streak-badge"><div class="num">'+computeStreak()+'</div><div class="lbl">🔥 连续自律天数</div>'+
      '<div class="tiny">'+(plan.type==='train'?('今日训练：'+plan.tag):'今日：'+plan.tag)+'</div></div>'+
    '</div>';
  v.appendChild(card);

  // 训练日提示卡
  if(plan.type==='train'){
    const tc=el('div','card');
    tc.innerHTML='<h2>🎯 今日训练 · '+plan.title+'</h2>'+
      '<div class="muted">重点：'+plan.focus+'　|　时长：'+plan.dur+'</div>'+
      '<div class="muted" style="margin-top:6px">共 '+plan.exercises.length+' 个动作，点击底部「训练」查看完整动作与组次。</div>';
    const btn=el('button','btn','查看今日训练动作 →');
    btn.onclick=()=>{ view='train'; render(); };
    tc.appendChild(btn);
    v.appendChild(tc);
  } else {
    const rc=el('div','card');
    rc.innerHTML='<h2>🌿 今日休息 · '+plan.title+'</h2><div class="muted">'+REST.points[0]+'</div>';
    v.appendChild(rc);
  }

  // 翼状肩胛体态提示卡（始终显示）
  const pc=el('div','card');
  pc.innerHTML='<h2>🦴 体态矫正 · 翼状肩胛</h2>'+
    '<div class="muted">你报告中的目标包含「调整翼状肩胛」。核心思路：松解胸小肌 → 激活前锯肌 → 强化下斜方/菱形肌 → 打开胸椎灵活。</div>'+
    '<div class="tiny" style="margin-top:8px">今日重点：'+(plan.type==='train'?'训练前后做 Wall Slide + 胸小肌拉伸 + Y字举':'休息日做体态自检 + Y-T-W-L + 胸椎旋转')+'</div>';
  v.appendChild(pc);

  // 打卡清单
  const lc=el('div','card'); lc.innerHTML='<h2>✅ 今日自律清单</h2>';
  const ul=el('div','check-list');
  items.forEach(it=>{
    const on=!!list[it.id];
    const row=el('div','check'+(on?' done':''));
    const tagMap={meal:'餐',train:'练',sleep:'眠',water:'水',supp:'补'};
    row.innerHTML=
      '<div class="box">'+(on?'✓':'')+'</div>'+
      '<div class="ct"><div class="ct-time">'+it.time+'</div>'+
      '<div class="ct-title">'+it.title+'</div>'+
      '<div class="ct-sub">'+it.sub+'</div></div>'+
      '<span class="tag '+it.cat+'">'+tagMap[it.cat]+'</span>';
    row.onclick=()=>toggleCheck(it.id);
    ul.appendChild(row);
  });
  lc.appendChild(ul);
  v.appendChild(lc);

  // 一句话激励
  const qc=el('div','q-card','“'+pickQuote()+'”');
  v.appendChild(qc);
}
const QUOTES=[
  '肌肉是在休息和吃饭时长出来的，训练只是按下开关。',
  '36岁不是借口，是更懂坚持的理由。',
  '今天的每一口蛋白，都是明天的厚度。',
  '别和别人比重量，和昨天的自己比坚持。',
  '瘦不是宿命，是还没认真吃练。',
  '自律给你自由——和看得见的手臂。'
];
function pickQuote(){ return QUOTES[Math.floor(Math.random()*QUOTES.length)]; }

function toggleCheck(id){
  const tk=todayKey(); state.checklists[tk]=state.checklists[tk]||{};
  state.checklists[tk][id]=!state.checklists[tk][id];
  saveState(); render();
  const it=todayItems().find(x=>x.id===id);
  if(state.checklists[tk][id]) toast('已打卡：'+(it?it.title:''));
}

/* ---------- 训练视图 ---------- */
function renderTrain(v){
  if(trainSel===null) trainSel=getDayPlan().key;
  const plan=getDayPlan();
  // 周历
  const wc=el('div','card'); wc.innerHTML='<h2>📅 本周训练日历</h2>';
  const week=el('div','week');
  [1,2,3,4,5,6,0].forEach(g=>{ // 一→日
    const p=WEEK[g];
    const active=(g===plan.key)?' active':'';
    const cls=(p.type==='rest'?' rest':' train')+(g===plan.key?'':'');
    const done=isDayDone(g)?' done':'';
    const d=el('div','day'+active+cls+done);
    d.innerHTML='<div class="d-name">'+p.name+'</div><div class="d-tag">'+(p.type==='rest'?'休息':'练')+'</div>';
    d.onclick=()=>{ if(editingDay!==null){ state.trainEdits[editingDay]=editBuffer.slice(); saveState(); editingDay=null; } trainSel=g; renderTrain(v); };
    week.appendChild(d);
  });
  wc.appendChild(week);
  v.appendChild(wc);

  // 选中日详情
  const p=WEEK[trainSel];
  const dc=el('div','card');
  dc.innerHTML='<h2>'+(p.type==='train'?'🏋️ ':'🌿 ')+p.title+'</h2>'+
    '<div class="muted">重点：'+p.focus+'　|　时长：'+p.dur+'</div>';

  if(editingDay===trainSel){
    /* ---- 编辑模式 ---- */
    const tip=el('div','tiny','改动自动存本机；可加动作、改组次、删动作，或恢复默认。');
    dc.appendChild(tip);
    editBuffer.forEach((ex,idx)=>{
      const e=el('div','exo');
      e.innerHTML=
        '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">'+
          '<input class="input" data-f="n" data-i="'+idx+'" value="'+ex.n+'" placeholder="动作名" style="flex:1">'+
          '<button class="sheet-close" data-del="'+idx+'">✕</button>'+
        '</div>'+
        '<div style="display:flex;gap:6px">'+
          fld('器械',ex.e,'e')+ fld('组数',ex.s,'s')+ fld('次数',ex.r,'r')+ fld('组休',ex.rest,'rest')+
        '</div>'+
        '<label style="display:block;font-size:10px;color:var(--text-dim);margin-top:6px">看示范链接（可改；留空用默认B站搜索）<input class="input" data-f="demo" data-i="'+idx+'" value="'+(ex.demo||'')+'" placeholder="默认：B站搜索该动作标准动作" style="margin-top:3px;padding:7px 9px;font-size:12px"></label>'+
        '<textarea class="input" data-f="note" data-i="'+idx+'" placeholder="要点" style="margin-top:6px;min-height:36px">'+ex.note+'</textarea>';
      e.querySelectorAll('[data-f]').forEach(inp=>{ inp.oninput=(ev)=>{ editBuffer[+inp.dataset.i][inp.dataset.f]=ev.target.value; }; });
      e.querySelector('[data-del]').onclick=()=>{ editBuffer.splice(idx,1); renderTrain(v); };
      dc.appendChild(e);
    });
    const add=el('button','btn ghost','➕ 添加动作');
    add.onclick=()=>{ editBuffer.push({n:'新动作',e:'器械',s:'3',r:'10-12',rest:'60s',note:''}); renderTrain(v); };
    dc.appendChild(add);
    const row=el('div'); row.style.display='flex'; row.style.gap='10px'; row.style.marginTop='10px';
    const save=el('button','btn','✅ 保存并退出');
    save.onclick=()=>{ state.trainEdits[trainSel]=editBuffer.slice(); saveState(); editingDay=null; renderTrain(v); toast('已保存本日计划 💪'); };
    const reset=el('button','btn ghost','↺ 恢复默认');
    reset.onclick=()=>{ delete state.trainEdits[trainSel]; saveState(); editingDay=null; renderTrain(v); toast('已恢复默认计划'); };
    row.appendChild(save); row.appendChild(reset); dc.appendChild(row);
  } else {
    /* ---- 只读模式 ---- */
    const exs=dayExercises(trainSel);
    exs.forEach((ex,i)=>{
      const e=el('div','exo');
      e.innerHTML=
        '<div class="e-top"><div class="e-name">'+(i+1)+'. '+ex.n+'</div><div class="e-equip">'+ex.e+'</div></div>'+
        '<div class="e-meta"><span>组数 <b>'+ex.s+'</b></span><span>次数 <b>'+ex.r+'</b></span><span>组休 <b>'+ex.rest+'</b></span></div>'+
        '<div class="e-note">💡 '+ex.note+'</div>'+
        (function(){ const s=suggestNext(ex.n); return s.first?'<div class="e-sug">🎯 建议：首次按计划做 '+ex.r+' 次，记录后再渐进加重</div>':'<div class="e-sug">🎯 建议下次：'+s.weight+'kg × '+s.reps+'次'+(s.inc?'（比上次 +2.5kg，进入新重量）':'（次数 +1）')+'</div>'; })()+
        '<a class="demo-link" href="'+videoUrl(ex)+'" target="_blank" rel="noopener">▶ 看标准动作示范</a>';
      dc.appendChild(e);
    });
    const editBtn=el('button','btn ghost','✏️ 调整本日动作');
    editBtn.onclick=()=>{ enterEdit(trainSel,v); };
    dc.appendChild(editBtn);
    // 打卡本日训练
    if(p.type==='train' && trainSel===plan.key){
      const tk=todayKey(); const done=state.checklists[tk]&&state.checklists[tk].train;
      const b=el('button','btn'+(done?' ghost':''),done?'✓ 今日训练已打卡':'完成今日训练打卡');
      b.onclick=()=>{ toggleCheck('train'); };
      dc.appendChild(b);
    }
    // 训练实况记录入口
    if(p.type==='train'){
      const pr=lastLogForDay(trainSel);
      if(pr) dc.appendChild(el('div','tiny','📝 上次记录：'+pr.date+' · '+pr.items.filter(x=>x.weight>0).length+' 个动作有重量数据'));
      const lb=el('button','btn', (pr&&pr.date===todayKey()?'✓ 今日已记录 · 再记一次':'📝 记录本次训练（填实际重量）'));
      lb.onclick=()=>{ openTrainLogSheet(trainSel,v); };
      dc.appendChild(lb);
    }
  }
  v.appendChild(dc);

  // 进阶说明
  const nc=el('div','card'); nc.innerHTML='<h2>📈 12周进阶路线</h2>';
  REST.phases.forEach(ph=>{ nc.innerHTML+='<h3>'+ph.p+'</h3><div class="muted">'+ph.d+'</div>'; });
  v.appendChild(nc);
}
let trainSel=null;
let editingDay=null;
let editBuffer=[];
const clone=x=>JSON.parse(JSON.stringify(x));
function dayExercises(g){ return (state.trainEdits && state.trainEdits[g]) ? state.trainEdits[g] : WEEK[g].exercises; }
function enterEdit(g,v){ editBuffer=clone(dayExercises(g)); editingDay=g; renderTrain(v); }
function fld(label,val,field){
  return '<label style="flex:1;font-size:10px;color:var(--text-dim)">'+label+
    '<input class="input" data-f="'+field+'" value="'+val+'" style="margin-top:3px;padding:7px 9px;font-size:13px"></label>';
}
function isDayDone(g){
  // 仅训练日需要 train 打卡；用"最近一次该星期几"判断不精确，改为：若该星期几=今天则看今天
  const p=WEEK[g]; if(p.type!=='train') return false;
  if(g!==getDayPlan().key) return false;
  const tk=todayKey(); return state.checklists[tk]&&state.checklists[tk].train;
}

/* ---------- 训练实况记录 & 力量进步 ---------- */
function est1RM(w,r){ const W=parseFloat(w),R=parseFloat(r); if(!W||!R||R<=0) return 0; return Math.round(W*(1+R/30)); }
function lastLogForDay(dayKey){
  let best=null;
  Object.keys(state.trainLog).sort().forEach(d=>{
    const e=state.trainLog[d]; if(e&&e.dayKey===dayKey){ if(!best||d>best.date) best={date:d,items:e.items}; }
  });
  return best;
}
/* 渐进超负荷：根据某动作最近一次记录，给"下次建议重量/次数" */
function lastItemByName(name){
  let best=null;
  Object.keys(state.trainLog).sort().forEach(d=>{
    const e=state.trainLog[d]; (e.items||[]).forEach(it=>{ if(it.name===name && it.weight>0){ if(!best||d>best.date) best={date:d,w:it.weight,r:it.reps}; } });
  });
  return best;
}
function suggestNext(name){
  const last=lastItemByName(name);
  if(!last) return {first:true};
  if(last.r>=12) return {weight: Math.round((last.w+2.5)*2)/2, reps:8, inc:true, from:last}; // 到次数上限→加重、次数回落
  return {weight:last.w, reps:Math.min(12,last.r+1), inc:false, from:last};                  // 否则次数+1
}
function openTrainLogSheet(dayKey,v){
  const p=WEEK[dayKey]; const exs=dayExercises(dayKey);
  const prev=lastLogForDay(dayKey); const prevMap={};
  if(prev) prev.items.forEach(it=>prevMap[it.name]=it);
  const sheet=$('#sheet'); const content=$('#sheet-content');
  $('#sheet-title').textContent='📝 记录训练 · '+p.name+'（'+p.tag+'）';
  content.innerHTML='';
  content.appendChild(el('div','tiny','填本次实际举的重量/组数/次数，App 会帮你和上次对比，判断要不要加重（渐进超负荷）。'));
  const dw=el('div'); dw.style.marginTop='8px';
  dw.innerHTML='<label class="fld">训练日期（可补记往次）</label><input class="input" id="logdate" type="date" value="'+todayKey()+'">';
  content.appendChild(dw);
  const grid=el('div'); grid.style.marginTop='6px';
  exs.forEach((ex,i)=>{
    const pv=prevMap[ex.n]||{};
    const sg=suggestNext(ex.n);
    const defW = sg.first ? (pv.weight||'') : sg.weight;
    const defR = sg.first ? (pv.reps||'10') : sg.reps;
    const defS = pv.sets||ex.s||'4';
    const row=el('div','exo');
    row.innerHTML=
      '<div class="e-top"><div class="e-name">'+(i+1)+'. '+ex.n+'</div><div class="e-equip">'+ex.e+'</div></div>'+
      (pv.weight?('<div class="tiny" style="color:var(--mint)">上次：'+pv.weight+'kg × '+pv.sets+'组 × '+pv.reps+'次</div>'):'')+
      (sg.first?'<div class="tiny" style="color:var(--lilac)">首练：按计划做 '+ex.r+' 次，先记下来</div>':'<div class="tiny" style="color:var(--lilac)">建议本次目标：'+sg.weight+'kg × '+sg.reps+'次'+(sg.inc?'（加重 2.5kg）':'（次数 +1）')+'</div>')+
      '<div style="display:flex;gap:6px;margin-top:6px">'+
        '<label style="flex:1;font-size:10px;color:var(--text-dim)">重量kg<input class="input log-w" data-i="'+i+'" value="'+ defW +'" placeholder="如 60" style="margin-top:3px;padding:8px"></label>'+
        '<label style="flex:1;font-size:10px;color:var(--text-dim)">组数<input class="input log-s" data-i="'+i+'" value="'+ defS +'" placeholder="4" style="margin-top:3px;padding:8px"></label>'+
        '<label style="flex:1;font-size:10px;color:var(--text-dim)">次数<input class="input log-r" data-i="'+i+'" value="'+ defR +'" placeholder="10" style="margin-top:3px;padding:8px"></label>'+
      '</div>';
    grid.appendChild(row);
  });
  content.appendChild(grid);
  const save=el('button','btn','✅ 保存本次训练');
  save.onclick=()=>{
    const date=$('#logdate').value||todayKey();
    const items=exs.map((ex,i)=>({
      name:ex.n,
      weight:parseFloat($('.log-w[data-i="'+i+'"]').value)||0,
      sets:parseInt($('.log-s[data-i="'+i+'"]').value)||0,
      reps:parseInt($('.log-r[data-i="'+i+'"]').value)||0
    }));
    if(!items.some(it=>it.weight>0)){ toast('至少填一个动作的重量'); return; }
    state.trainLog[date]={dayKey:dayKey,items:items}; saveState();
    sheet.classList.add('hidden'); toast('已记录 '+date+' 的训练 💪');
    if(view==='train') renderTrain(v); else render();
  };
  content.appendChild(save);
  sheet.classList.remove('hidden');
}
function computePR(){
  const byName={};
  Object.keys(state.trainLog).sort().forEach(d=>{
    const e=state.trainLog[d]; (e.items||[]).forEach(it=>{ if(it.weight>0){ (byName[it.name]=byName[it.name]||[]).push({date:d,w:it.weight}); } });
  });
  return Object.keys(byName).map(n=>{
    const arr=byName[n].sort((a,b)=>a.date<b.date?-1:1);
    const max=Math.max(...arr.map(x=>x.w)); const first=arr[0].w;
    return {name:n,max:max,delta:Math.round((max-first)*10)/10};
  }).sort((a,b)=>b.max-a.max);
}
function buildStrengthChart(){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','wchart'); svg.setAttribute('viewBox','0 0 320 140');
  const byName={};
  Object.keys(state.trainLog).sort().forEach(d=>{
    const e=state.trainLog[d]; (e.items||[]).forEach(it=>{ if(it.weight>0){ (byName[it.name]=byName[it.name]||[]).push({date:d,w:it.weight,r:it.reps}); } });
  });
  const names=Object.keys(byName).filter(n=>byName[n].length>=2);
  if(!names.length) return null;
  names.sort((a,b)=>byName[b].length-byName[a].length);
  const anchor=byName[names[0]].slice().sort((a,b)=>a.date<b.date?-1:1);
  const data=anchor.map(p=>({date:p.date,v:est1RM(p.w,p.r)}));
  const vs=data.map(d=>d.v); const min=Math.min(...vs)-2, max=Math.max(...vs)+2;
  const W=320,H=140,pad=18;
  const x=i=>pad+(W-2*pad)*i/(data.length-1);
  const y=v=>H-pad-(H-2*pad)*(v-min)/(max-min||1);
  let d=''; data.forEach((p,i)=>{ d+=(i?'L':'M')+x(i).toFixed(1)+' '+y(p.v).toFixed(1)+' '; });
  svg.innerHTML='<defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6ee7b7"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs>'+
    '<path d="'+d+'" fill="none" stroke="url(#sg)" stroke-width="3" stroke-linecap="round"/>'+
    data.map((p,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(p.v).toFixed(1)+'" r="3.5" fill="#6ee7b7"/>').join('');
  return {svg:svg,name:names[0]};
}
/* ---------- 身体数据（围度 / 体脂） ---------- */
function latestMeasure(){
  const ks=Object.keys(state.measure).sort();
  if(!ks.length) return null;
  const last=state.measure[ks[ks.length-1]];
  const wLog=state.weightLog.slice().sort((a,b)=>a.date<b.date?-1:1);
  const weight=last.weight!=null?last.weight:(wLog.length?wLog[wLog.length-1].weight:null);
  const first=state.measure[ks[0]];
  const w0=first.weight!=null?first.weight:(wLog.length?wLog[0].weight:null);
  return {
    weight: weight!=null?weight:'—',
    weightDelta:(weight!=null&&w0!=null)?Math.round((weight-w0)*10)/10:0,
    arm: last.arm!=null?last.arm:'—',
    armDelta:(last.arm!=null&&first.arm!=null)?Math.round((last.arm-first.arm)*10)/10:0,
    chest: last.chest!=null?last.chest:null,
    waist: last.waist!=null?last.waist:null,
    thigh: last.thigh!=null?last.thigh:null,
    bf: last.bf!=null?last.bf:null
  };
}
function buildBodyChart(){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','wchart'); svg.setAttribute('viewBox','0 0 320 140');
  const dates=Object.keys(state.measure).filter(d=>state.measure[d].arm!=null&&state.measure[d].weight!=null).sort();
  if(dates.length<2) return null;
  const wv=dates.map(d=>state.measure[d].weight), av=dates.map(d=>state.measure[d].arm);
  const wmin=Math.min(...wv)-1,wmax=Math.max(...wv)+1, amin=Math.min(...av)-1,amax=Math.max(...av)+1;
  const W=320,H=140,pad=18;
  const x=i=>pad+(W-2*pad)*i/(dates.length-1);
  const yw=w=>H-pad-(H-2*pad)*(w-wmin)/(wmax-wmin||1);
  const ya=a=>H-pad-(H-2*pad)*(a-amin)/(amax-amin||1);
  let dw='',da='';
  dates.forEach((d,i)=>{ dw+=(i?'L':'M')+x(i).toFixed(1)+' '+yw(state.measure[d].weight).toFixed(1)+' ';
    da+=(i?'L':'M')+x(i).toFixed(1)+' '+ya(state.measure[d].arm).toFixed(1)+' '; });
  svg.innerHTML='<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#93c5fd"/><stop offset="1" stop-color="#c4b5fd"/></linearGradient></defs>'+
    '<path d="'+dw+'" fill="none" stroke="#93c5fd" stroke-width="3"/>'+
    '<path d="'+da+'" fill="none" stroke="#c4b5fd" stroke-width="3" stroke-dasharray="4 3"/>'+
    dates.map((d,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+yw(state.measure[d].weight).toFixed(1)+'" r="3" fill="#93c5fd"/>').join('')+
    dates.map((d,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+ya(state.measure[d].arm).toFixed(1)+'" r="3" fill="#c4b5fd"/>').join('');
  return svg;
}

/* ---------- 饮食视图 ---------- */
function renderDiet(v){
  const tg=currentTarget(); const p=getProfile(); const bmr=calcBMR(p); const tdee=calcTDEE(p); const adj=tg.kcal-tdee;
  const goalNote = p.goal==='减脂' ? '减脂期，保证蛋白、控制脂肪与总热量。'
    : p.goal==='维持' ? '维持期，热量与消耗持平。'
    : '体重偏轻/增肌期，优先保证蛋白与总热量。';
  const mc=el('div','card');
  mc.innerHTML='<h2>🎯 每日营养目标</h2>'+
    '<div class="macro-row">'+
      '<div class="macro k"><div class="v">'+tg.kcal+'</div><div class="k">千卡</div></div>'+
      '<div class="macro p"><div class="v">'+tg.protein+'g</div><div class="k">蛋白质</div></div>'+
      '<div class="macro c"><div class="v">'+tg.carbs+'g</div><div class="k">碳水</div></div>'+
      '<div class="macro f"><div class="v">'+tg.fat+'g</div><div class="k">脂肪</div></div>'+
    '</div>'+
    '<div class="tiny">测算：BMR≈'+bmr+' kcal，维持≈'+tdee+' kcal，目标 '+(adj>=0?('+'+adj+' 盈余'):(adj+' 赤字'))+'。'+goalNote+'</div>'+
    '<div class="tiny" style="margin-top:8px">'+MACRO_LOOK+'</div>';
  v.appendChild(mc);

  // 建议新目标横幅（体重变化后自动出现，应用才生效）
  if(targetDiffers(computeSuggestion(), tg)){
    const sg=computeSuggestion();
    const banner=el('div','sug-banner');
    banner.innerHTML='💡 <b>建议新目标</b>：随你的最新体重已自动重算 → '+sg.kcal+' kcal / 蛋白'+sg.protein+'g / 碳水'+sg.carbs+'g / 脂肪'+sg.fat+'g。'+
      '<div class="tiny" style="margin-top:4px">当前：'+tg.kcal+' kcal。点「应用」即更新饮食目标（手动改过的会保留到下次重算）。</div>';
    const ab=el('button','btn','✅ 应用建议目标');
    ab.onclick=()=>{ state.target=sg; saveState(); renderDiet(v); toast('已更新饮食目标 ✅'); };
    banner.appendChild(ab);
    v.appendChild(banner);
  }

  const mlc=el('div','card'); mlc.innerHTML='<h2>🍱 一日六餐模板</h2>';
  MEALS.forEach(m=>{
    const row=el('div','meal');
    row.innerHTML='<div class="mt">'+m.time+'</div>'+
      '<div class="md"><div class="mn">'+m.name+'</div><div class="mk">'+m.items+'</div>'+
      '<div class="tiny">'+m.macro+'</div>'+
      '<div class="tiny" style="color:var(--lilac);margin-top:3px">'+MEAL_LOOK[m.id]+'</div></div>'+
      '<div class="mcal">'+m.kcal+'</div>';
    mlc.appendChild(row);
  });
  mlc.innerHTML+='<div class="tiny" style="text-align:right;margin-top:6px">合计 ≈ '+MEALS.reduce((s,m)=>s+m.kcal,0)+' kcal</div>';

  // 份量手测法（不用秤）
  const hm=el('div','card');
  hm.innerHTML='<h2>🤲 份量手测法（不用秤）</h2>'+
    '<div class="muted">• <b style="color:var(--pink)">蛋白质</b>：每餐 = 掌心大小、厚1cm的瘦肉（鸡胸/牛/鱼）≈ 30-40g蛋白</div>'+
    '<div class="muted" style="margin-top:5px">• <b style="color:#93c5fd">碳水</b>：每餐 = 拳头大的主食（米饭/面/薯）≈ 1小碗熟饭</div>'+
    '<div class="muted" style="margin-top:5px">• <b style="color:var(--mint)">蔬菜</b>：每餐 = 双手合捧的一大把</div>'+
    '<div class="muted" style="margin-top:5px">• <b style="color:var(--amber)">脂肪</b>：每餐 = 大拇指尖大小的油脂（烹饪油/坚果/牛油果）</div>'+
    '<div class="muted" style="margin-top:5px">• <b>全天 '+currentTarget().kcal+'kcal</b> ≈ 你平时饭量 + 额外2顿加餐（上午/睡前）</div>';
  v.appendChild(hm);
  v.appendChild(mlc);

  // 饮水追踪
  const wc=el('div','card'); wc.innerHTML='<h2>💧 饮水追踪（目标 '+currentTarget().water+'L ≈ 8杯）</h2>';
  const tk=todayKey(); const cnt=state.waterToday[tk]||0;
  const track=el('div','water-track');
  for(let i=0;i<8;i++){
    const drop=el('div','drop'+(i<cnt?' on':''));
    drop.onclick=()=>{ const k=todayKey(); state.waterToday[k]=state.waterToday[k]||0;
      state.waterToday[k]=(i<cnt)? i : i+1; saveState(); renderDiet(v); };
    track.appendChild(drop);
  }
  wc.appendChild(track);
  wc.innerHTML+='<div class="tiny" style="margin-top:6px">已喝 '+(cnt)+'/8 杯 · 每杯约400ml</div>';
  v.appendChild(wc);

  // 补剂
  const sc=el('div','card'); sc.innerHTML='<h2>💊 补剂建议（非医疗建议）</h2>';
  SUPPS.forEach(s=>{ sc.innerHTML+='<div class="supp-row"><div><div class="s-name">'+s.name+'</div><div class="s-dose">'+s.dose+'</div></div><div class="tiny" style="max-width:140px;text-align:right">'+s.note+'</div></div>'; });
  v.appendChild(sc);

  // 每周采购清单
  const shopc=el('div','card');
  let shopHtml='<h2>🛒 每周采购清单</h2><div class="tiny">按六餐模板换算的周用量，去超市前打勾，买完点掉。分量含直观量。</div>';
  let shopDone=0, shopTotal=0;
  SHOPPING.forEach(group=>{
    shopHtml+='<div class="shop-cat">'+group.cat+'</div>';
    group.items.forEach(it=>{
      const key=group.cat+'||'+it.n; shopTotal++;
      const on=!!state.shopCheck[key]; if(on) shopDone++;
      shopHtml+='<div class="shop-item'+(on?' done':'')+'" data-key="'+key+'">'+
        '<div class="box">'+(on?'✓':'')+'</div><div class="si-name">'+it.n+'</div><div class="si-q">'+it.q+'</div></div>';
    });
  });
  shopHtml+='<div class="tiny" style="margin-top:6px">已购 '+shopDone+'/'+shopTotal+'</div>';
  shopc.innerHTML=shopHtml;
  shopc.addEventListener('click',(ev)=>{ const row=ev.target.closest('.shop-item'); if(!row) return; const key=row.dataset.key; state.shopCheck[key]=!state.shopCheck[key]; saveState(); renderDiet(v); });
  const clearB=el('button','btn ghost','清空勾选'); clearB.style.marginTop='6px';
  clearB.onclick=()=>{ state.shopCheck={}; saveState(); renderDiet(v); };
  shopc.appendChild(clearB);
  v.appendChild(shopc);

  const nc=el('div','note-box','<b>替换原则：</b>吃不下的餐可等量替换（同蛋白同热量），但每天必须凑够 '+currentTarget().kcal+' kcal 与 '+currentTarget().protein+'g 蛋白。外食选牛排/烤肉/牛肉面，避开油炸与含糖饮料。每周称重 2 次，体重 2 周不涨就再 +200 kcal。');
  v.appendChild(nc);
}

/* ---------- 作息视图 ---------- */
function renderRoutine(v){
  const sc=el('div','card');
  sc.innerHTML='<h2>🌙 睡眠计划</h2><div class="muted">'+SLEEP.target+'</div>';
  SLEEP.points.forEach(p=>{ sc.innerHTML+='<div class="muted" style="margin-top:6px">• '+p+'</div>'; });
  v.appendChild(sc);

  const wc=el('div','card'); wc.innerHTML='<h2>🛏️ 睡前流程</h2><div class="tl">';
  SLEEP.windDown.forEach(w=>{ wc.innerHTML+='<div class="tl-item"><div class="tl-t">'+w.t+'</div><div class="tl-c">'+w.c+'</div><div class="tl-d">'+w.d+'</div></div>'; });
  wc.innerHTML+='</div>'; v.appendChild(wc);

  const tc=el('div','card'); tc.innerHTML='<h2>⏱️ 每日时间轴</h2><div class="tl">';
  TIMELINE.forEach(t=>{ const rest=(t.type==='sleep'||t.type==='water')?' rest':''; tc.innerHTML+='<div class="tl-item'+rest+'"><div class="tl-t">'+t.t+'</div><div class="tl-c">'+t.c+'</div><div class="tl-d">'+t.d+'</div></div>'; });
  tc.innerHTML+='</div>'; v.appendChild(tc);

  const rc=el('div','card'); rc.innerHTML='<h2>🌿 休息与恢复</h2>';
  REST.points.forEach(p=>{ rc.innerHTML+='<div class="muted" style="margin-top:6px">• '+p+'</div>'; });
  v.appendChild(rc);
}

/* ---------- 自律视图 ---------- */
function renderDiscipline(v){
  const streak=computeStreak();
  const totalDays=Object.keys(state.checklists).length;
  // 体重最新
  let latest=latestWeight(), delta=0;
  if(state.weightLog.length){ state.weightLog.sort((a,b)=>a.date<b.date?-1:1); latest=state.weightLog[state.weightLog.length-1].weight;
    if(state.weightLog.length>1) delta=latest-state.weightLog[0].weight; }

  // 我的档案（驱动目标测算）+ 自适应建议
  const prf=getProfile();
  const sg=computeSuggestion(); const tg=currentTarget(); const needApply=targetDiffers(sg,tg);
  const pc=el('div','card profile-card');
  pc.innerHTML='<h2>⚙️ 我的档案（驱动目标测算）</h2>'+
    '<div class="pf-grid">'+
      '<label class="fld">年龄<input class="input" id="pf-age" type="number" value="'+prf.age+'"></label>'+
      '<label class="fld">身高cm<input class="input" id="pf-h" type="number" value="'+prf.height+'"></label>'+
      '<label class="fld">体重kg<input class="input" id="pf-w" type="number" step="0.1" value="'+prf.weight+'"></label>'+
      '<label class="fld">活动量<select class="input" id="pf-act">'+
        opt('sedentary','久坐少动',prf.activity)+opt('light','轻度活动',prf.activity)+opt('moderate','中等(每周练4天)',prf.activity)+opt('active','高强度/体力',prf.activity)+
      '</select></label>'+
      '<label class="fld">目标<select class="input" id="pf-goal">'+
        opt('增肌','增肌(增重)',prf.goal)+opt('减脂','减脂',prf.goal)+opt('维持','维持',prf.goal)+
      '</select></label>'+
    '</div>';
  function opt(v,l,cur){ return '<option value="'+v+'"'+(v===cur?' selected':'')+'>'+l+'</option>'; }
  const pbsave=el('button','btn','保存档案并测算');
  pbsave.onclick=()=>{
    const age=parseInt($('#pf-age').value)||36, h=parseInt($('#pf-h').value)||177, w=parseFloat($('#pf-w').value)||58;
    const act=$('#pf-act').value, goal=$('#pf-goal').value;
    if(w<30||w>150||h<120||h>220){ toast('请输入合理身高体重'); return; }
    state.profile={age:age,sex:'男',height:h,weight:w,activity:act,goal:goal};
    saveState(); renderDiscipline(v); toast('档案已保存，已按新数据测算');
  };
  pc.appendChild(pbsave);
  if(needApply){
    const bn=el('div','sug-banner'); bn.innerHTML='💡 按你当前体重，<b>建议目标</b>：'+sg.kcal+' kcal / 蛋白'+sg.protein+'g / 碳水'+sg.carbs+'g / 脂肪'+sg.fat+'g（当前 '+tg.kcal+' kcal）。';
    const ab=el('button','btn','✅ 一键应用建议目标'); ab.onclick=()=>{ state.target=sg; saveState(); renderDiscipline(v); toast('已应用建议目标 ✅'); };
    bn.appendChild(ab); pc.appendChild(bn);
  } else {
    pc.innerHTML+='<div class="tiny" style="margin-top:8px">目标已是最新（'+tg.kcal+' kcal / 蛋白'+tg.protein+'g）。想回到按档案实时自动测算，可点下方按钮。</div>';
  }
  const rb2=el('button','btn ghost','恢复自动目标（按档案实时算）'); rb2.style.marginTop='6px';
  rb2.onclick=()=>{ state.target=null; saveState(); renderDiscipline(v); toast('已恢复自动测算'); };
  pc.appendChild(rb2);
  v.appendChild(pc);

  const sc=el('div','card');
  sc.innerHTML='<h2>🔥 自律数据</h2><div class="stat-grid">'+
    '<div class="stat"><div class="v">'+streak+'</div><div class="k">连续天数</div></div>'+
    '<div class="stat"><div class="v">'+totalDays+'</div><div class="k">累计打卡</div></div>'+
    '<div class="stat"><div class="v">'+(latest)+'kg</div><div class="k">当前体重'+(delta>0?(' ↑'+delta):(delta<0?(' ↓'+(-delta)):''))+'</div></div>'+
    '</div>';
  v.appendChild(sc);

  // 热力图（最近 70 天）
  const hc=el('div','card'); hc.innerHTML='<h2>📅 打卡热力图（近10周）</h2><div class="heat">';
  const tk=todayKey(); const cells=[];
  for(let i=69;i>=0;i--){
    const dt=new Date(); dt.setDate(dt.getDate()-i);
    const k=dt.toISOString().slice(0,10);
    const r=dayDoneRatio(k);
    let lvl=''; if(r>=0.8)lvl='l3'; else if(r>=0.5)lvl='l2'; else if(r>0)lvl='l1';
    const isT=(k===tk)?' today':'';
    cells.push('<div class="cell'+lvl+isT+'" title="'+k+' 完成'+Math.round(r*100)+'%"></div>');
  }
  hc.innerHTML+=cells.join('')+'</div><div class="tiny" style="margin-top:8px">颜色越深=完成度越高 · 琥珀描边=今天</div>';
  v.appendChild(hc);

  // 体重记录
  const wc=el('div','card');
  wc.innerHTML='<h2>⚖️ 体重记录（增肌看趋势）</h2>';
  if(state.weightLog.length){
    wc.appendChild(buildWeightChart());
    state.weightLog.slice(-5).reverse().forEach(w=>{ wc.innerHTML+='<div class="wlog-row"><span>'+w.date+'</span><span>'+w.weight+' kg</span></div>'; });
  } else {
    wc.innerHTML+='<div class="muted">还没有记录，建议每周一、四早起空腹称重。</div>';
  }
  const form=el('div');
  form.innerHTML='<label class="fld">记录今日体重 (kg)</label><input class="input" id="winput" type="number" step="0.1" placeholder="如 58.5">';
  wc.appendChild(form);
  const wb=el('button','btn','保存体重');
  wb.onclick=()=>{ const val=parseFloat($('#winput').value); if(!val||val<30||val>150){ toast('请输入合理体重'); return; }
    state.weightLog.push({date:todayKey(),weight:val});
    state.profile.weight=val;   // 同步档案体重，触发建议目标重算
    saveState(); renderDiscipline(v); toast('已记录 '+val+'kg，已按新体重生成建议目标（去饮食页或本卡应用）'); };
  wc.appendChild(wb);
  v.appendChild(wc);

  /* 力量进步 */
  const strength=buildStrengthChart();
  const sc2=el('div','card'); sc2.innerHTML='<h2>💪 力量进步（渐进超负荷）</h2>';
  if(strength){
    sc2.appendChild(strength.svg);
    sc2.innerHTML+='<div class="tiny" style="margin-top:4px">主项：'+strength.name+' · 估算1RM（Epley：重量×(1+次数/30)）走势</div>';
    const pr=computePR();
    if(pr.length) sc2.innerHTML+='<div class="pr-title">🏆 个人记录 PR（最大重量）</div>';
    pr.slice(0,6).forEach(r=>{ sc2.innerHTML+='<div class="wlog-row"><span>'+r.name+'</span><span>'+r.max+' kg'+(r.delta>0?(' ↑'+r.delta):'')+'</span></div>'; });
  } else {
    sc2.innerHTML+='<div class="muted">还没记录训练。去「训练」页点「📝 记录本次训练」填实际重量，就能看进步曲线与 PR。</div>';
  }
  v.appendChild(sc2);

  /* 身体数据 */
  const bc=el('div','card'); bc.innerHTML='<h2>📏 身体数据（围度 / 体脂）</h2>';
  const bodyChart=buildBodyChart();
  if(bodyChart){ bc.appendChild(bodyChart); bc.innerHTML+='<div class="tiny" style="margin-top:4px">蓝实线=体重(kg) · 紫虚线=臂围(cm)，看趋势别看单点</div>'; }
  const ms=latestMeasure();
  if(ms){
    bc.innerHTML+='<div class="wlog-row"><span>当前体重</span><span>'+ms.weight+' kg'+(ms.weightDelta>0?(' ↑'+ms.weightDelta):'')+'</span></div>'+
      '<div class="wlog-row"><span>臂围</span><span>'+ms.arm+' cm'+(ms.armDelta>0?(' ↑'+ms.armDelta):'')+'</span></div>'+
      (ms.chest!=null?'<div class="wlog-row"><span>胸围</span><span>'+ms.chest+' cm</span></div>':'')+
      (ms.waist!=null?'<div class="wlog-row"><span>腰围</span><span>'+ms.waist+' cm</span></div>':'')+
      (ms.thigh!=null?'<div class="wlog-row"><span>大腿围</span><span>'+ms.thigh+' cm</span></div>':'')+
      (ms.bf!=null?'<div class="wlog-row"><span>体脂</span><span>'+ms.bf+' %</span></div>':'');
  } else {
    bc.innerHTML+='<div class="muted">还没有围度记录，建议每 2 周量一次（晨起空腹、放松站立）。</div>';
  }
  const bf=el('div'); bf.style.marginTop='10px';
  bf.innerHTML=
    '<label class="fld">日期</label><input class="input" id="mdate" type="date" value="'+todayKey()+'">'+
    '<label class="fld">体重 (kg)</label><input class="input" id="mweight" type="number" step="0.1" placeholder="如 58.5">'+
    '<label class="fld">臂围 (cm)</label><input class="input" id="marm" type="number" step="0.1" placeholder="如 30">'+
    '<label class="fld">胸围 (cm)</label><input class="input" id="mchest" type="number" step="0.1" placeholder="如 95">'+
    '<label class="fld">腰围 (cm)</label><input class="input" id="mwaist" type="number" step="0.1" placeholder="如 78">'+
    '<label class="fld">大腿围 (cm)</label><input class="input" id="mthigh" type="number" step="0.1" placeholder="如 52">'+
    '<label class="fld">体脂 %（可选，体脂秤/卡尺估）</label><input class="input" id="mbf" type="number" step="0.1" placeholder="如 12">';
  bc.appendChild(bf);
  const mb=el('button','btn','保存身体数据');
  mb.onclick=()=>{
    const d=$('#mdate').value||todayKey();
    const w=parseFloat($('#mweight').value), arm=parseFloat($('#marm').value), chest=parseFloat($('#mchest').value),
          waist=parseFloat($('#mwaist').value), thigh=parseFloat($('#mthigh').value), bf2=parseFloat($('#mbf').value);
    if(!w&&!arm&&!chest&&!waist&&!thigh&&!bf2){ toast('至少填一项'); return; }
    const rec=state.measure[d]||{};
    if(w) rec.weight=w; if(arm) rec.arm=arm; if(chest) rec.chest=chest; if(waist) rec.waist=waist; if(thigh) rec.thigh=thigh; if(bf2) rec.bf=bf2;
    state.measure[d]=rec;
    if(w){ const ex=state.weightLog.find(x=>x.date===d); if(ex) ex.weight=w; else state.weightLog.push({date:d,weight:w}); state.profile.weight=w; }
    saveState(); renderDiscipline(v); toast('已保存身体数据 📏');
  };
  bc.appendChild(mb);
  bc.innerHTML+='<div class="tiny" style="margin-top:8px">体脂% 建议用体脂秤/皮褶卡尺估，单纯看体重会误判（增肌期体重涨可能是肌肉也可能是脂肪）。</div>';
  v.appendChild(bc);

  // 提醒设置入口
  const rc=el('div','card');
  rc.innerHTML='<h2>🔔 自律提醒</h2><div class="muted">开启后，App 在设定时间弹出提醒（需保持页面打开；浏览器会请求通知权限）。</div>';
  const rb=el('button','btn'+(state.remindersOn?' ghost':''), state.remindersOn?'✓ 提醒已开启（点击管理）':'开启定时提醒');
  rb.onclick=()=>openReminderSheet();
  rc.appendChild(rb);
  v.appendChild(rc);

  const nc=el('div','note-box','<b>执行到位的三条铁律：</b><br>1）训练日不偷练——哪怕只做一半也比不做强；<br>2）热量不达标=白练，每天把六餐吃满；<br>3）睡眠是隐形训练，23:30 前必须躺下。把打卡变成像刷牙一样的习惯。');
  v.appendChild(nc);
}

function buildWeightChart(){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','wchart'); svg.setAttribute('viewBox','0 0 320 140');
  const data=state.weightLog.slice(-14);
  if(data.length<2) return svg;
  const ws=data.map(d=>d.weight); const min=Math.min(...ws)-0.5, max=Math.max(...ws)+0.5;
  const W=320,H=140,pad=18;
  const x=i=>pad+(W-2*pad)*i/(data.length-1);
  const y=w=>H-pad-(H-2*pad)*(w-min)/(max-min||1);
  let d=''; data.forEach((p,i)=>{ d+=(i?'L':'M')+x(i).toFixed(1)+' '+y(p.weight).toFixed(1)+' '; });
  svg.innerHTML='<defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#f0abfc"/></linearGradient></defs>'+
    '<path d="'+d+'" fill="none" stroke="url(#wg)" stroke-width="3" stroke-linecap="round"/>'+
    data.map((p,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(p.weight).toFixed(1)+'" r="3.5" fill="#c4b5fd"/>').join('');
  return svg;
}

/* ---------- 提醒 Sheet ---------- */
function openReminderSheet(){
  const sheet=$('#sheet'); const content=$('#sheet-content');
  $('#sheet-title').textContent='🔔 自律提醒设置';
  content.innerHTML='';
  const head=el('div','muted','下方为默认提醒，开关控制是否推送。开启总开关会请求浏览器通知权限。');
  content.appendChild(head);

  // 总开关
  const master=el('div','rem-item');
  master.innerHTML='<div class="rem-time">总开关</div><div class="rem-label">全部提醒<small>开启后页面内+系统通知</small></div>';
  const sw=el('label','switch'); sw.innerHTML='<input type="checkbox" '+(state.remindersOn?'checked':'')+'><span class="slider"></span>';
  sw.querySelector('input').onchange=(e)=>{ toggleReminders(e.target.checked); };
  master.appendChild(sw); content.appendChild(master);

  REMINDERS.forEach((r,i)=>{
    const edit=state.remEdits[i]||{};
    const time=edit.time||r.time, label=edit.label||r.label, on=(edit.on!=null?edit.on:true);
    const row=el('div','rem-item');
    row.innerHTML='<div class="rem-time">'+time+'</div><div class="rem-label">'+label+'</div>';
    const s=el('label','switch'); s.innerHTML='<input type="checkbox" '+(on?'checked':'')+'><span class="slider"></span>';
    s.querySelector('input').onchange=(e)=>{ state.remEdits[i]=Object.assign(state.remEdits[i]||{},{on:e.target.checked}); saveState(); };
    row.appendChild(s);
    // 可点击编辑时间/文字
    row.querySelector('.rem-label').onclick=()=>{
      const nt=prompt('修改提醒时间(HH:MM)：',time); if(!nt) return;
      const nl=prompt('修改提醒文字：',label); if(nl===null) return;
      state.remEdits[i]=Object.assign(state.remEdits[i]||{},{time:nt,label:nl}); saveState(); openReminderSheet();
    };
    content.appendChild(row);
  });
  const tip=el('div','tiny','提示：网页提醒需保持本页面在浏览器中打开。若需"关掉页面也提醒"，可把本页"添加到主屏幕"后用手机浏览器常驻，或配合手机自带闹钟/提醒事项双重保险。');
  content.appendChild(tip);
  sheet.classList.remove('hidden');
}
$('#sheet-close').onclick=()=>$('#sheet').classList.add('hidden');
$('.sheet-mask').onclick=()=>$('#sheet').classList.add('hidden');

function toggleReminders(on){
  state.remindersOn=on; saveState();
  if(on){
    if('Notification' in window && Notification.permission==='default'){
      Notification.requestPermission().then(p=>{ if(p!=='granted') toast('已开启页内提醒（系统通知未授权）'); scheduleReminders(); renderDiscipline($('#view')); });
      // 即便等待授权也先排页内
      scheduleReminders();
    } else { scheduleReminders(); }
    toast('已开启自律提醒 🔔');
  } else {
    toast('已关闭提醒');
  }
  renderDiscipline($('#view'));
  // 更新铃铛状态
  $('#bell').classList.toggle('active',on);
}

function effectiveReminders(){
  return REMINDERS.map((r,i)=>{ const e=state.remEdits[i]||{}; return {time:e.time||r.time,label:e.label||r.label,on:(e.on!=null?e.on:true)}; });
}
let _remTimers=[];
function scheduleReminders(){
  _remTimers.forEach(t=>clearTimeout(t)); _remTimers=[];
  if(!state.remindersOn) return;
  const now=new Date();
  effectiveReminders().forEach(r=>{
    if(!r.on) return;
    const [h,m]=r.time.split(':').map(Number);
    const fire=new Date(); fire.setHours(h,m,0,0);
    let diff=fire-now;
    if(diff<0) diff+=24*3600*1000; // 明天
    const timer=setTimeout(()=>fireReminder(r), diff);
    _remTimers.push(timer);
  });
}
function fireReminder(r){
  // 页内 toast
  toast('⏰ '+r.time+' · '+r.label);
  // 系统通知
  if('Notification' in window && Notification.permission==='granted'){
    try{ new Notification('Mef训计星球',{body:r.label,icon:''}); }catch(e){}
  }
  // 重新排下一次
  scheduleReminders();
}
$('#bell').onclick=()=>openReminderSheet();

/* ============================================================
   星空背景 & 启动
   ============================================================ */
function paintStars(){
  const c=$('#stars'); let html='';
  for(let i=0;i<60;i++){
    const x=Math.random()*100, y=Math.random()*100, s=Math.random()*2+0.5, d=(Math.random()*4+2).toFixed(1);
    html+='<span style="position:absolute;left:'+x+'%;top:'+y+'%;width:'+s+'px;height:'+s+'px;border-radius:50%;background:#fff;opacity:'+(Math.random()*0.6+0.2)+';animation:tw '+d+'s infinite alternate"></span>';
  }
  c.innerHTML=html+='<style>@keyframes tw{from{opacity:.15}to{opacity:.9}}</style>';
}

function init(){
  paintStars();
  // 若已开提醒，恢复铃铛与定时
  $('#bell').classList.toggle('active',!!state.remindersOn);
  if(state.remindersOn) scheduleReminders();
  render();
  // 默认显示今日
  view='today'; render();
}
init();

/* ============================================================
   动作示范视频库（第6个视图）
   ============================================================ */
function videoUrl(ex){
  const name = ex.n;
  state.videoLinks = state.videoLinks || {};
  return state.videoLinks[name] || ex.demo ||
    ('https://search.bilibili.com/all?keyword='+encodeURIComponent(name+' 标准动作 示范'));
}

function renderVideos(v){
  const intro = el('div','card');
  intro.innerHTML =
    '<h2>🎬 动作示范视频库</h2>'+
    '<div class="muted">按训练日归类全部动作。点「▶ 看示范」跳到哔哩哔哩看标准动作教学；'+
    '想固定某个你喜欢的视频，点「✎ 设固定链接」粘贴地址，之后优先跳你收藏的版本。</div>';
  v.appendChild(intro);

  const note = el('div','note-box',
    '<b>怎么用：</b>新手每个动作先看 1~2 遍标准示范，重点看「起始姿势 / 轨迹 / 呼吸 / 离心节奏」。'+
    '做错动作比不做更伤，尤其卧推、深蹲、硬拉、引体。');
  v.appendChild(note);

  const order = [1,4,2,5,3,6,0];
  order.forEach(g=>{
    const p = WEEK[g];
    const dc = el('div','card');
    dc.innerHTML = '<h3 style="margin:0 0 2px">'+p.name+' · '+p.title+'</h3>'+
      '<div class="muted" style="margin-bottom:8px">'+p.focus+'</div>';
    p.exercises.forEach(ex=>{
      const name = ex.n;
      const custom = state.videoLinks[name];
      const row = el('div','shop-item video-row');
      row.innerHTML =
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:13px;font-weight:500">'+name+'</div>'+
          '<div class="tiny" style="color:var(--text-dim)">'+ex.e+'　'+ex.s+'组 × '+ex.r+'</div>'+
        '</div>'+
        '<a class="btn sm" href="'+videoUrl(ex)+'" target="_blank" rel="noopener" style="text-decoration:none;flex:none">▶ 看示范</a>'+
        '<button class="btn sm ghost" style="flex:none" data-name="'+name+'">'+(custom?'✎ 改链接':'✎ 设链接')+'</button>';
      dc.appendChild(row);
    });
    dc.addEventListener('click',(ev)=>{
      const btn = ev.target.closest('button[data-name]'); if(!btn) return;
      const name = btn.dataset.name;
      const cur = state.videoLinks[name] || '';
      const url = window.prompt('为「'+name+'」设置固定示范视频链接（留空则恢复默认B站搜索）：\n当前：'+cur, cur);
      if(url===null) return; // 取消
      if(url.trim()===''){ delete state.videoLinks[name]; toast('已恢复默认B站搜索'); }
      else { state.videoLinks[name]=url.trim(); toast('已保存固定链接 ✅'); }
      saveState(); renderVideos(v);
    });
    v.appendChild(dc);
  });
}

