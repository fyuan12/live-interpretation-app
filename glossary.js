// LDS Terminology Glossary - English to Simplified Chinese
// This glossary ensures consistent translation of gospel terms

const LDS_GLOSSARY = [
    // Core Gospel Terms
    ["Heavenly Father", "天父"],
    ["Jesus Christ", "耶稣基督"],
    ["Holy Ghost", "圣灵"],
    ["Holy Spirit", "圣灵"],
    ["Godhead", "神组"],
    ["Atonement", "赎罪"],
    ["Savior", "救主"],
    ["Redeemer", "救赎主"],
    ["gospel", "福音"],
    ["salvation", "救恩"],
    ["exaltation", "超升"],
    ["eternal life", "永生"],
    ["immortality", "不死"],
    
    // Priesthood
    ["priesthood", "圣职"],
    ["Melchizedek Priesthood", "麦基洗德圣职"],
    ["Aaronic Priesthood", "亚伦圣职"],
    ["priesthood holder", "圣职持有人"],
    ["priesthood keys", "圣职权钥"],
    ["priesthood blessing", "圣职祝福"],
    ["ordain", "按立"],
    ["ordination", "按立"],
    
    // Church Leadership
    ["prophet", "先知"],
    ["apostle", "使徒"],
    ["Quorum of the Twelve", "十二使徒定额组"],
    ["First Presidency", "总会会长团"],
    ["General Authority", "总会持有权柄人员"],
    ["stake president", "支联会会长"],
    ["bishop", "主教"],
    ["bishopric", "主教团"],
    ["branch president", "分会会长"],
    ["patriarch", "教长"],
    ["patriarchal blessing", "教长祝福"],
    ["high priest", "大祭司"],
    ["elder", "长老"],
    ["seventy", "七十员"],
    
    // Organizations
    ["Relief Society", "慈助会"],
    ["Young Women", "女青年"],
    ["Young Men", "男青年"],
    ["Primary", "初级会"],
    ["Sunday School", "主日学"],
    ["elders quorum", "长老定额组"],
    ["ward", "支会"],
    ["stake", "支联会"],
    ["branch", "分会"],
    ["district", "分联会"],
    ["mission", "传道部"],
    
    // Ordinances
    ["ordinance", "教仪"],
    ["baptism", "洗礼"],
    ["baptize", "施洗"],
    ["confirmation", "证实"],
    ["sacrament", "圣餐"],
    ["endowment", "恩道门"],
    ["sealing", "印证"],
    ["temple sealing", "圣殿印证"],
    ["laying on of hands", "按手"],
    
    // Temple
    ["temple", "圣殿"],
    ["temple recommend", "圣殿推荐书"],
    ["temple worthy", "配称进入圣殿"],
    ["temple ordinances", "圣殿教仪"],
    ["baptism for the dead", "为死者洗礼"],
    ["proxy", "代理人"],
    ["celestial room", "高荣室"],
    
    // Scripture Terms
    ["scriptures", "经文"],
    ["Bible", "圣经"],
    ["Book of Mormon", "摩尔门经"],
    ["Doctrine and Covenants", "教义和圣约"],
    ["Pearl of Great Price", "无价珍珠"],
    ["standard works", "标准经典"],
    ["General Conference", "总会大会"],
    ["revelation", "启示"],
    ["testimony", "见证"],
    ["bear testimony", "作见证"],
    
    // Plan of Salvation
    ["plan of salvation", "救恩计划"],
    ["plan of happiness", "幸福计划"],
    ["premortal life", "前生"],
    ["pre-earth life", "前生"],
    ["mortal life", "今生"],
    ["spirit world", "灵的世界"],
    ["resurrection", "复活"],
    ["judgment", "审判"],
    ["celestial kingdom", "高荣国度"],
    ["terrestrial kingdom", "中荣国度"],
    ["telestial kingdom", "低荣国度"],
    ["outer darkness", "外层黑暗"],
    ["degrees of glory", "荣耀的国度"],
    
    // Principles and Doctrines
    ["faith", "信心"],
    ["repentance", "悔改"],
    ["baptism by immersion", "浸没洗礼"],
    ["gift of the Holy Ghost", "圣灵的恩赐"],
    ["endure to the end", "坚持到底"],
    ["agency", "选择权"],
    ["free agency", "自由选择权"],
    ["covenant", "圣约"],
    ["commandment", "诫命"],
    ["tithing", "什一奉献"],
    ["fast offering", "禁食捐献"],
    ["Word of Wisdom", "智慧语"],
    ["law of chastity", "贞洁律法"],
    ["Sabbath", "安息日"],
    ["Sabbath day", "安息日"],
    
    // Dispensations and Restoration
    ["dispensation", "福音期"],
    ["gospel dispensation", "福音期"],
    ["Restoration", "复兴"],
    ["restored gospel", "复兴的福音"],
    ["latter days", "后期时代"],
    ["latter-day", "后期"],
    ["Latter-day Saint", "后期圣徒"],
    ["First Vision", "第一次异象"],
    ["Joseph Smith", "约瑟·斯密"],
    ["golden plates", "金页片"],
    ["Moroni", "摩罗乃"],
    
    // Missionary Work
    ["missionary", "传教士"],
    ["missionary work", "传道事工"],
    ["full-time missionary", "全部时间传教士"],
    ["mission call", "传道召唤"],
    ["mission president", "传道部会长"],
    ["investigator", "慕道友"],
    ["convert", "归信者"],
    ["baptismal date", "洗礼日期"],
    
    // Family and Relationships
    ["eternal family", "永恒家庭"],
    ["eternal marriage", "永恒婚姻"],
    ["celestial marriage", "高荣婚姻"],
    ["family home evening", "家人家庭晚会"],
    ["family history", "家谱"],
    ["genealogy", "家谱"],
    
    // Common Phrases
    ["in the name of Jesus Christ", "奉耶稣基督的名"],
    ["amen", "阿们"],
    ["I know the Church is true", "我知道教会是真实的"],
    ["I bear my testimony", "我作我的见证"],
    ["by the power of the Holy Ghost", "借着圣灵的力量"],
    
    // Additional Terms
    ["calling", "召唤"],
    ["sustain", "支持"],
    ["release", "卸免"],
    ["set apart", "按手选派"],
    ["ward council", "支会议会"],
    ["home teaching", "家庭教导"],
    ["ministering", "施助"],
    ["visiting teaching", "探访教导"],
    ["worthiness", "配称"],
    ["worthy", "配称"],
    ["blessing", "祝福"],
    ["prayer", "祈祷"],
    ["fasting", "禁食"],
    ["consecration", "奉献"],
    ["Zion", "锡安"],
    ["worship", "崇拜"],
];

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LDS_GLOSSARY;
}
