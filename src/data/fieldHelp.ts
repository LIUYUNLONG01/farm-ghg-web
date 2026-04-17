export type FieldHelpEntry = {
  match: string;
  title: string;
  description: string;
  unit?: string;
  howToFill?: string;
  caution?: string;
  matchMode?: "includes" | "exact" | "startsWith";
};

type RoutePrefix =
  | "/project/livestock"
  | "/project/enteric"
  | "/project/manure-ch4"
  | "/project/manure-n2o"
  | "/project/energy";

const FIELD_HELP_BY_ROUTE: Record<RoutePrefix, FieldHelpEntry[]> = {
  "/project/livestock": [
    {
      match: "年平均存栏 AP",
      title: "年平均存栏 AP",
      description:
        "AP 表示核算年度内该群体的年平均在栏数量，是后续肠道发酵和粪污模块最核心的活动水平参数之一。",
      unit: "头或只",
      howToFill: "优先按 12 个月存栏自动平均；短生长期动物可用周转量折算。",
      caution: "不要把年末存栏或某一天的存栏量直接当作 AP。",
    },
    {
      match: "年出栏量（可人工校正）",
      title: "年出栏量",
      description:
        "表示该群体在核算年度内实际出栏的动物数量，用于描述群体周转情况，并为部分折算和核对提供依据。",
      unit: "头或只",
      howToFill: "默认可由月度动态自动汇总，也可结合台账做人工校正。",
      caution: "应与月度销售、转出、淘汰等记录保持一致。",
    },
    {
      match: "期初平均体重（kg）",
      title: "期初平均体重",
      description:
        "表示该群体在核算期起点的平均体重，可用于后续 DMI、能量或排泄相关参数的估算。",
      unit: "kg/头",
      howToFill: "按群体平均值填报，不是单个样本值。",
    },
    {
      match: "期末平均体重（kg）",
      title: "期末平均体重",
      description:
        "表示该群体在核算期末的平均体重，与期初体重和日增重一起反映群体生长状态。",
      unit: "kg/头",
      howToFill: "按群体平均值填报。",
    },
    {
      match: "平均日增重（kg/d）",
      title: "平均日增重",
      description:
        "表示群体平均每头每日增重水平，是估算采食量和生产状态时常用的基础参数。",
      unit: "kg/头·日",
      howToFill: "宜与期初体重、期末体重和饲养天数口径一致。",
      caution: "不要把总增重或阶段总增重量误填为日增重。",
    },
    {
      match: "成熟体重（kg）",
      title: "成熟体重",
      description:
        "表示该类动物达到成年稳定状态时的参考体重，常用于估算采食或能量需求。",
      unit: "kg/头",
      howToFill: "按畜种/阶段的参考成熟体重填写。",
    },
    {
      match: "泌乳量（kg/年）",
      title: "泌乳量",
      description:
        "表示泌乳动物在核算年度内的产奶水平，是描述生产性能的重要参数。",
      unit: "kg/头·年",
      howToFill: "按单头年产量口径填写。",
      caution: "不要把群体总奶量直接填到单头年产量字段里。",
    },
    {
      match: "乳脂率（%）",
      title: "乳脂率",
      description:
        "表示牛奶中脂肪所占比例，用于表征奶的品质，也可能参与部分生产性能判断。",
      unit: "%",
      howToFill: "填写平均乳脂率。",
    },
    {
      match: "妊娠比例（%）",
      title: "妊娠比例",
      description:
        "表示群体中处于妊娠状态个体的比例，可影响采食和能量需求判断。",
      unit: "%",
      howToFill: "按群体平均水平填写。",
    },
    {
      match: "饲养方式",
      title: "饲养方式",
      description:
        "表示动物所处的主要管理模式，如舍饲、放牧等，不同方式会影响活动数据和参数解释。",
      howToFill: "按该群体年度内的主导方式填写。",
    },
    {
      match: "DMI 获取方式",
      title: "DMI 获取方式",
      description:
        "DMI 即干物质采食量。这里用于说明该群体 DMI 是直接录入、台账反推，还是模型占位估算。",
      howToFill: "优先选择最接近真实生产记录的来源。",
      caution: "同一群体的 DMI 来源应保持一致，便于后续追溯。",
    },
    {
      match: "DMI（kg DM/头·日）",
      title: "DMI",
      description:
        "DMI 表示单头动物每日采食的干物质量，是肠道发酵和部分粪污参数估算的重要输入。",
      unit: "kg DM/头·日",
      howToFill: "必须是干物质量，不是鲜料重量。",
      caution: "最常见错误是把鲜重采食量直接填进来。",
    },
    {
      match: "DE（%）",
      title: "DE",
      description:
        "DE 表示日粮中可消化能占总能的比例，常用于采食或能量相关估算场景。",
      unit: "%",
      howToFill: "按日粮或对应群体的口径填写。",
      caution: "不要把小数和百分数混用，例如 70% 不应写成 0.70 除非页面明确要求。",
    },
    {
      match: "头日数",
      title: "头日数",
      description:
        "头日数表示某一饲喂群体在核算期内累计的“在栏头数 × 天数”，是利用台账反推 DMI 的分母。",
      unit: "头·日",
      howToFill: "通常由群体在栏数量与日期自动计算得出。",
    },
    {
      match: "反推 DMI",
      title: "反推 DMI",
      description:
        "表示依据饲料台账数量、含水率和头日数自动反推出的单头日干物质采食量。",
      unit: "kg DM/头·日",
      howToFill: "优先用于有可靠出库台账的群体。",
      caution: "若台账不完整或饲喂群体分配不准，反推值会失真。",
    },
    {
      match: "台账方向",
      title: "台账方向",
      description:
        "用于说明该条饲料台账记录是入库还是出库。反推 DMI 时通常关注出库记录。",
      howToFill: "反推采食量时应重点维护出库数据。",
    },
    {
      match: "饲料名称",
      title: "饲料名称",
      description:
        "表示台账对应的饲料品类，用于追溯和核对饲料出入库记录。",
      howToFill: "尽量使用统一名称，避免同一种饲料出现多个写法。",
    },
    {
      match: "含水率（%）",
      title: "含水率",
      description:
        "表示该饲料中水分所占比例，用于将鲜重换算为干物质量。",
      unit: "%",
      howToFill: "填写水分口径下的含水率。",
      caution: "若手里是干物率，应先换算后再填，避免与含水率混淆。",
    },
    {
      match: "数量（吨）",
      title: "台账数量",
      description:
        "表示该条台账记录对应的饲料数量，用于后续折算干物质量和反推 DMI。",
      unit: "吨",
      howToFill: "应与实际台账单位一致。",
    },
    {
      match: "饲喂群体",
      title: "饲喂群体",
      description:
        "表示这条饲料记录实际对应的目标群体，用于把台账数据正确归集到具体动物群组。",
      howToFill: "应与上方养殖活动页中的群体定义一一对应。",
    },
  ],

  "/project/enteric": [
    {
      match: "活动数据收集方式",
      title: "活动数据收集方式",
      description:
        "用于说明本行 AP 是直接录入年平均存栏、按 12 个月自动平均，还是通过 NA × DA / 365 折算得到。",
      howToFill: "按该群体最可靠的数据来源选择。",
    },
    {
      match: "年平均存栏 AP（头/只）",
      title: "AP",
      description:
        "AP 表示核算年度内该群体的年平均在栏数量，是肠道发酵 CH₄ 年排放量计算的活动水平。",
      unit: "头或只",
      howToFill: "与养殖活动页保持一致。",
    },
    {
      match: "年度饲养量 NA（头/只）",
      title: "NA",
      description:
        "NA 表示核算年度内实际饲养或出栏的动物数量，用于短生长期动物折算年平均存栏。",
      unit: "头或只",
      howToFill: "一般与出栏/饲养周转口径一致。",
    },
    {
      match: "生长天数 DA（天）",
      title: "DA",
      description:
        "DA 表示单批或单头动物在核算体系中的生长或存活天数，用于 NA × DA / 365 折算 AP。",
      unit: "天",
      howToFill: "填平均生长天数或在栏天数。",
      caution: "不要把全年 365 天直接套给短生长期动物。",
    },
    {
      match: "排放因子获取方式",
      title: "排放因子获取方式",
      description:
        "用于指定 EF 是采用推荐因子法、公式计算法，还是实测/手工因子法。",
      howToFill: "如果已有可靠 DMI 和 Ym，可优先采用计算法。",
    },
    {
      match: "排放因子 EF（kg CH₄/头·年）",
      title: "EF",
      description:
        "EF 表示单头动物一年内因肠道发酵产生的甲烷量。",
      unit: "kg CH₄/头·年",
      howToFill: "可来自推荐因子、公式计算或实测值。",
      caution: "最常见错误是把日排放量误填成年排放因子。",
    },
    {
      match: "DMI（kg/头·天）",
      title: "DMI",
      description:
        "这里的 DMI 用于公式法计算肠道发酵排放因子，表示单头每日干物质采食量。",
      unit: "kg DM/头·日",
      howToFill: "优先同步养殖活动页已经形成的 DMI。",
      caution: "虽然标签里写的是 kg/头·天，本质上仍然是干物质量。",
    },
    {
      match: "Ym（%）",
      title: "Ym",
      description:
        "Ym 表示总能摄入中转化为甲烷能的比例，是公式法计算 EF 的关键系数。",
      unit: "%",
      howToFill: "可按标准默认值或表格匹配值带入，也可手工覆盖。",
      caution: "不要把 6.5% 写成 0.065，除非页面明确要求小数。",
    },
    {
      match: "自动计算 GE（MJ/头·天）",
      title: "GE",
      description:
        "GE 表示单头每日总能摄入量，页面会根据 DMI 和默认能量换算关系自动预览。",
      unit: "MJ/头·日",
      howToFill: "该值通常不需要手填，而是由公式自动计算。",
    },
    {
      match: "自动计算 EF（kg CH₄/头·年）",
      title: "自动计算 EF",
      description:
        "表示依据当前 DMI、Ym 等参数自动计算得到的肠道发酵排放因子预览值。",
      unit: "kg CH₄/头·年",
      howToFill: "用于核对公式法输入是否合理。",
    },
  ],

  "/project/manure-ch4": [
    {
      match: "区域化推荐因子（kg CH₄/头·年）",
      title: "区域化推荐因子",
      description:
        "表示在当前地区和区域组条件下，按推荐因子法直接采用的粪污管理 CH₄ 单头年排放因子。",
      unit: "kg CH₄/头·年",
      howToFill: "通常按表 C.7 带入，也可在有依据时手工覆盖。",
    },
    {
      match: "管理方式",
      title: "管理方式",
      description:
        "表示该路径下粪污的主要处理/贮存方式，例如固体贮存、液态贮存等。",
      howToFill: "按该群体实际占比最高或实际存在的路径填写。",
      caution: "名称要统一，便于不同项目之间对比和模板化。",
    },
    {
      match: "占比（%）",
      title: "管理方式占比",
      description:
        "表示该条粪污管理路径在本群体全部粪污中的分配比例。",
      unit: "%",
      howToFill: "同一群体所有路径占比合计应接近 100%。",
      caution: "不要漏填或让多条路径占比总和超过 100%。",
    },
    {
      match: "VS（kg/头·天）",
      title: "VS",
      description:
        "VS 表示单头动物每日排出的挥发性固体量，是参数法计算粪污 CH₄ 的核心输入之一。",
      unit: "kg VS/头·日",
      howToFill: "可依据标准默认值、模型估算值或实测值填写。",
    },
    {
      match: "B₀（m³/kg VS）",
      title: "B₀",
      description:
        "B₀ 表示单位挥发性固体理论最大产甲烷能力，是粪污 CH₄ 参数法中的关键因子。",
      unit: "m³ CH₄/kg VS",
      howToFill: "优先沿用标准默认值或对应畜种推荐值。",
    },
    {
      match: "MCF（%）",
      title: "MCF",
      description:
        "MCF 表示在特定粪污管理方式下，B₀ 实际转化为甲烷的比例。",
      unit: "%",
      howToFill: "应与管理方式、地区气候和标准默认值口径一致。",
      caution: "MCF 不是固定常数，不同路径不能随意共用同一个值。",
    },
  ],

  "/project/manure-n2o": [
    {
      match: "区域化推荐因子（kg N₂O/头·年）",
      title: "区域化推荐因子",
      description:
        "表示在当前地区和区域组条件下，按推荐因子法直接采用的粪污管理 N₂O 单头年排放因子。",
      unit: "kg N₂O/头·年",
      howToFill: "通常按表 C.10 带入，也可在有依据时手工覆盖。",
    },
    {
      match: "管理方式",
      title: "管理方式",
      description:
        "表示该条路径对应的粪污处理/贮存方式，是 EF3 和氮流向解释的基础。",
      howToFill: "按实际管理路径填写。",
    },
    {
      match: "占比（%）",
      title: "管理方式占比",
      description:
        "表示该管理路径承接的粪污氮或粪污量所占比例。",
      unit: "%",
      howToFill: "同一群体全部路径占比之和应接近 100%。",
    },
    {
      match: "Nex（kg N/头·年）",
      title: "Nex",
      description:
        "Nex 表示单头动物一年排泄的氮量，是粪污管理 N₂O 参数法计算的核心活动参数。",
      unit: "kg N/头·年",
      howToFill: "可采用标准默认值、模型估算值或实测/核算值。",
      caution: "不要把群体总氮排泄量误填到单头字段中。",
    },
    {
      match: "EF3（kg N₂O-N/kg N）",
      title: "EF3",
      description:
        "EF3 表示在特定粪污管理方式下，单位管理氮转化为 N₂O-N 的排放因子。",
      unit: "kg N₂O-N/kg N",
      howToFill: "应与管理方式和标准默认值口径一致。",
      caution: "注意 EF3 的结果单位是 N₂O-N，而不是直接的 N₂O。",
    },
  ],

  "/project/energy": [
    {
      match: "燃料种类",
      title: "燃料种类",
      description:
        "表示该条记录对应的能源品种，例如柴油、汽油、天然气、煤等。",
      howToFill: "尽量与模板名称或企业台账名称保持一致。",
    },
    {
      match: "消耗量",
      title: "燃料消耗量",
      description:
        "表示核算年度内该燃料实际消耗数量，是化石燃料 CO₂ 排放计算的起点。",
      howToFill: "按实际台账单位填写，并与低位发热量单位口径匹配。",
      caution: "单位不一致会直接导致结果偏大或偏小。",
    },
    {
      match: "低位发热量（常用 GJ/单位）",
      title: "低位发热量",
      description:
        "表示单位燃料完全燃烧时可释放的有效热值，页面会兼容常见 GJ/单位 和 TJ/单位口径。",
      unit: "常见为 GJ/单位，也可兼容 TJ/单位",
      howToFill: "优先采用标准值或企业固定能源参数库。",
    },
    {
      match: "单位热值含碳量（tC/TJ）",
      title: "单位热值含碳量",
      description:
        "表示每单位热值对应的碳含量，是燃料碳排放因子换算的重要参数。",
      unit: "tC/TJ",
      howToFill: "应与燃料种类匹配。",
    },
    {
      match: "氧化率（0–1）",
      title: "氧化率",
      description:
        "表示燃料中碳在燃烧过程中被氧化的比例，通常接近 1。",
      unit: "0 到 1 之间的小数",
      howToFill: "一般按标准默认值填写。",
      caution: "这里通常填小数，不是百分数。",
    },
    {
      match: "购入电力（MWh）",
      title: "购入电力",
      description:
        "表示年度内从外部购入并实际使用的电量。",
      unit: "MWh",
      howToFill: "与购电发票、电表或能源台账保持一致。",
    },
    {
      match: "购入电力排放因子（tCO₂/MWh）",
      title: "购入电力排放因子",
      description:
        "表示单位购入电量对应的 CO₂ 排放系数。",
      unit: "tCO₂/MWh",
      howToFill: "按所采用电网排放因子口径填写。",
    },
    {
      match: "购入热力（GJ）",
      title: "购入热力",
      description:
        "表示年度内从外部购入并使用的热力量。",
      unit: "GJ",
      howToFill: "应与热力结算或计量记录一致。",
    },
    {
      match: "购入热力排放因子（tCO₂/GJ）",
      title: "购入热力排放因子",
      description:
        "表示单位购入热力量对应的 CO₂ 排放系数。",
      unit: "tCO₂/GJ",
      howToFill: "按所采用热力来源口径填写。",
    },
    {
      match: "输出电力（MWh）",
      title: "输出电力",
      description:
        "表示年度内向外部输出或出售的电量，用于核算净购入排放。",
      unit: "MWh",
      howToFill: "按外供电量口径填写。",
    },
    {
      match: "输出电力排放因子（tCO₂/MWh）",
      title: "输出电力排放因子",
      description:
        "表示单位输出电量对应的 CO₂ 系数，用于折减净购入结果。",
      unit: "tCO₂/MWh",
      howToFill: "通常与购入电力排放因子口径保持一致。",
    },
    {
      match: "输出热力（GJ）",
      title: "输出热力",
      description:
        "表示年度内向外部输出或出售的热力量。",
      unit: "GJ",
      howToFill: "按外供热量口径填写。",
    },
    {
      match: "输出热力排放因子（tCO₂/GJ）",
      title: "输出热力排放因子",
      description:
        "表示单位输出热力量对应的 CO₂ 系数，用于折减净购入结果。",
      unit: "tCO₂/GJ",
      howToFill: "应与输出热力来源和核算口径一致。",
    },
  ],
};

export function getFieldHelpEntries(pathname: string): FieldHelpEntry[] {
  const routeKey = (Object.keys(FIELD_HELP_BY_ROUTE) as RoutePrefix[]).find(
    (prefix) => pathname.startsWith(prefix)
  );

  return routeKey ? FIELD_HELP_BY_ROUTE[routeKey] : [];
}