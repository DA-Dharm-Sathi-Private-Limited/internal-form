// Master CP (Cost Price) Reference Database
export interface ProductCP {
  name: string;
  keywords: string[];
  defaultCp: number;
  prayosha?: number;
  krunal?: number;
  surya?: number;
  rudraRatan?: number;
}

export class ProductCPMaster {
  static items: ProductCP[] = [
    // --- Bracelets ---
    { name: 'Raw Pyrite Bracelet', keywords: ['raw pyrite', 'pyrite bracelet'], defaultCp: 120, prayosha: 120, krunal: 130, rudraRatan: 180 },
    { name: 'Polished Pyrite Bracelet', keywords: ['polished pyrite'], defaultCp: 150, prayosha: 150, krunal: 210, rudraRatan: 225 },
    { name: '7 Chakra Bracelet', keywords: ['7 chakra', 'seven chakra'], defaultCp: 125, prayosha: 125, krunal: 130, rudraRatan: 190 },
    { name: 'Amethyst Bracelet', keywords: ['amethyst bracelet'], defaultCp: 185, prayosha: 185, krunal: 185, rudraRatan: 280 },
    { name: 'Aquamarine Bracelet', keywords: ['aquamarine'], defaultCp: 140, prayosha: 140, krunal: 300, rudraRatan: 210 },
    { name: 'Black Tourmaline Bracelet', keywords: ['black tourmaline', 'tourmaline bracelet'], defaultCp: 150, prayosha: 150, krunal: 230, rudraRatan: 225 },
    { name: 'Sulemani Bracelet', keywords: ['sulemani', 'sulemani hakik'], defaultCp: 120, prayosha: 120, krunal: 120, rudraRatan: 180 },
    { name: 'Firoza Bracelet', keywords: ['firoza', 'turquoise'], defaultCp: 140, prayosha: 140, krunal: 150, rudraRatan: 210 },
    { name: "Cat's Eye Bracelet", keywords: ["cat's eye", 'cats eye', 'lahsuniya'], defaultCp: 215, prayosha: 215, krunal: 215, rudraRatan: 325 },
    { name: 'Clear Quartz Bracelet', keywords: ['clear quartz bracelet', 'sphatik bracelet'], defaultCp: 165, prayosha: 165, krunal: 165, rudraRatan: 250 },
    { name: 'Tiger Eye Bracelet', keywords: ['tiger eye'], defaultCp: 110, prayosha: 110, krunal: 110, rudraRatan: 165 },
    { name: 'Money Magnet Bracelet', keywords: ['money magnet'], defaultCp: 150, prayosha: 150, krunal: 150, rudraRatan: 225 },
    { name: 'Pyrite + Black Tourmaline Bracelet', keywords: ['pyrite + black tourmaline', 'pyrite black tourmaline'], defaultCp: 190, prayosha: 190, rudraRatan: 285 },
    { name: 'Citrine (Yellow) Bracelet', keywords: ['citrine', 'yellow citrine', 'sunela'], defaultCp: 130, prayosha: 130, krunal: 130, rudraRatan: 195 },
    { name: 'Red Jasper Bracelet', keywords: ['red jasper'], defaultCp: 120, prayosha: 120, krunal: 120, rudraRatan: 180 },
    { name: 'Lapis Lazuli Bracelet', keywords: ['lapis', 'lapis lazuli'], defaultCp: 200, prayosha: 200, krunal: 200, rudraRatan: 300 },
    { name: 'Green Aventurine Bracelet', keywords: ['green aventurine'], defaultCp: 120, prayosha: 120, krunal: 120, rudraRatan: 180 },
    { name: 'Sodalite Bracelet', keywords: ['sodalite'], defaultCp: 150, prayosha: 150, krunal: 150, rudraRatan: 225 },
    { name: 'Sunstone Bracelet', keywords: ['sunstone'], defaultCp: 235, prayosha: 235, krunal: 235, rudraRatan: 350 },
    { name: 'Moonstone Bracelet', keywords: ['moonstone'], defaultCp: 260, prayosha: 260, krunal: 260, rudraRatan: 390 },
    { name: 'Lava + 7 Chakra Bracelet', keywords: ['lava + 7 chakra', 'lava 7 chakra'], defaultCp: 85, prayosha: 85, krunal: 85, rudraRatan: 130 },
    { name: 'Dhanyog (Natural) Bracelet', keywords: ['dhanyog natural', 'dhanyog bracelet'], defaultCp: 140, prayosha: 140, krunal: 140, rudraRatan: 210 },
    { name: 'Dhanyog (Yellow Citrine) Bracelet', keywords: ['dhanyog citrine'], defaultCp: 130, prayosha: 130, krunal: 130, rudraRatan: 195 },
    { name: 'Clear Quartz + Rudraksha Bracelet', keywords: ['clear quartz + rudraksha'], defaultCp: 170, prayosha: 170, rudraRatan: 255 },
    { name: 'Pyrite + Rose Quartz Bracelet', keywords: ['pyrite + rose quartz'], defaultCp: 200, prayosha: 200, rudraRatan: 300 },
    { name: 'Natural Pyrite Anklet (2MM/3MM)', keywords: ['pyrite anklet'], defaultCp: 125, prayosha: 125, krunal: 125, rudraRatan: 190 },
    { name: 'Black Obsidian Bracelet', keywords: ['black obsidian', 'obsidian bracelet'], defaultCp: 115, prayosha: 115, krunal: 115, rudraRatan: 170 },
    { name: 'Carnelian Bracelet', keywords: ['carnelian bracelet'], defaultCp: 130, prayosha: 130, krunal: 130, rudraRatan: 195 },
    { name: 'Chips Bracelet', keywords: ['chips bracelet'], defaultCp: 130, krunal: 130, rudraRatan: 195 },
    { name: 'Evil Eye Bracelet', keywords: ['evil eye bracelet', 'nazar bracelet'], defaultCp: 132, prayosha: 132, krunal: 132, rudraRatan: 195 },
    { name: 'Green Jade Bracelet', keywords: ['green jade'], defaultCp: 120, prayosha: 120, krunal: 120, rudraRatan: 200 },
    { name: 'Hematite Bracelet', keywords: ['hematite'], defaultCp: 70, prayosha: 70, krunal: 70, rudraRatan: 105 },
    { name: 'Howlite Bracelet', keywords: ['howlite'], defaultCp: 125, prayosha: 125, krunal: 125, rudraRatan: 190 },
    { name: 'Kunzite Bracelet', keywords: ['kunzite'], defaultCp: 200, prayosha: 200, krunal: 200 },
    { name: 'Labradorite Bracelet', keywords: ['labradorite'], defaultCp: 300, prayosha: 300, krunal: 300, rudraRatan: 450 },
    { name: 'Malachite Natural Bracelet', keywords: ['malachite'], defaultCp: 700, prayosha: 700, krunal: 700, rudraRatan: 1000 },
    { name: 'Money Magnet Bracelet (Multi-Stone)', keywords: ['multi-stone money magnet'], defaultCp: 135, prayosha: 135, krunal: 135, rudraRatan: 200 },
    { name: 'Multi Flourite Bracelet', keywords: ['fluorite', 'flourite'], defaultCp: 180, prayosha: 180, krunal: 180, rudraRatan: 270 },
    { name: 'Om Mani Padhma Multi Bracelet', keywords: ['om mani padhma'], defaultCp: 150, prayosha: 150, krunal: 150, rudraRatan: 225 },
    { name: 'Peridot Hydro Bracelet', keywords: ['peridot'], defaultCp: 150, prayosha: 150, krunal: 150, rudraRatan: 225 },
    { name: 'Pixu Bracelet', keywords: ['pixu', 'pixiu'], defaultCp: 250, prayosha: 250, krunal: 250, rudraRatan: 375 },
    { name: 'Selenite Natural Bracelet', keywords: ['selenite bracelet'], defaultCp: 220, prayosha: 220, krunal: 220, rudraRatan: 330 },
    { name: 'Triple Protection Bracelet', keywords: ['triple protection'], defaultCp: 80, prayosha: 80, krunal: 80, rudraRatan: 120 },
    { name: 'Unakite Bracelet', keywords: ['unakite'], defaultCp: 125, prayosha: 125, krunal: 125, rudraRatan: 187.5 },
    { name: 'Yellow Calcite Bracelet', keywords: ['yellow calcite'], defaultCp: 100, prayosha: 100, krunal: 100, rudraRatan: 150 },
    { name: 'Golden Pyrite Bracelet', keywords: ['golden pyrite'], defaultCp: 70, prayosha: 70, krunal: 70, rudraRatan: 105 },
    { name: 'Opalite Bracelet', keywords: ['opalite'], defaultCp: 85, prayosha: 85, krunal: 85, rudraRatan: 130 },
    { name: 'Amazonite Bracelet', keywords: ['amazonite'], defaultCp: 310, prayosha: 310, krunal: 310, rudraRatan: 465 },
    { name: 'Smokey Quartz Bracelet', keywords: ['smokey quartz', 'smoky quartz'], defaultCp: 185, prayosha: 185, krunal: 185, rudraRatan: 280 },
    { name: 'Black Onyx Bracelet', keywords: ['black onyx'], defaultCp: 100, prayosha: 100, krunal: 100, rudraRatan: 150 },

    // --- Rudrakshas ---
    { name: '1-Mukhi Rudraksh (Indian)', keywords: ['1 mukhi indian', '1-mukhi indian', 'one mukhi indian'], defaultCp: 1100, surya: 1100, rudraRatan: 0 },
    { name: '1-Mukhi Rudraksh (Nepali)', keywords: ['1 mukhi nepali', '1-mukhi nepali', 'ek mukhi nepali'], defaultCp: 3100, surya: 3100, rudraRatan: 2500 },
    { name: '2-Mukhi Rudraksh (Indian)', keywords: ['2 mukhi indian', '2-mukhi indian'], defaultCp: 50, surya: 50, rudraRatan: 0 },
    { name: '2-Mukhi Rudraksh (Nepali)', keywords: ['2 mukhi nepali', '2-mukhi nepali'], defaultCp: 9000, surya: 9000, rudraRatan: 15000 },
    { name: '3-Mukhi Rudraksh (Indian)', keywords: ['3 mukhi indian', '3-mukhi indian'], defaultCp: 50, surya: 50, rudraRatan: 0 },
    { name: '3-Mukhi Rudraksh (Nepali)', keywords: ['3 mukhi nepali', '3-mukhi nepali', 'teen mukhi nepali'], defaultCp: 300, surya: 300, rudraRatan: 300 },
    { name: '4-Mukhi Rudraksh (Nepali)', keywords: ['4 mukhi nepali', '4-mukhi nepali', 'char mukhi'], defaultCp: 50, surya: 50, rudraRatan: 110 },
    { name: '5-Mukhi Rudraksh (Nepali)', keywords: ['5 mukhi nepali', '5-mukhi nepali', 'panch mukhi'], defaultCp: 50, surya: 50, rudraRatan: 110 },
    { name: '6-Mukhi Rudraksh (Nepali)', keywords: ['6 mukhi nepali', '6-mukhi nepali', 'che mukhi'], defaultCp: 60, surya: 60, rudraRatan: 110 },
    { name: '7-Mukhi Rudraksh (Nepali)', keywords: ['7 mukhi nepali', '7-mukhi nepali', 'saat mukhi'], defaultCp: 130, surya: 130, rudraRatan: 190 },
    { name: '8-Mukhi Rudraksh (Nepali)', keywords: ['8 mukhi nepali', '8-mukhi nepali', 'aath mukhi'], defaultCp: 1200, surya: 1200, rudraRatan: 1300 },
    { name: '9-Mukhi Rudraksh (Nepali)', keywords: ['9 mukhi nepali', '9-mukhi nepali', 'nau mukhi'], defaultCp: 1500, surya: 1500, rudraRatan: 2300 },
    { name: '10-Mukhi Rudraksh (Nepali)', keywords: ['10 mukhi nepali', '10-mukhi nepali', 'dus mukhi'], defaultCp: 1500, surya: 1500, rudraRatan: 1300 },
    { name: '11-Mukhi Rudraksh (Nepali)', keywords: ['11 mukhi nepali', '11-mukhi nepali', 'gyarah mukhi'], defaultCp: 1500, surya: 1500, rudraRatan: 1900 },
    { name: '12-Mukhi Rudraksh (Nepali)', keywords: ['12 mukhi nepali', '12-mukhi nepali', 'barah mukhi'], defaultCp: 2500, surya: 2500, rudraRatan: 2600 },
    { name: '13-Mukhi Rudraksh (Nepali)', keywords: ['13 mukhi nepali', '13-mukhi nepali', 'terah mukhi'], defaultCp: 3100, surya: 3100, rudraRatan: 3300 },
    { name: '14-Mukhi Rudraksh (Nepali)', keywords: ['14 mukhi nepali', '14-mukhi nepali', 'chaudah mukhi'], defaultCp: 18000, surya: 18000, rudraRatan: 18000 },
    { name: 'Garbh Gauri Rudraksh (Nepali)', keywords: ['garbh gauri'], defaultCp: 2500, surya: 2500 },
    { name: 'Gauri Shankar Rudraksh (Nepali)', keywords: ['gauri shankar'], defaultCp: 2500, surya: 2500 },
    { name: 'Ganesh Rudraksh (Nepali)', keywords: ['ganesh rudraksh'], defaultCp: 300, surya: 300 },

    // --- Malas ---
    { name: 'Rose Quartz Mala', keywords: ['rose quartz mala'], defaultCp: 260, prayosha: 550, krunal: 260, rudraRatan: 390 },
    { name: 'Amethyst Mala', keywords: ['amethyst mala'], defaultCp: 690, prayosha: 1100, krunal: 690, rudraRatan: 1035 },
    { name: 'Clear Quartz Mala', keywords: ['clear quartz mala', 'sphatik mala'], defaultCp: 680, prayosha: 850, krunal: 680, rudraRatan: 1020 },
    { name: '5 Mukhi Rudraksha Mala', keywords: ['5 mukhi rudraksha mala', 'rudraksha mala'], defaultCp: 220, prayosha: 250, krunal: 220, rudraRatan: 330 },
    { name: 'Karungli Mala', keywords: ['karungli mala', 'karungali'], defaultCp: 200, prayosha: 200, krunal: 220, rudraRatan: 330 },
    { name: 'Tulsi Mala', keywords: ['tulsi mala'], defaultCp: 220, krunal: 220, rudraRatan: 330 },
    { name: '7 Chakra Natural Mala', keywords: ['7 chakra mala', 'seven chakra mala'], defaultCp: 550, prayosha: 550, krunal: 640, rudraRatan: 960 },
    { name: 'Green Aventurine Mala', keywords: ['green aventurine mala'], defaultCp: 350, prayosha: 550, krunal: 350, rudraRatan: 525 },
    { name: 'Lapis Lazuli Mala', keywords: ['lapis lazuli mala'], defaultCp: 800, prayosha: 1400, krunal: 800, rudraRatan: 1200 },
    { name: 'Natural Citrine Mala', keywords: ['citrine mala'], defaultCp: 700, prayosha: 1000, krunal: 700, rudraRatan: 1500 },
    { name: 'Clear Quartz With Rudraksh Mala', keywords: ['clear quartz with rudraksh mala', 'sphatik rudraksh mala'], defaultCp: 470, prayosha: 750, krunal: 470, rudraRatan: 705 },
    { name: 'Pyrite Natural Mala', keywords: ['pyrite mala'], defaultCp: 460, prayosha: 900, krunal: 460, rudraRatan: 1500 },
    { name: 'Red Jasper Mala', keywords: ['red jasper mala'], defaultCp: 480, prayosha: 650, krunal: 480, rudraRatan: 720 },
    { name: 'Tiger Eye Mala', keywords: ['tiger eye mala'], defaultCp: 350, prayosha: 550, krunal: 350, rudraRatan: 750 },

    // --- Vastu / Frames / Pyramids / Trees / Coins ---
    { name: '7 Horses Frame', keywords: ['7 horses', 'seven horses'], defaultCp: 150, prayosha: 150, krunal: 160, rudraRatan: 240 },
    { name: 'Dhan Lakshmi Pyramid', keywords: ['dhan lakshmi pyramid'], defaultCp: 310, prayosha: 350, krunal: 310, rudraRatan: 465 },
    { name: 'Vyapar Vriddhi Frame', keywords: ['vyapar vriddhi frame'], defaultCp: 150, prayosha: 150, krunal: 160, rudraRatan: 240 },
    { name: 'Money Bowl', keywords: ['money bowl'], defaultCp: 400, prayosha: 400, krunal: 401, rudraRatan: 600 },
    { name: '7 Chakra Tree', keywords: ['7 chakra tree'], defaultCp: 150, prayosha: 280, krunal: 150 },
    { name: 'Rose Quartz Tree', keywords: ['rose quartz tree'], defaultCp: 400, krunal: 400 },
    { name: 'Rose Quartz Sphere', keywords: ['rose quartz sphere'], defaultCp: 350, prayosha: 350 },
    { name: 'Amethyst Sphere', keywords: ['amethyst sphere'], defaultCp: 350, prayosha: 350 },
    { name: 'Black Tourmaline Pyramid 70-75mm', keywords: ['black tourmaline pyramid'], defaultCp: 300, krunal: 300 },
    { name: 'Clear Quartz Pyramid 70-75mm', keywords: ['clear quartz pyramid'], defaultCp: 430, krunal: 430 },
    { name: 'Gomti Chakra Laxmi Orgone Pyramid', keywords: ['orgone pyramid', 'gomti chakra pyramid'], defaultCp: 350, prayosha: 350 },
    { name: 'Laxmi & Money Magnet Pyramid', keywords: ['laxmi money magnet pyramid'], defaultCp: 350, prayosha: 350 },
    { name: 'Money Magnet Pyramid', keywords: ['money magnet pyramid'], defaultCp: 350, prayosha: 350 },
    { name: 'Amethyst Chips Tree (300 Beads)', keywords: ['amethyst chips tree'], defaultCp: 160, prayosha: 280, krunal: 160 },
    { name: 'Gomti Chakra With Rudraksh Tree', keywords: ['gomti chakra tree'], defaultCp: 280, prayosha: 280, krunal: 850 },
    { name: 'Money Magnet Tree (300 Beads)', keywords: ['money magnet tree'], defaultCp: 280, prayosha: 280, krunal: 450 },
    { name: 'Natural Pyrite Chips Tree', keywords: ['pyrite tree', 'pyrite chips tree'], defaultCp: 280, prayosha: 280, krunal: 530 },
    { name: 'Shree Yantra Pyrite Frame', keywords: ['shree yantra pyrite frame', 'shree yantra frame'], defaultCp: 160, krunal: 160 },
    { name: 'Laxmiji And Kuber Key Pyrite Frame', keywords: ['kuber key frame', 'kuber frame'], defaultCp: 350, prayosha: 350, krunal: 525 },
    { name: 'Ganesh Mantra Pyrite Frame', keywords: ['ganesh mantra frame'], defaultCp: 200, krunal: 200 },
    { name: 'Panch Mukhiya Hanumanji Frame', keywords: ['hanumanji frame'], defaultCp: 200, krunal: 200 },
    { name: 'Peacock Pyrite Frame', keywords: ['peacock pyrite frame'], defaultCp: 300, prayosha: 350, krunal: 300 },
    { name: '7 House Pyrite Frame', keywords: ['7 house pyrite frame'], defaultCp: 160, prayosha: 280, krunal: 160 },
    { name: 'Manimagnet Vastu Fish', keywords: ['vastu fish'], defaultCp: 350, prayosha: 350 },
    { name: 'Organ Selenite Bowl', keywords: ['selenite bowl'], defaultCp: 350, prayosha: 350 },
    { name: 'Selenite Plate 3in Inch', keywords: ['selenite plate'], defaultCp: 160, prayosha: 280, krunal: 160 },
    { name: 'Vyapar Vriddhi Yantra Plate', keywords: ['vyapar vriddhi yantra plate'], defaultCp: 170, krunal: 170 },
    { name: 'Amethyst Tumble Stone', keywords: ['amethyst tumble'], defaultCp: 350, prayosha: 350, krunal: 940 },
    { name: 'Clear Quartz Tumble Stone', keywords: ['clear quartz tumble'], defaultCp: 1240, krunal: 1240 },
    { name: 'Labradorite Tumble Stone', keywords: ['labradorite tumble'], defaultCp: 350, prayosha: 350, krunal: 840 },
    { name: 'Pyrite Tumble Stone', keywords: ['pyrite tumble'], defaultCp: 350, prayosha: 350, krunal: 990 },
    { name: 'Rainbow Moonstone Tumble Stone', keywords: ['moonstone tumble'], defaultCp: 80, prayosha: 80, krunal: 890 },
    { name: 'Rose Quartz Tumble Stone', keywords: ['rose quartz tumble'], defaultCp: 50, prayosha: 50, krunal: 640 },
    { name: 'Tiger Eye Tumble Stone', keywords: ['tiger eye tumble'], defaultCp: 50, prayosha: 50, krunal: 950 },
    { name: 'Black Agate Protection Coin', keywords: ['black agate coin', 'protection coin'], defaultCp: 100, prayosha: 100 },
    { name: 'Black Agate Success Coin', keywords: ['success coin'], defaultCp: 100, prayosha: 100, krunal: 150 },
    { name: 'Ganesh Coin', keywords: ['ganesh coin'], defaultCp: 100, prayosha: 100 },
    { name: 'Green Jade Ganesh Coin', keywords: ['green jade ganesh coin'], defaultCp: 80, prayosha: 80 },
    { name: 'Green Jade Laxmi Coin', keywords: ['green jade laxmi coin'], defaultCp: 100, prayosha: 100 },
    { name: 'Green Jade Zibu Coin', keywords: ['zibu coin'], defaultCp: 80, prayosha: 80 },
    { name: 'Pyrite Laxmi & Zibu Engraved Coin', keywords: ['pyrite zibu coin', 'pyrite laxmi coin'], defaultCp: 200, prayosha: 200 },
    { name: 'Pyrite Natural Laxmi Coin', keywords: ['pyrite laxmi coin'], defaultCp: 100, prayosha: 100 },
    { name: 'Pyrite Natural Zibu Coin', keywords: ['pyrite zibu coin'], defaultCp: 100, prayosha: 100 },
    { name: 'Rose Quartz Zibu Coin', keywords: ['rose quartz zibu coin'], defaultCp: 80, prayosha: 80 },
    { name: 'Yellow Jade Health Coin', keywords: ['health coin'], defaultCp: 100, prayosha: 100 },
    { name: '7 Chakra Tumble With Evil Eyes Hanging', keywords: ['7 chakra hanging'], defaultCp: 280, prayosha: 280, krunal: 300 },
    { name: 'Pyrite And Evil Eyes Hanging', keywords: ['pyrite evil eye hanging'], defaultCp: 160, prayosha: 200, krunal: 160 },
    { name: 'Pyrite Small Cluster Hanging', keywords: ['pyrite cluster hanging'], defaultCp: 200, prayosha: 200 },
    { name: 'Raw Pyrite Hanging', keywords: ['raw pyrite hanging'], defaultCp: 180, prayosha: 180, krunal: 270 },
    { name: 'Selenite And Black Stone Hanging', keywords: ['selenite hanging'], defaultCp: 100, prayosha: 100, krunal: 150 },
    { name: 'SP Pencil Pendant', keywords: ['pencil pendant'], defaultCp: 60, prayosha: 60 },
    { name: 'Pyrite Natural Polished Ring', keywords: ['pyrite ring'], defaultCp: 150, prayosha: 150, krunal: 330 },
    { name: 'Om Pyrite Keychain', keywords: ['pyrite keychain'], defaultCp: 150, prayosha: 150 },
    { name: '7 Chakra Healing Stone Oval Shape Set', keywords: ['7 chakra oval set'], defaultCp: 280, prayosha: 280, krunal: 450 },
    { name: 'Pyrite Swastik', keywords: ['pyrite swastik'], defaultCp: 180, prayosha: 180, krunal: 330 },
    { name: 'Angels 2in Inch', keywords: ['angel stone', '2in angel'], defaultCp: 280, prayosha: 280 },
    { name: 'Money Magnet And All Stone Turtle', keywords: ['stone turtle'], defaultCp: 280, prayosha: 280 }
  ];

  /**
   * Search for product CP by product name or item prompt text.
   * Accepts optional vendor: 'prayosha' | 'krunal' | 'surya' | 'rudraRatan'
   */
  static getCostPrice(prodName: string, salesPrice: number = 0, vendor?: string): number {
    if (!prodName) return salesPrice ? Math.round(salesPrice * 0.4) : 150;
    const clean = prodName.toLowerCase().trim();

    let matchedItem: ProductCP | null = null;

    // 1. Direct Keyword / Name Match
    for (const item of ProductCPMaster.items) {
      if (item.name.toLowerCase() === clean) {
        matchedItem = item;
        break;
      }
      for (const kw of item.keywords) {
        if (clean.includes(kw.toLowerCase())) {
          matchedItem = item;
          break;
        }
      }
      if (matchedItem) break;
    }

    if (matchedItem) {
      if (vendor) {
        const vLower = vendor.toLowerCase();
        if (vLower.includes('prayosha') && matchedItem.prayosha) return matchedItem.prayosha;
        if (vLower.includes('krunal') && matchedItem.krunal) return matchedItem.krunal;
        if (vLower.includes('surya') && matchedItem.surya) return matchedItem.surya;
        if ((vLower.includes('rudra') || vLower.includes('ratan')) && matchedItem.rudraRatan) return matchedItem.rudraRatan;
      }
      return matchedItem.defaultCp;
    }

    // 2. Fallback category matching
    if (/rudraksh|mukhi|tulsi|mala/i.test(clean)) {
      if (/1\s*mukhi|ek\s*mukhi/i.test(clean)) return 1100;
      if (/2\s*mukhi|do\s*mukhi/i.test(clean)) return 9000;
      if (/3\s*mukhi/i.test(clean)) return 300;
      if (/4\s*mukhi/i.test(clean)) return 50;
      if (/5\s*mukhi/i.test(clean)) return 50;
      if (/6\s*mukhi/i.test(clean)) return 60;
      if (/7\s*mukhi/i.test(clean)) return 130;
      if (/8\s*mukhi/i.test(clean)) return 1200;
      if (/9\s*mukhi/i.test(clean)) return 1500;
      if (/10\s*mukhi/i.test(clean)) return 1500;
      if (/11\s*mukhi/i.test(clean)) return 1500;
      if (/12\s*mukhi/i.test(clean)) return 2500;
      if (/13\s*mukhi/i.test(clean)) return 3100;
      if (/14\s*mukhi/i.test(clean)) return 18000;
      return 220;
    }

    if (/pyrite/i.test(clean)) return 120;
    if (/tourmaline/i.test(clean)) return 150;
    if (/amethyst/i.test(clean)) return 185;
    if (/citrine/i.test(clean)) return 130;
    if (/sphatik|quartz/i.test(clean)) return 165;
    if (/cat'?s\s*eye/i.test(clean)) return 215;
    if (/tiger\s*eye/i.test(clean)) return 110;
    if (/rose\s*quartz/i.test(clean)) return 145;
    if (/green\s*aventurine/i.test(clean)) return 120;
    if (/lapis/i.test(clean)) return 200;

    // 3. Fallback to 40% of sales price
    return salesPrice ? Math.round(salesPrice * 0.4) : 150;
  }
}
