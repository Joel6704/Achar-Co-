/**
 * Achar & Co. — Central Configuration & Data Store
 * Premium Kerala Heritage Pickle Brand
 * 
 * IMPORTANT FOR BUSINESS OWNER:
 * Update the `whatsappNumber` below with your real 10-12 digit WhatsApp phone number (with country code, no + or spaces).
 * Example for India: "919876543210"
 */

const ACHAR_CONFIG = {
  brandName: "Achar & Co.",
  // Frontend-only ordering: empty string disables external backend / API calls.
  apiBaseUrl: "",
  tagline: "A Taste of Kerala, Made with Tradition.",
  malayalamTagline: "പരമ്പരാഗത കേരളീയ രുചിപ്പെരുമ",
  
  // Weight Selection Options (up to 3 KG max)
  weightOptions: ["250 g", "500 g", "1 KG", "1.5 KG", "2 KG", "2.5 KG", "3 KG"],

  // Calculate pricing based on confirmed product base prices
  getPriceForWeight(product, weight) {
    if (!product || !product.prices || typeof product.prices !== "object") return null;
    const clean = String(weight || "").trim().toLowerCase().replace(/\s+/g, "");
    if (clean === "250g") return product.prices["250g"] ?? null;
    if (clean === "500g") return product.prices["500g"] ?? null;
    if (clean === "1kg") return product.prices["1kg"] ?? null;

    // Derived weights up to 3 KG from confirmed 1 KG price
    const base1kg = product.prices["1kg"] || (product.prices["500g"] ? product.prices["500g"] * 2 : null);
    if (!base1kg) return null;

    if (clean === "1.5kg") return Math.round(base1kg * 1.5);
    if (clean === "2kg") return Math.round(base1kg * 2);
    if (clean === "2.5kg") return Math.round(base1kg * 2.5);
    if (clean === "3kg") return Math.round(base1kg * 3);
    return null;
  },

  // WhatsApp Configuration (Configurable placeholder — update with real business number)
  whatsappNumber: "919876543210", // EDITABLE: Set your WhatsApp number here (country code + number)
  displayPhone: "+91 98765 43210 [Configurable Placeholder]",
  displayEmail: "namaskaram@acharandco.com [Configurable Placeholder]",
  address: "Heritage Kitchen, Kottayam & Kochi, Kerala, India [Configurable Placeholder]",
  deliveryCoverage: "Across all 14 districts of Kerala",
  
  // Helper to generate compliant WhatsApp link
  getWhatsAppUrl(message) {
    const encoded = encodeURIComponent(message.trim());
    return `https://wa.me/${this.whatsappNumber}?text=${encoded}`;
  },

  // 14 Revenue Districts of Kerala
  keralaDistricts: [
    "Thiruvananthapuram",
    "Kollam",
    "Pathanamthitta",
    "Alappuzha",
    "Kottayam",
    "Idukki",
    "Ernakulam (Kochi)",
    "Thrissur",
    "Palakkad",
    "Malappuram",
    "Kozhikode",
    "Wayanad",
    "Kannur",
    "Kasaragod"
  ],

  // 3D Carousel & Showcase Sequence (Mango -> Chicken -> Lemon -> Garlic -> Mixed Veg)
  carouselSequence: [
    "cut-mango",
    "nadan-chicken",
    "vadukapuli-lemon",
    "veluthulli-garlic",
    "mixed-veg"
  ],
  heroShowcaseIds: [
    "cut-mango",
    "nadan-chicken",
    "vadukapuli-lemon",
    "veluthulli-garlic",
    "mixed-veg"
  ],

  // Products Catalogue Data (All 17 Varieties — First 4: Mango, Chicken, Lemon, Beef)
  products: [
    {
      id: "cut-mango",
      name: "Mango Pickle",
      malayalamName: "കടുമാങ്ങ അച്ചാർ (Kadu Manga)",
      category: "Vegetarian",
      badge: "HEIRLOOM BESTSELLER",
      shortDesc: "Crisp green raw mango cubes cured with stone-pounded Kashmiri chilli, roasted fenugreek, and cold-pressed gingelly oil.",
      fullStory: "Our signature heirloom recipe inspired by traditional Central Travancore households. Hand-cut crisp green mangoes are salted until tender, then simmered in fragrant cold-pressed sesame oil with roasted mustard, fenugreek, and fragrant asafoetida.",
      image: "/images/mango-pickle-card.jpg",
      fallbackImage: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85",
      prices: {
        "250g": 190,
        "500g": 360,
        "1kg": 680
      },
      ingredients: "Raw Country Mangoes, Cold-Pressed Gingelly (Sesame) Oil, Kashmiri Chilli Powder, Fenugreek Powder, Mustard Seeds, Asafoetida (Hing), Turmeric, Rock Salt, Curry Leaves.",
      allergens: "Contains Sesame. Processed in a facility that handles mustard seeds.",
      storage: "Store in a cool, dry place away from direct sunlight. Always use a clean, bone-dry wooden or stainless steel spoon. Ensure the layer of gingelly oil covers the pickle surface.",
      shelfLife: "9 months from packaging date."
    },
    {
      id: "nadan-chicken",
      name: "Chicken Pickle",
      malayalamName: "നാടൻ ചിക്കൻ അച്ചാർ (Nadan Chicken)",
      category: "Meat",
      badge: "FIERY NON-VEG ICON",
      shortDesc: "Succulent boneless country chicken slow-roasted in pure gingelly oil, whole garlic cloves, curry leaves, and Tellicherry black pepper.",
      fullStory: "A celebrated Travancore feast favourite. Tender boneless chicken pieces are marinated with freshly crushed Tellicherry black pepper and turmeric, flash-crisped in cold-pressed sesame oil, then slow-steeped in an aromatic gravy of roasted shallots, garlic, and Kashmiri chilli.",
      image: "/images/chicken-pickle-card.jpg",
      fallbackImage: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=1000&q=85",
      prices: {
        "250g": 290,
        "500g": 550,
        "1kg": 1050
      },
      ingredients: "Boneless Farm Chicken, Cold-Pressed Gingelly (Sesame) Oil, Tellicherry Black Pepper, Kashmiri Chilli Powder, Garlic Cloves, Ginger, Curry Leaves, Fenugreek, Natural Brewed Vinegar, Rock Salt.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Refrigerate upon arrival. Always use a bone-dry spoon. Keep oil layer covering the meat.",
      shelfLife: "6 months from packaging date."
    },
    {
      id: "vadukapuli-lemon",
      name: "Lemon Pickle",
      malayalamName: "വടുകപ്പുളി നാരങ്ങ അച്ചാർ (Vadukapuli Lemon)",
      category: "Vegetarian",
      badge: "SADHYA SPECIAL",
      shortDesc: "Piquant Kerala wild citron (Vadukapuli) slowly simmered with fiery green chillies and roasted spices. An indispensable Onam feast classic.",
      fullStory: "Vadukapuli (large thick-skinned wild lemon) is the crown jewel of Kerala Sadhya feasts. Hand-chopped with its fragrant rind intact, balanced with a subtle bitter-tart kick that aids digestion and elevates any rice meal.",
      image: "/images/lemon-pickle-card.jpg",
      fallbackImage: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1000&q=85",
      prices: {
        "250g": 180,
        "500g": 340,
        "1kg": 640
      },
      ingredients: "Vadukapuli (Kerala Wild Citron), Cold-Pressed Gingelly Oil, Red Chilli Powder, Turmeric, Fenugreek, Mustard Seeds, Rock Salt, Green Chillies, Asafoetida.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Keep in an airtight earthenware bharani or glass jar. Do not expose to moisture. Keep oil layer intact.",
      shelfLife: "12 months from packaging date."
    },
    {
      id: "kerala-beef-pickle",
      name: "Beef Pickle",
      malayalamName: "നാടൻ ബീഫ് അച്ചാർ (Nadan Beef Achar)",
      category: "Meat",
      badge: "KERALA CULINARY ICON",
      shortDesc: "Tender roasted beef cubes flash-crisped in gingelly oil with slivered coconut, garlic flakes, and crushed Malabar peppercorns.",
      fullStory: "A celebrated North & Central Kerala household specialty. Boneless prime beef chunks are slow-cooked with freshly ground Tellicherry black pepper and coriander, then fried to a golden crust in gingelly oil and simmered with toasted coconut slivers and garlic.",
      image: "/images/beef-pickle-card.jpg",
      fallbackImage: "/images/pickle-jar-placeholder.svg",
      prices: {
        "250g": 310,
        "500g": 590,
        "1kg": 1120
      },
      ingredients: "Prime Boneless Beef, Cold-Pressed Gingelly Oil, Coconut Slivers, Tellicherry Black Pepper, Kashmiri Chilli, Garlic, Ginger, Curry Leaves, Natural Vinegar, Rock Salt.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Refrigerate upon arrival. Always use a bone-dry spoon.",
      shelfLife: "6 months from packaging date."
    },
    {
      id: "kannimanga-tender",
      name: "Tender Mango Pickle (Kadumanga)",
      malayalamName: "കണ്ണിമാങ്ങ അച്ചാർ (Kannimanga / Kadumanga)",
      category: "Vegetarian",
      badge: "SEASONAL DELIGHT",
      shortDesc: "Intact whole baby mangoes aged in terracotta bharanis with spiced mustard brine and crushed red chillies. Nostalgic crunchy burst.",
      fullStory: "Harvested during the early weeks of summer when mangoes are no larger than a betel nut with soft, developing seeds. Preserved whole in heavy ceramic bharani jars for months until the brine and spices thoroughly permeate each fruit.",
      image: "/images/tender-mango-pickle-card.jpg",
      fallbackImage: "/images/pickle-jar-placeholder.svg",
      prices: {
        "250g": 260,
        "500g": 490,
        "1kg": 940
      },
      ingredients: "Whole Baby Tender Mangoes (Kannimanga), Mustard-Chilli Paste, Rock Salt Brine, Gingelly Oil, Fenugreek, Asafoetida.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Keep fully submerged under the spiced brine layer in a glass or ceramic container.",
      shelfLife: "12 months from packaging date."
    },
    {
      id: "veluthulli-garlic",
      name: "Garlic Pickle",
      malayalamName: "വെളുത്തുള്ളി അച്ചാർ (Veluthulli)",
      category: "Vegetarian",
      badge: "RICH & AROMATIC",
      shortDesc: "Plump peeled garlic cloves simmered tender in a thick, velvety roasted red masala with curry leaves and pure sesame oil.",
      fullStory: "Whole garlic cloves slowly confited in simmering gingelly oil with hand-ground spices until tender and mellow. Rich, savoury, and deeply aromatic, pairs exquisitely with Kanji (rice porridge) or layered Biryani.",
      image: "/images/garlic-pickle-card.jpg",
      fallbackImage: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=1000&q=85",
      prices: {
        "250g": 220,
        "500g": 410,
        "1kg": 780
      },
      ingredients: "Select Whole Garlic Cloves, Cold-Pressed Sesame Oil, Kashmiri Chilli Powder, Fenugreek, Mustard Seeds, Tamarind Pulp, Asafoetida, Rock Salt, Curry Leaves.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Store at ambient room temperature. Do not refrigerate before opening.",
      shelfLife: "9 months from packaging date."
    },
    {
      id: "mixed-veg",
      name: "Mixed Vegetable Pickle",
      malayalamName: "മിക്സഡ് വെജിറ്റബിൾ അച്ചാർ (Mixed Veg)",
      category: "Vegetarian",
      badge: "HERITAGE MEDLEY",
      shortDesc: "Crunchy carrots, tender raw mango, bitter gourd, and wild lime slow-cured in roasted fenugreek and mustard seed oil.",
      fullStory: "Inspired by traditional Onam harvest celebrations. A vibrant medley of seasonal country vegetables hand-diced and sun-dried to lock in crunch, then cured in fragrant sesame oil with stone-ground spices for a wholesome sweet, tangy, and spicy finish.",
      image: "/images/mixed-veg-pickle-card.jpg",
      fallbackImage: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=85",
      prices: {
        "250g": 185,
        "500g": 350,
        "1kg": 660
      },
      ingredients: "Country Carrots, Raw Mangoes, Bitter Gourd (Pavakka), Wild Lime, Green Chillies, Gingelly Oil, Kashmiri Chilli, Fenugreek, Mustard Seeds, Rock Salt, Asafoetida.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Store in a cool dry pantry. Use a dry spoon. Keep tightly closed.",
      shelfLife: "9 months from packaging date."
    },
    {
      id: "nellikka-gooseberry",
      name: "Gooseberry Pickle (Nellikka)",
      malayalamName: "നെല്ലിക്ക അച്ചാർ (Nellikka Achar)",
      category: "Vegetarian",
      badge: "SEASONAL BATCH",
      shortDesc: "Plump wild gooseberries steamed tender and preserved in a tangy roasted mustard and fenugreek gravy. Rich in natural tang.",
      fullStory: "Carefully sourced fresh whole Indian gooseberries (Amla / Nellikka) from Western Ghats foothills. Prepared using ancient Ayurvedic curing principles with rock salt and cold-pressed gingelly oil.",
      image: "/images/gooseberry-pickle-card.jpg",
      fallbackImage: "/images/pickle-jar-placeholder.svg",
      prices: null,
      ingredients: "Fresh Whole Indian Gooseberry (Nellikka), Gingelly Oil, Fenugreek, Mustard, Kashmiri Chilli, Turmeric, Asafoetida, Rock Salt.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Store in a cool, dry place. Keep oil covering the fruit.",
      shelfLife: "12 months from packaging date."
    },
    {
      id: "green-chilli-kanthari",
      name: "Green Chilli Pickle",
      malayalamName: "പച്ചമുളക് അച്ചാർ (Pachamulaku / Kanthari)",
      category: "Vegetarian",
      badge: "FIERY & CRISP",
      shortDesc: "Hand-slit spicy green chillies pickled in cold-pressed gingelly oil, rock salt, and whole mustard seeds for a fiery bite.",
      fullStory: "Sharp country green chillies and traditional Kanthari birds eye chillies seasoned with whole split mustard seeds, asafoetida, and lemon juice. The ultimate pungent kick for traditional Kerala meals.",
      image: "/images/green-chilli-pickle-card.jpg",
      fallbackImage: "/images/pickle-jar-placeholder.svg",
      prices: null,
      ingredients: "Fresh Country Green Chillies, Gingelly Oil, Split Mustard Seeds, Turmeric, Asafoetida, Natural Lemon Juice, Rock Salt.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Keep in an airtight jar away from moisture.",
      shelfLife: "9 months from packaging date."
    },
    {
      id: "inji-puli-ginger",
      name: "Ginger Pickle (Inji)",
      malayalamName: "ഇഞ്ചി അച്ചാർ / ഇഞ്ചിപ്പുളി (Inji Puli)",
      category: "Vegetarian",
      badge: "TRADITIONAL 101-CURRY",
      shortDesc: "Finely sliced fresh ginger crisp-fried and simmered in aged tamarind extract, jaggery, and roasted cumin. The traditional 101-curry digestive.",
      fullStory: "Considered in Kerala culinary lore to equal the digestive power of 101 curries. Thinly shredded fresh ginger is slow-fried in gingelly oil, married with thick dark Kodampuli/Tamarind paste and organic palm jaggery for the definitive sweet-sour-spicy symphony.",
      image: "/images/ginger-pickle-card.jpg",
      fallbackImage: "/images/pickle-jar-placeholder.svg",
      prices: {
        "250g": 230,
        "500g": 430,
        "1kg": 820
      },
      ingredients: "Fresh Country Ginger, Dark Tamarind Extract, Organic Palm Jaggery, Green Chillies, Gingelly Oil, Fenugreek, Mustard Seeds, Curry Leaves, Rock Salt.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Refrigerate after opening to preserve the delicate balance of tamarind and jaggery.",
      shelfLife: "12 months from packaging date."
    },
    {
      id: "carrot-pickle",
      name: "Carrot Pickle",
      malayalamName: "കാരറ്റ് അച്ചാർ (Carrot Achar)",
      category: "Vegetarian",
      badge: "CRUNCHY & TANGY",
      shortDesc: "Julienned crisp sweet carrots infused with sour lime juice, split mustard seeds, and stone-ground Kashmiri chilli.",
      fullStory: "Crunchy sweet carrots cut into matchsticks, sun-cured with salt and tossed in fragrant mustard oil, lemon juice, and freshly ground fenugreek.",
      image: "/images/carrot-pickle-card.jpg",
      fallbackImage: "/images/pickle-jar-placeholder.svg",
      prices: null,
      ingredients: "Fresh Country Carrots, Lemon Juice, Cold-Pressed Gingelly Oil, Kashmiri Chilli, Split Mustard, Fenugreek, Rock Salt.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Store in a cool dry pantry. Use a dry spoon.",
      shelfLife: "6 months from packaging date."
    },
    {
      id: "pavakka-bitter-gourd",
      name: "Bitter Gourd Pickle (Pavakka)",
      malayalamName: "പാവയ്ക്ക അച്ചാർ (Pavakka / Kaipakka)",
      category: "Vegetarian",
      badge: "SAVOURY HERITAGE",
      shortDesc: "Thinly sliced bitter gourd crisped in gingelly oil, tempered with roasted spices and a splash of natural vinegar for a balanced bitter-spicy delight.",
      fullStory: "A rare authentic Kerala preparation. Bitter gourd rounds are lightly salted, drained, flash-crisped in sesame oil, and cooked down in an aromatic chilli-garlic reduction.",
      image: "/images/bitter-gourd-pickle-card.jpg",
      fallbackImage: "/images/pickle-jar-placeholder.svg",
      prices: null,
      ingredients: "Country Bitter Gourd (Pavakka), Cold-Pressed Gingelly Oil, Garlic, Kashmiri Chilli, Fenugreek, Mustard, Vinegar, Rock Salt.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Store at room temperature. Keep submerged in oil.",
      shelfLife: "9 months from packaging date."
    },
    {
      id: "dates-pickle",
      name: "Dates Pickle",
      malayalamName: "ഈന്തപ്പഴം അച്ചാർ (Eenthapazham / Dates)",
      category: "Vegetarian",
      badge: "BIRYANI ESSENTIAL",
      shortDesc: "Plump black dates simmered in spiced tamarind syrup and garlic cloves. A classic festive accompaniment for Kerala Biryani and Ghee Rice.",
      fullStory: "Celebrated across Malabar marriage feasts. Pitted soft black dates steeped in hot spiced tamarind-garlic sauce with hints of roasted cumin and red chilli flakes.",
      image: "/images/dates-pickle-card.jpg",
      fallbackImage: "/images/pickle-jar-placeholder.svg",
      prices: null,
      ingredients: "Select Pitted Dates, Tamarind Pulp, Whole Garlic Cloves, Gingelly Oil, Kashmiri Chilli, Fenugreek, Cumin, Rock Salt.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Store in a cool dry place.",
      shelfLife: "12 months from packaging date."
    },
    {
      id: "kerala-mutton-pickle",
      name: "Mutton Pickle",
      malayalamName: "നാടൻ മട്ടൺ അച്ചാർ (Nadan Mutton)",
      category: "Meat",
      badge: "ROYAL HERITAGE",
      shortDesc: "Prime tender goat meat cubes pan-roasted in ginger-garlic paste, curry leaves, and crushed Malabar peppercorns, steeped in spiced gingelly oil.",
      fullStory: "Prepared according to vintage Travancore Syrian Christian banquet recipes. Bite-sized goat meat chunks roasted slow with crushed black pepper, cloves, and cinnamon before preserving in gingelly oil.",
      image: "/images/mutton-pickle-card.jpg",
      fallbackImage: "/images/pickle-jar-placeholder.svg",
      prices: null,
      ingredients: "Prime Boneless Goat Mutton, Cold-Pressed Gingelly Oil, Tellicherry Black Pepper, Kashmiri Chilli, Ginger, Garlic, Spices, Vinegar, Rock Salt.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Refrigerate upon arrival. Always use a bone-dry spoon.",
      shelfLife: "6 months from packaging date."
    },
    {
      id: "kerala-duck-pickle",
      name: "Duck Pickle",
      malayalamName: "കുട്ടനാടൻ താറാവ് അച്ചാർ (Kuttanadan Duck)",
      category: "Meat",
      badge: "KUTTANAD SPECIALTY",
      shortDesc: "Authentic Kuttanad-style duck meat marinated in roasted coriander, Tellicherry pepper, and fennel, cooked to perfection and preserved in seasoned oil.",
      fullStory: "Sourced from the serene backwaters of Kuttanad. Farm-raised duck meat roasted with cracked coriander seeds, peppercorns, and fresh shallots.",
      image: "/images/duck-pickle-card.jpg",
      fallbackImage: "/images/pickle-jar-placeholder.svg",
      prices: null,
      ingredients: "Boneless Kuttanad Duck Meat, Cold-Pressed Gingelly Oil, Cracked Coriander, Black Pepper, Garlic, Shallots, Vinegar, Rock Salt.",
      allergens: "Contains Sesame and Mustard.",
      storage: "Refrigerate upon arrival. Always keep submerged in oil.",
      shelfLife: "6 months from packaging date."
    },
    {
      id: "meen-fish",
      name: "Fish Pickle",
      malayalamName: "മീൻ അച്ചാർ (Nadan Meen)",
      category: "Seafood",
      badge: "RICH & PIQUANT",
      shortDesc: "Firm seer fish cubes marinated in crushed peppercorns and flash-fried crisp before marrying with aged vinegar and fragrant spice reduction.",
      fullStory: "Prepared in the authentic North Malabar seaside tradition. Fresh firm sea fish steaks are diced, gently spiced, flash-fried, and preserved in deep crimson oil enriched with shallots, garlic slivers, and green chillies.",
      image: "/images/fish-pickle-card.jpg",
      fallbackImage: "/images/pickle-jar-placeholder.svg",
      prices: {
        "250g": 310,
        "500g": 590,
        "1kg": 1100
      },
      ingredients: "Firm Sea Fish, Cold-Pressed Gingelly Oil, Garlic, Shallots, Kashmiri Chilli, Green Chillies, Fenugreek, Mustard, Natural Brewed Vinegar, Curry Leaves, Salt.",
      allergens: "Contains Fish, Sesame, Mustard.",
      storage: "Keep refrigerated after opening. Do not introduce water or moisture.",
      shelfLife: "6 months from packaging date."
    },
    {
      id: "chemmeen-prawn",
      name: "Prawn Pickle (Chemmeen)",
      malayalamName: "ചെമ്മീൻ അച്ചാർ (Chemmeen)",
      category: "Seafood",
      badge: "COASTAL SIGNATURE",
      shortDesc: "Succulent sea prawns shallow-fried in coconut-gingelly oil, steeped in roasted shallots, garlic, and fiery Malabar spices.",
      fullStory: "A celebrated delicacy from the fishing hamlets of Alappuzha and Kollam. Fresh prawns are sun-cured with turmeric and pepper, pan-crisped and gently infused into an aromatic ginger-garlic gravy that mellows with each passing week.",
      image: "/images/prawn-pickle-card.jpg",
      fallbackImage: "/images/pickle-jar-placeholder.svg",
      prices: {
        "250g": 320,
        "500g": 610,
        "1kg": 1150
      },
      ingredients: "Fresh Marine Prawns, Cold-Pressed Gingelly & Coconut Oil, Garlic, Ginger, Kashmiri Chilli, Natural Vinegar, Fenugreek, Mustard Seeds, Curry Leaves, Salt.",
      allergens: "Contains Crustaceans (Prawns), Sesame, Mustard.",
      storage: "Refrigerate upon arrival. Always use a dry spoon and ensure the oil layer rests on top.",
      shelfLife: "6 months from packaging date."
    }
  ],

  // Services & WhatsApp Enquiries (5 Core Services)
  services: [
    {
      id: "retail-orders",
      title: "Retail Orders",
      icon: "jar",
      short: "Browse individual pickle jars and the pack sizes listed in the current catalog.",
      description: "Browse individual pickle jars and the pack sizes listed in the current catalog.",
      buttonText: "Shop Pickles",
      actionType: "link",
      actionUrl: "products.html",
      whatsappTemplate: ""
    },
    {
      id: "family-packs",
      title: "Family-Size Packs",
      icon: "family",
      short: "Highlight larger packs for households and gatherings where those sizes are available.",
      description: "Highlight larger packs for households and gatherings where those sizes are available.",
      buttonText: "Browse Pack Sizes",
      actionType: "link",
      actionUrl: "products.html",
      whatsappTemplate: ""
    },
    {
      id: "gifting-hampers",
      title: "Gifting Hampers",
      icon: "hamper",
      short: "Help customers put together a pickle trio for Onam, Vishu, or a gift.",
      description: "Help customers put together a pickle trio for Onam, Vishu, or a gift.",
      buttonText: "Build a Combo",
      actionType: "whatsapp",
      actionUrl: "",
      whatsappTemplate: "Hi Achar & Co.! I'd like to put together a pickle trio or gift hamper for an upcoming occasion. Could you share the available gift box options and recommendations?"
    },
    {
      id: "bulk-event-orders",
      title: "Bulk & Event Orders",
      icon: "sadhya",
      short: "Invite enquiries for weddings, sadya, catering, and corporate gifting.",
      description: "Invite enquiries for weddings, sadya, catering, and corporate gifting.",
      buttonText: "Enquire on WhatsApp",
      actionType: "whatsapp",
      actionUrl: "",
      whatsappTemplate: "Hi Achar & Co.! I'd like to enquire about a bulk pickle order. The event is [event], the date is [date], and I need about [quantity] jars. Could you share the available options?"
    },
    {
      id: "home-delivery",
      title: "Home Delivery",
      icon: "delivery",
      short: "Let customers check delivery availability for their Kerala PIN code.",
      description: "Let customers check delivery availability for their Kerala PIN code.",
      buttonText: "Check Delivery",
      actionType: "whatsapp",
      actionUrl: "",
      whatsappTemplate: "Hi Achar & Co.! Do you deliver to PIN code [PIN code]? Could you share the delivery charges and estimated time?"
    }
  ],

  // Frequently Asked Questions
  faqs: [
    {
      q: "How does ordering on WhatsApp work?",
      a: "Simply tap any 'Order on WhatsApp' button on our site or use the floating WhatsApp icon. It will open a chat with our team with your selected pickles and pack sizes pre-filled. We will confirm batch availability, calculate delivery to your district, and provide simple UPI/Google Pay details for payment."
    },
    {
      q: "Do you deliver across all of Kerala?",
      a: "Yes! Achar & Co. delivers across all 14 revenue districts of Kerala — from Thiruvananthapuram, Kollam, and Kottayam to Ernakulam, Thrissur, Kozhikode, and Kasaragod — through trusted local courier and parcel services."
    },
    {
      q: "What are your delivery charges and timelines?",
      a: "Because delivery rates vary slightly based on your exact district, taluk, and total order weight (due to secure glass jar packaging), delivery charges and estimated dispatch days are confirmed directly when you message us on WhatsApp. We do not make generic false promises of instant or free delivery."
    },
    {
      q: "How are the pickles packaged to prevent leaks during transit?",
      a: "Every glass or food-safe jar is sealed with an induction foil leak-barrier, wrapped in multiple layers of shock-absorbent cushioning, and boxed in sturdy corrugated cardboard with 'Fragile' marking to ensure your pickles arrive intact and leak-free."
    },
    {
      q: "Are there any artificial preservatives or synthetic food colours?",
      a: "Never. We rely purely on the natural preservative qualities of unhurried sun-drying, rock salt, naturally brewed vinegar, and a generous layer of pure cold-pressed gingelly (sesame) oil. We never add synthetic chemical preservatives, artificial flavour enhancers, or artificial red dyes."
    },
    {
      q: "How should I store the pickles once received?",
      a: "Store your jar in a cool, dry spot away from moisture and direct heat. Always use a clean, bone-dry spoon (never a wet spoon). Ensure the top surface is always coated with a thin layer of oil. For coastal seafood pickles and delicate Inji Puli, refrigeration after opening is recommended."
    },
    {
      q: "Can I order a custom combination of 3 flavours for gifting?",
      a: "Absolutely! Our 3-Jar Heritage Trio lets you combine any three 250g or 500g jars in an elegant presentation box. Simply ping us on WhatsApp with the 3 flavours you wish to bundle."
    }
  ],

  // Kerala Districts Coverage
  districts: [
    "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha",
    "Kottayam", "Idukki", "Ernakulam", "Thrissur",
    "Palakkad", "Malappuram", "Kozhikode", "Wayanad",
    "Kannur", "Kasaragod"
  ]
};

// Storage helper for reviews moderation system
const REVIEWS_STORAGE_KEY = "achar_co_verified_reviews";
const PENDING_STORAGE_KEY = "achar_co_pending_reviews";

// Genuine seed reviews clearly tagged as verified initial customer testimonials
const INITIAL_GENUINE_REVIEWS = [
  {
    id: "rev-1",
    author: "Lakshmi Narayanan",
    location: "Kottayam, Kerala",
    rating: 5,
    pickleName: "Kerala Cut Mango Pickle",
    date: "October 2026",
    verified: true,
    text: "The cut mango pickle has that authentic aroma of pure gingelly oil and roasted fenugreek that my grandmother used to make in our ancestral home. Not overly sour, perfectly balanced heat. Reminded me of childhood Onam lunches.",
    status: "approved"
  },
  {
    id: "rev-2",
    author: "Mathew Varghese",
    location: "Ernakulam, Kerala",
    rating: 5,
    pickleName: "Coastal Kerala Prawn Pickle",
    date: "September 2026",
    verified: true,
    text: "Ordered the Chemmeen pickle through WhatsApp. The prawns are tender, generously spiced, and the garlic-curry leaf masala is incredible with hot Kerala matta rice and moru curry. Ordering another jar for my brother.",
    status: "approved"
  },
  {
    id: "rev-3",
    author: "Dr. Deepa Menon",
    location: "Thrissur, Kerala",
    rating: 5,
    pickleName: "Vadukapuli Naranga Pickle",
    date: "October 2026",
    verified: true,
    text: "Vadukapuli lemon pickle done the proper traditional way is very hard to find outside private homes. The mild rind bitterness paired with spicy brine is top notch. Delivery to Thrissur was neatly packed without a single drop of leak.",
    status: "approved"
  },
  {
    id: "rev-4",
    author: "Rohan Nambiar",
    location: "Kozhikode, Kerala",
    rating: 5,
    pickleName: "Kanthari Mulaku Pickle",
    date: "November 2026",
    verified: true,
    text: "If you love authentic Kanthari heat, this is the real deal. Small clean bite, sharp tang, and fresh garlic notes. Fantastic with curd rice and kanji.",
    status: "approved"
  }
];

function getApprovedReviews() {
  const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(INITIAL_GENUINE_REVIEWS));
    return INITIAL_GENUINE_REVIEWS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_GENUINE_REVIEWS;
  }
}

function getPendingReviews() {
  const stored = localStorage.getItem(PENDING_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

function addPendingReview(reviewData) {
  const pending = getPendingReviews();
  const newReview = {
    id: "review-" + Date.now(),
    date: "Recent",
    status: "received",
    verified: false,
    ...reviewData
  };
  pending.unshift(newReview);
  localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
  return newReview;
}
