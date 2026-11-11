// PlantCare Plant Database & Diagnostic Data
const PLANT_DATABASE = [
  {
    id: 'monstera-deliciosa',
    name: 'Monstera Deliciosa',
    scientificName: 'Monstera deliciosa',
    category: 'Indoor',
    badge: 'Popular',
    image: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
    waterFrequencyDays: 7,
    waterAmount: 'Moderate (allow top 2" to dry)',
    light: 'Bright Indirect',
    difficulty: 'Easy',
    humidity: '60% - 80%',
    petFriendly: false,
    temperature: '18°C - 30°C',
    healthScore: 98,
    description: 'Known for its iconic split leaves and jungle aesthetic. Thrives in warm, humid spaces with filtered sunshine.',
    careTip: 'Wipe dust off leaves monthly with a damp cloth so it can photosynthesize efficiently.'
  },
  {
    id: 'snake-plant',
    name: 'Snake Plant',
    scientificName: 'Sansevieria trifasciata',
    category: 'Low Maintenance',
    badge: 'Air Purifier',
    image: 'https://images.unsplash.com/photo-1593482892290-f54927ae1eb6?auto=format&fit=crop&w=800&q=80',
    waterFrequencyDays: 14,
    waterAmount: 'Low (allow soil to completely dry)',
    light: 'Low to Bright',
    difficulty: 'Very Easy',
    humidity: '30% - 50%',
    petFriendly: false,
    temperature: '15°C - 32°C',
    healthScore: 95,
    description: 'An architectural survivor that purifies air while asking for virtually zero attention. Perfect for bedrooms.',
    careTip: 'When in doubt, don’t water! Overwatering is the only true nemesis of the snake plant.'
  },
  {
    id: 'calathea-orbifolia',
    name: 'Calathea Orbifolia',
    scientificName: 'Goeppertia orbifolia',
    category: 'Indoor',
    badge: 'Pet Friendly',
    image: 'https://images.unsplash.com/photo-1599685315640-9ceab2f58133?auto=format&fit=crop&w=800&q=80',
    waterFrequencyDays: 5,
    waterAmount: 'High (keep evenly moist)',
    light: 'Medium Filtered',
    difficulty: 'Moderate',
    humidity: '65% - 90%',
    petFriendly: true,
    temperature: '18°C - 26°C',
    healthScore: 89,
    description: 'Celebrated for its broad, metallic silver-green striped leaves that fold up rhythmically at night like prayer hands.',
    careTip: 'Use filtered or rainwater to prevent brown crispy leaf margins caused by fluoride.'
  },
  {
    id: 'peace-lily',
    name: 'Peace Lily',
    scientificName: 'Spathiphyllum wallisii',
    category: 'Flowering',
    badge: 'Air Purifier',
    image: 'https://images.unsplash.com/photo-1593691509543-c55fb32e7355?auto=format&fit=crop&w=800&q=80',
    waterFrequencyDays: 6,
    waterAmount: 'Medium (soil slightly damp)',
    light: 'Low to Medium',
    difficulty: 'Easy',
    humidity: '50% - 70%',
    petFriendly: false,
    temperature: '18°C - 27°C',
    healthScore: 92,
    description: 'Graceful glossy green foliage topped with striking white spathes. Tells you dramatically when it needs water by drooping.',
    careTip: 'If foliage wilts, submerge the pot base in lukewarm water for 15 minutes to revive instantly.'
  },
  {
    id: 'golden-pothos',
    name: 'Golden Pothos',
    scientificName: 'Epipremnum aureum',
    category: 'Low Maintenance',
    badge: 'Fast Grower',
    image: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&w=800&q=80',
    waterFrequencyDays: 7,
    waterAmount: 'Moderate (dry top inch)',
    light: 'Low to Bright',
    difficulty: 'Very Easy',
    humidity: '40% - 60%',
    petFriendly: false,
    temperature: '16°C - 30°C',
    healthScore: 97,
    description: 'Cascading vine with heart-shaped emerald leaves splashed with sunny gold streaks. Nearly impossible to kill.',
    careTip: 'Easily propagate stems in plain water bottles by cutting right below a leaf node.'
  },
  {
    id: 'fiddle-leaf-fig',
    name: 'Fiddle Leaf Fig',
    scientificName: 'Ficus lyrata',
    category: 'Indoor',
    badge: 'Showstopper',
    image: 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=800&q=80',
    waterFrequencyDays: 8,
    waterAmount: 'Moderate (thorough soak)',
    light: 'Bright Direct/Indirect',
    difficulty: 'Moderate',
    humidity: '50% - 70%',
    petFriendly: false,
    temperature: '18°C - 28°C',
    healthScore: 88,
    description: 'Dramatic violin-shaped leaves create a statuesque focal point for bright, sunny interior spaces.',
    careTip: 'Avoid cold air drafts from AC units or moving its spot repeatedly once it settles.'
  },
  {
    id: 'sweet-basil',
    name: 'Sweet Italian Basil',
    scientificName: 'Ocimum basilicum',
    category: 'Herbs',
    badge: 'Edible',
    image: 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?auto=format&fit=crop&w=800&q=80',
    waterFrequencyDays: 3,
    waterAmount: 'High (soil moist)',
    light: 'Full Sun (6+ hrs)',
    difficulty: 'Easy',
    humidity: '40% - 60%',
    petFriendly: true,
    temperature: '20°C - 32°C',
    healthScore: 94,
    description: 'A fragrant culinary staple packed with essential oils. Grows rapidly on kitchen windowsills and patio planters.',
    careTip: 'Pinch off white flower buds as soon as they appear to direct energy into sweet, lush leaves.'
  },
  {
    id: 'aloe-vera',
    name: 'Medicinal Aloe Vera',
    scientificName: 'Aloe barbadensis',
    category: 'Succulent',
    badge: 'Healing',
    image: 'https://images.unsplash.com/photo-1567689265664-1c48de61db0b?auto=format&fit=crop&w=800&q=80',
    waterFrequencyDays: 18,
    waterAmount: 'Sparse (drench & soak)',
    light: 'Direct Sunlight',
    difficulty: 'Very Easy',
    humidity: '20% - 40%',
    petFriendly: false,
    temperature: '15°C - 35°C',
    healthScore: 96,
    description: 'Fleshy serrated leaves filled with cool soothing gel traditionally used for skin hydration and mild sunburn relief.',
    careTip: 'Use a terracotta clay pot with cactus potting grit to ensure rapid drainage.'
  },
  {
    id: 'boston-fern',
    name: 'Boston Fern',
    scientificName: 'Nephrolepis exaltata',
    category: 'Indoor',
    badge: 'Pet Friendly',
    image: 'https://images.unsplash.com/photo-1598880940080-ff9a29891b85?auto=format&fit=crop&w=800&q=80',
    waterFrequencyDays: 4,
    waterAmount: 'High (keep moist)',
    light: 'Dappled Indirect',
    difficulty: 'Moderate',
    humidity: '70% - 90%',
    petFriendly: true,
    temperature: '16°C - 24°C',
    healthScore: 90,
    description: 'Feathery arching fronds that produce an enchanting woodland aura. An ideal moisture-loving resident for bright bathrooms.',
    careTip: 'Mist daily or hang over a pebble tray filled with water to keep fronds vibrant.'
  }
];

// Sample photo scan presets for interactive AI diagnosis demo
const SCAN_SAMPLES = [
  {
    id: 'sample-healthy-monstera',
    title: 'Healthy Monstera Deliciosa',
    image: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
    plantName: 'Monstera Deliciosa (Swiss Cheese Plant)',
    confidence: '99.4%',
    healthStatus: 'Optimal & Thriving 🌿',
    healthScore: 97,
    diagnosis: 'No active fungal, parasitic or nutritional diseases detected. Fenestrations indicate mature, healthy chlorophyll generation.',
    symptoms: 'Vibrant deep emerald pigmentation, sturdy petiole structure, no sign of spider mites or thrips.',
    qwenAdvice: [
      'Maintain weekly hydration routine; test upper soil with your finger before watering.',
      'Provide a moss totem pole to encourage larger, fenestrated aerial root climbing.',
      'Feed with a balanced 10-10-10 diluted organic liquid fertilizer once a month during active spring/summer growth.'
    ]
  },
  {
    id: 'sample-yellow-pothos',
    title: 'Yellowing Leaf Warning',
    image: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&w=800&q=80',
    plantName: 'Epipremnum aureum (Golden Pothos)',
    confidence: '97.8%',
    healthStatus: 'Early Stage Overwatering Stress ⚠️',
    healthScore: 68,
    diagnosis: 'Chlorosis detected in lower basal foliage caused by root oxygen deprivation due to stagnant potting medium.',
    symptoms: 'Soft yellowing lower leaves, sluggish drainage, soil surface retains moisture past 9 days.',
    qwenAdvice: [
      'Cease watering immediately for 8-10 days until the root zone aeration recovers.',
      'Check if nursery nursery pot drainage holes are plugged; ensure saucer never holds standing water.',
      'Snip fully yellowed foliage cleanly at the node to redirect energy into healthy shoot growth.'
    ]
  },
  {
    id: 'sample-thirsty-fern',
    title: 'Dehydrated Boston Fern',
    image: 'https://images.unsplash.com/photo-1598880940080-ff9a29891b85?auto=format&fit=crop&w=800&q=80',
    plantName: 'Nephrolepis exaltata (Boston Fern)',
    confidence: '96.2%',
    healthStatus: 'Moisture Deficit & Low Humidity 💧',
    healthScore: 71,
    diagnosis: 'Crispy frond tips and subtle grayish dulling caused by dry indoor air (<35% RH) and delayed bottom-watering.',
    symptoms: 'Brittle leaflet shedding, curling frond margins, lightweight dry root-ball.',
    qwenAdvice: [
      'Give it a deep bottom-watering bath: submerge the pot in a basin of water for 25 minutes.',
      'Relocate to a high humidity room (e.g. bathroom) or place on a pebble humidity tray.',
      'Lightly trim brown papery frond tips with sterilized shears.'
    ]
  },
  {
    id: 'sample-succulent',
    title: 'Haworthia / Succulent Sun Check',
    image: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=800&q=80',
    plantName: 'Haworthia Fasciata (Zebra Plant)',
    confidence: '98.9%',
    healthStatus: 'Excellent Compact Rosette ☀️',
    healthScore: 94,
    diagnosis: 'Compact rosette structure indicates adequate light exposure without UV sunburn stress.',
    symptoms: 'Turgid white raised tubercles, firm leaves, zero signs of etiolation (stretching).',
    qwenAdvice: [
      'Water only when soil is 100% bone dry to the bottom of the pot (every 2-3 weeks).',
      'Ensure bright morning light exposure with partial afternoon shade to avoid red stress shading.',
      'Repot every 2 years using 60% perlite / pumice coarse drainage mixture.'
    ]
  }
];

// Initial mock user garden state
const INITIAL_MY_GARDEN = [
  {
    id: 'mg-1',
    plantId: 'monstera-deliciosa',
    nickname: 'Monty the Monstera',
    plantName: 'Monstera Deliciosa',
    image: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
    location: 'Living Room Bay Window',
    daysUntilWater: 1,
    lastWatered: '6 days ago',
    healthScore: 96,
    streakDays: 24,
    needsWaterToday: true
  },
  {
    id: 'mg-2',
    plantId: 'snake-plant',
    nickname: 'Viper Sentinel',
    plantName: 'Snake Plant',
    image: 'https://images.unsplash.com/photo-1593482892290-f54927ae1eb6?auto=format&fit=crop&w=800&q=80',
    location: 'Study Bookshelf',
    daysUntilWater: 8,
    lastWatered: '6 days ago',
    healthScore: 99,
    streakDays: 41,
    needsWaterToday: false
  },
  {
    id: 'mg-3',
    plantId: 'golden-pothos',
    nickname: 'Golden Cascade',
    plantName: 'Golden Pothos',
    image: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&w=800&q=80',
    location: 'Kitchen Hanging Basket',
    daysUntilWater: 3,
    lastWatered: '4 days ago',
    healthScore: 91,
    streakDays: 18,
    needsWaterToday: false
  }
];

// Pre-packaged Qwen AI Knowledge Responses
const QWEN_KNOWLEDGE_BASE = [
  {
    keywords: ['yellow', 'yellowing', 'pale leaves'],
    reply: `**PlantCare AI (Qwen Botanist)**: 🌿 Yellowing leaves (*chlorosis*) is the most frequent distress signal from garden and indoor plants. Here is my diagnostic breakdown:

1. **Overwatering (80% probability)**: Check the soil 2 inches down. If it feels soggy or mud-like, the roots cannot breathe. Allow soil to dry and empty water collected in saucers.
2. **Nutrient Depletion**: If old lower leaves turn pale yellow while leaf veins remain dark green, your plant likely has nitrogen or magnesium deficiency.
3. **Lighting Shock**: Moving a shade-tolerant plant into direct scorching midday rays causes bleached yellow patches.

💡 *Quick Action*: Pause watering for 5 days, inspect pot drainage holes, and trim heavily yellowed leaves at the stem.`
  },
  {
    keywords: ['water', 'watering', 'how often', 'schedule', 'thirsty'],
    reply: `**PlantCare AI (Qwen Botanist)**: 💧 Rather than a rigid calendar, plants drink based on temperature, light, and humidity! Here is the golden rule:

- **The Finger Moisture Test**: Insert your index finger 1.5–2 inches into the soil.
  - *Dry & powdery?* Give it a thorough, deep watering until water drips out the bottom.
  - *Cool & damp?* Hold off for 2–4 more days!
- **Seasonal Cycle**: Plants drink almost twice as much water during sunny spring/summer compared to winter rest periods.
- **Top tip**: Always discard excess standing water from the drip tray after 15 minutes to prevent fungal root rot.`
  },
  {
    keywords: ['pothos', 'propagate', 'cutting', 'water propagation'],
    reply: `**PlantCare AI (Qwen Botanist)**: 🌱 Propagating Pothos is amazingly fun and has a 95%+ success rate:

1. Locate a healthy vine with at least 3-4 leaves.
2. Look for the little brown bumps along the vine called **nodes**.
3. Using clean scissors, cut 1/4 inch below a node.
4. Remove the lowest leaf so only bare stem sits underwater.
5. Place the cutting in a glass vase of clean water on a bright, warm windowsill.
6. Refresh the water every 5 days. You will see fresh white roots emerge in 10–14 days!`
  },
  {
    keywords: ['bugs', 'pest', 'mites', 'gnats', 'whitefly', 'insects'],
    reply: `**PlantCare AI (Qwen Botanist)**: 🛡️ Garden pests can be treated organically without harsh toxins:

- **Fungus Gnats (tiny flies on soil)**: Let the top 2 inches of soil dry out completely. Sprinkle ground cinnamon on the topsoil or water with a 1:4 mix of 3% hydrogen peroxide and water.
- **Spider Mites (fine webbing under leaves)**: Spray leaves thoroughly with diluted neem oil and castile soap solution once every 4 days.
- **Scale / Mealybugs (white cottony fluff)**: Dab pests directly with a Q-tip soaked in 70% rubbing alcohol.`
  },
  {
    keywords: ['fertilizer', 'feed', 'food', 'nutrients'],
    reply: `**PlantCare AI (Qwen Botanist)**: 🍃 Plant nutrition guidelines:

- Feed only during **Spring and Summer** (active growing season).
- Always dilute liquid fertilizer to **half-strength** of the package instructions; gentle feeding prevents root salt burn!
- Never fertilize a bone-dry plant — always water lightly first, then apply fertilizer solution.`
  }
];

