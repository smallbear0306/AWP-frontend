// 分类图标映射（Element Plus 图标名，全局已注册，可 <component :is="名"/>）

// 一级分类名 → 图标
const L1 = {
  食品酒水: 'Food', 衣服饰品: 'ShoppingBag', 居家物业: 'House', 行车交通: 'Van',
  交流通讯: 'Cellphone', 休闲娱乐: 'Basketball', 学习培训: 'Reading', 人情往来: 'Present',
  医疗保健: 'FirstAidKit', 金融保险: 'Money', 其他杂项: 'More',
  职业收入: 'Briefcase', 投资盈利: 'TrendCharts', 五险收入: 'Umbrella', 其他收入: 'Coin',
}

// 二级分类按关键词匹配（命中第一个包含的关键词）
const L2 = [
  ['早餐', 'Bowl'], ['午餐', 'Bowl'], ['晚餐', 'Bowl'], ['三餐', 'Bowl'], ['聚餐', 'Bowl'], ['聚会', 'Bowl'],
  ['食材', 'Chicken'], ['零食', 'Dessert'], ['水果', 'Apple'], ['茶水', 'Coffee'], ['酒水', 'Goblet'],
  ['内衣', 'ShoppingBag'], ['上衣', 'ShoppingBag'], ['裤子', 'ShoppingBag'], ['外套', 'ShoppingBag'],
  ['鞋', 'ShoppingBag'], ['帽', 'ShoppingBag'], ['包', 'Handbag'], ['饰品', 'StarFilled'], ['化妆', 'MagicStick'],
  ['生活用品', 'Goods'], ['床上', 'House'], ['办公', 'Document'], ['水电', 'Lightning'], ['煤气', 'Lightning'],
  ['房屋', 'House'], ['租赁', 'House'], ['物业', 'OfficeBuilding'], ['维修', 'Tools'], ['保养', 'Tools'],
  ['单车', 'Bicycle'], ['公共交通', 'Van'], ['私家车', 'Van'], ['油费', 'Van'], ['充电', 'Lightning'],
  ['停车', 'Van'], ['城际', 'Ship'],
  ['手机', 'Cellphone'], ['上网', 'Connection'], ['宽带', 'Connection'], ['邮寄', 'Postcard'],
  ['运动', 'Basketball'], ['健身', 'Basketball'], ['旅游', 'Suitcase'], ['度假', 'Suitcase'],
  ['休闲', 'Football'], ['玩乐', 'Football'], ['宠物', 'Star'], ['电影', 'Film'], ['演出', 'Film'],
  ['学习', 'Reading'], ['书报', 'Notebook'], ['杂志', 'Notebook'], ['数码', 'Monitor'], ['装备', 'Monitor'], ['课程', 'EditPen'],
  ['送礼', 'Present'], ['请客', 'Present'], ['孝敬', 'Present'], ['还人', 'Money'], ['慈善', 'Present'], ['捐', 'Present'],
  ['药', 'FirstAidKit'], ['体检', 'FirstAidKit'], ['保健', 'FirstAidKit'], ['治疗', 'FirstAidKit'], ['牙', 'FirstAidKit'], ['美容', 'MagicStick'],
  ['社保', 'Umbrella'], ['保险', 'Umbrella'], ['贷款', 'Money'], ['手续', 'Money'], ['个税', 'Coin'], ['利息', 'Coin'],
  ['工资', 'Money'], ['加班', 'Money'], ['奖金', 'Coin'], ['项目', 'Briefcase'], ['兼职', 'Briefcase'], ['经营', 'TrendCharts'],
  ['投资', 'TrendCharts'], ['房租', 'House'], ['理财', 'TrendCharts'],
  ['单位缴费', 'Umbrella'], ['个人缴费', 'Umbrella'],
  ['中奖', 'Trophy'], ['意外', 'Coin'], ['退款', 'Coin'], ['礼金', 'Wallet'], ['红包', 'Wallet'],
]

/** 一级分类图标 */
export function l1Icon(name) {
  return L1[name] || 'CollectionTag'
}

/**
 * 取分类图标。优先按二级名关键词匹配；匹配不到则用一级图标；都没有则默认。
 * @param {string} name 分类名(通常二级)
 * @param {string} [parentName] 一级名(兜底)
 */
export function categoryIcon(name, parentName) {
  if (name) {
    for (const [kw, icon] of L2) {
      if (name.includes(kw)) return icon
    }
    if (L1[name]) return L1[name]
  }
  if (parentName && L1[parentName]) return L1[parentName]
  return 'CollectionTag'
}
