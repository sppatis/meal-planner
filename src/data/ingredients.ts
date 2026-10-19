import type { Aisle, Ingredient, Nutrition, Unit } from "@/lib/types";

/** kcal, protein, carbs, fat, fibre */
const n = (kcal: number, protein: number, carbs: number, fat: number, fibre = 0): Nutrition => ({
  kcal,
  protein,
  carbs,
  fat,
  fibre,
});

type Extra = Partial<Pick<Ingredient, "staple" | "each" | "allergens" | "checkLabel" | "packNoun">>;

function ing(
  id: string,
  name: string,
  unit: Unit,
  packSize: number,
  packPrice: number,
  packLabel: string,
  aisle: Aisle,
  per: Nutrition,
  extra: Extra = {},
): Ingredient {
  return { id, name, unit, packSize, packPrice, packLabel, aisle, per, ...extra };
}

const MEAT: Aisle = "Meat & poultry";
const VEG: Aisle = "Fruit & veg";
const DAIRY: Aisle = "Dairy & eggs";
const BAKERY: Aisle = "Bakery";
const FROZEN: Aisle = "Frozen";
const TINS: Aisle = "Tins & jars";
const CUPBOARD: Aisle = "Cupboard";

/**
 * Estimated Tesco prices (autumn 2026). They can be overridden on the Prices page.
 * Nutrition is per 100g/100ml for g/ml units, and per item/spoon otherwise.
 */
const list: Ingredient[] = [
  // Meat & poultry
  ing("chicken-breast", "Chicken breast fillets", "g", 1000, 6.0, "1kg", MEAT, n(106, 24, 0, 1.1)),
  ing("chicken-thigh", "Skinless boneless chicken thigh fillets", "g", 1000, 4.75, "1kg", MEAT, n(145, 19, 0, 7.6)),
  ing("beef-mince", "5% fat beef mince", "g", 500, 3.25, "500g", MEAT, n(124, 21, 0, 4.5)),
  ing("turkey-mince", "2% fat turkey breast mince", "g", 500, 3.25, "500g", MEAT, n(105, 23, 0, 1.5)),
  ing("pork-mince", "5% fat pork mince", "g", 500, 2.75, "500g", MEAT, n(128, 21, 0, 5)),
  ing("pork-loin", "Lean pork loin steaks", "g", 450, 3.6, "4 pack, 450g", MEAT, n(122, 22, 0, 4)),
  ing("beef-strips", "Lean beef stir-fry strips", "g", 400, 4.2, "400g", MEAT, n(120, 22, 0, 3.5)),
  ing("bacon-medallions", "Smoked bacon medallions", "g", 300, 2.7, "300g", MEAT, n(115, 21, 0.5, 3.5)),
  ing("sausages", "Reduced fat pork sausages", "each", 8, 2.2, "8 pack, 454g", MEAT, n(94, 8, 4, 5, 0.5), {
    each: "reduced fat sausage",
  }),
  ing("chorizo", "Chorizo ring", "g", 200, 2.2, "200g", MEAT, n(410, 24, 2, 34)),
  ing("ham", "Cooked ham slices", "g", 125, 1.25, "125g", MEAT, n(107, 20, 1, 2.5)),
  ing("quorn-mince", "Quorn mince", "g", 300, 2.5, "300g", FROZEN, n(105, 14.5, 4.5, 2, 5.5)),

  // Dairy & eggs
  ing("eggs", "Free range medium eggs", "each", 12, 3.2, "12 pack", DAIRY, n(76, 7.3, 0, 5.2), { each: "egg" }),
  ing("halloumi-light", "Light halloumi", "g", 225, 2.5, "225g", DAIRY, n(245, 25, 1.5, 15)),
  ing("paneer", "Paneer", "g", 226, 2.2, "226g", DAIRY, n(321, 18, 3, 26)),
  ing("milk", "Skimmed milk", "ml", 1136, 1.25, "2 pints", DAIRY, n(35, 3.5, 5, 0.1)),
  ing("cream-cheese-light", "Lighter soft cheese", "g", 180, 1.05, "180g", DAIRY, n(145, 7.3, 3.9, 11, 0.4)),
  ing("creme-fraiche-light", "Half fat crème fraîche", "ml", 300, 1.2, "300ml", DAIRY, n(162, 2.7, 4, 15)),
  ing("greek-yogurt", "Fat free Greek style yogurt", "g", 500, 1.4, "500g", DAIRY, n(55, 10, 3.6, 0.2)),
  ing("cheddar-light", "Lighter mature cheddar", "g", 350, 3.25, "350g", DAIRY, n(314, 27, 0.1, 22)),
  ing("mozzarella-light", "Light mozzarella", "g", 125, 0.95, "125g", DAIRY, n(165, 18, 1, 10)),
  ing("grana-padano", "Grated Grana Padano", "g", 100, 2.0, "100g", DAIRY, n(398, 33, 0, 29)),
  ing("feta-light", "Light Greek style salad cheese", "g", 200, 1.25, "200g", DAIRY, n(180, 17, 1, 12)),

  // Fruit & veg
  ing("onion", "Brown onion", "each", 7, 0.89, "1kg bag (about 7)", VEG, n(54, 1.7, 11, 0.3, 2), { each: "onion" }),
  ing("red-onion", "Red onion", "each", 3, 0.75, "3 pack", VEG, n(54, 1.7, 11, 0.3, 2), { each: "red onion" }),
  ing("garlic", "Garlic", "each", 40, 1.0, "4 bulbs (about 40 cloves)", VEG, n(4, 0.2, 1, 0, 0.1), {
    each: "garlic clove",
  }),
  ing("pepper", "Mixed peppers", "each", 3, 1.65, "3 pack", VEG, n(42, 1.4, 8, 0.4, 2.6), { each: "pepper" }),
  ing("carrot", "Carrots", "g", 1000, 0.59, "1kg", VEG, n(41, 0.6, 7.9, 0.3, 2.8)),
  ing("broccoli", "Broccoli", "g", 350, 0.79, "350g", VEG, n(34, 3.5, 3, 0.6, 2.6)),
  ing("mushrooms", "Closed cup mushrooms", "g", 300, 0.95, "300g", VEG, n(18, 2.5, 0.4, 0.5, 1.1)),
  ing("courgette", "Courgette", "each", 3, 1.25, "3 pack", VEG, n(36, 2.6, 4, 0.8, 2), { each: "courgette" }),
  ing("spinach", "Baby spinach", "g", 240, 1.2, "240g", VEG, n(25, 2.8, 1.6, 0.8, 2.1)),
  ing("cherry-tomatoes", "Cherry tomatoes", "g", 250, 0.95, "250g", VEG, n(20, 0.9, 3.1, 0.3, 1.2)),
  ing("tomato", "Salad tomatoes", "each", 6, 0.75, "6 pack", VEG, n(15, 0.7, 2.6, 0.2, 1), { each: "tomato" }),
  ing("cucumber", "Cucumber", "each", 1, 0.75, "each", VEG, n(36, 2, 4.5, 0.3, 1.8), { each: "cucumber" }),
  ing("little-gem", "Little gem lettuce", "each", 2, 0.8, "2 pack", VEG, n(14, 0.9, 1.6, 0.2, 1), {
    each: "little gem lettuce",
  }),
  ing("salad-leaves", "Mixed salad leaves", "g", 120, 0.85, "120g", VEG, n(18, 1.4, 2, 0.4, 1.5)),
  ing("spring-onion", "Spring onions", "each", 8, 0.59, "bunch (about 8)", VEG, n(4, 0.2, 0.8, 0, 0.3), {
    each: "spring onion",
  }),
  ing("lemon", "Lemons", "each", 4, 1.2, "4 pack", VEG, n(10, 0.3, 1.5, 0.1, 1), { each: "lemon" }),
  ing("lime", "Limes", "each", 4, 1.0, "4 pack", VEG, n(8, 0.2, 1.2, 0, 0.8), { each: "lime" }),
  ing("coriander", "Fresh coriander", "g", 30, 0.75, "30g", VEG, n(23, 2.1, 0.9, 0.5, 2.8)),
  ing("parsley", "Fresh flat leaf parsley", "g", 30, 0.75, "30g", VEG, n(36, 3, 6, 0.8, 3.3)),
  ing("ginger", "Fresh root ginger", "g", 100, 0.55, "100g", VEG, n(80, 1.8, 17.8, 0.8, 2)),
  ing("red-chilli", "Red chillies", "each", 4, 0.55, "4 pack", VEG, n(4, 0.2, 0.8, 0, 0.3), { each: "red chilli" }),
  ing("potatoes", "White potatoes", "g", 2500, 1.5, "2.5kg", VEG, n(75, 2, 17, 0.1, 1.5)),
  ing("baking-potato", "Baking potatoes", "each", 4, 1.2, "4 pack", VEG, n(210, 5.6, 47, 0.3, 4), {
    each: "baking potato",
  }),
  ing("new-potatoes", "Baby new potatoes", "g", 1000, 1.1, "1kg", VEG, n(70, 1.6, 15, 0.3, 1.3)),
  ing("sweet-potato", "Sweet potatoes", "g", 1000, 1.25, "1kg", VEG, n(86, 1.6, 20, 0.1, 3)),
  ing("leek", "Leeks", "each", 3, 1.25, "3 pack", VEG, n(33, 2.4, 4.4, 0.8, 3), { each: "leek" }),
  ing("celery", "Celery", "each", 10, 0.65, "head (about 10 sticks)", VEG, n(3, 0.2, 0.4, 0, 0.6), {
    each: "celery stick",
  }),
  ing("green-beans", "Fine green beans", "g", 220, 1.1, "220g", VEG, n(25, 1.9, 3.2, 0.5, 2.7)),
  ing("cabbage", "White cabbage", "g", 900, 0.8, "each (about 900g)", VEG, n(27, 1.2, 4.6, 0.2, 2.4)),
  ing("stir-fry-veg", "Vegetable stir fry", "g", 300, 1.1, "300g", VEG, n(32, 1.8, 4.5, 0.4, 2.2)),

  // Frozen
  ing("peas", "Frozen garden peas", "g", 1000, 1.25, "1kg", FROZEN, n(66, 6, 9, 0.9, 5), { staple: true }),

  // Tins & jars
  ing("chopped-tomatoes", "Chopped tomatoes", "g", 400, 0.45, "400g tin", TINS, n(21, 1.1, 3.5, 0.2, 0.9), {
    packNoun: "tin",
  }),
  ing("passata", "Passata", "g", 500, 0.55, "500g", TINS, n(30, 1.4, 5, 0.1, 1), { packNoun: "carton" }),
  ing("kidney-beans", "Red kidney beans (drained)", "g", 240, 0.45, "400g tin", TINS, n(100, 7, 13, 0.5, 6.2), {
    packNoun: "tin",
  }),
  ing("black-beans", "Black beans (drained)", "g", 240, 0.75, "400g tin", TINS, n(110, 7.5, 14, 0.5, 6.5), {
    packNoun: "tin",
  }),
  ing("chickpeas", "Chickpeas (drained)", "g", 240, 0.5, "400g tin", TINS, n(121, 7.6, 13.5, 2.4, 5.1), {
    packNoun: "tin",
  }),
  ing("butter-beans", "Butter beans (drained)", "g", 235, 0.55, "400g tin", TINS, n(77, 5.8, 10.4, 0.5, 4.6), {
    packNoun: "tin",
  }),
  ing("sweetcorn", "Sweetcorn (drained)", "g", 260, 0.7, "326g tin", TINS, n(80, 2.9, 14, 1.2, 2.6), {
    packNoun: "tin",
  }),
  ing("pineapple", "Pineapple chunks in juice", "g", 432, 0.85, "432g tin", TINS, n(55, 0.4, 13, 0.1, 0.8), {
    packNoun: "tin",
  }),
  ing("tomato-puree", "Tomato purée", "tbsp", 13, 0.85, "200g tube", TINS, n(15, 0.7, 2.5, 0, 0.5), { staple: true }),

  // Cupboard: carbs
  ing("basmati", "Basmati rice", "g", 1000, 2.25, "1kg", CUPBOARD, n(355, 8, 78, 0.9, 1.5), { staple: true }),
  ing("microwave-rice", "Microwave basmati rice", "each", 1, 0.95, "250g pouch", CUPBOARD, n(375, 8.8, 77, 3.8, 2), {
    each: "microwave rice pouch (250g)",
  }),
  ing("arborio", "Risotto rice", "g", 500, 1.4, "500g", CUPBOARD, n(350, 7, 78, 0.6, 1), { staple: true }),
  ing("penne", "Penne pasta", "g", 500, 0.75, "500g", CUPBOARD, n(357, 12.5, 72, 1.6, 3), { staple: true }),
  ing("spaghetti", "Spaghetti", "g", 500, 0.75, "500g", CUPBOARD, n(357, 12.5, 72, 1.6, 3), { staple: true }),
  ing("fusilli", "Fusilli pasta", "g", 500, 0.75, "500g", CUPBOARD, n(357, 12.5, 72, 1.6, 3), { staple: true }),
  ing("orzo", "Orzo pasta", "g", 500, 1.0, "500g", CUPBOARD, n(357, 12.5, 72, 1.6, 3), { staple: true }),
  ing("lasagne-sheets", "Lasagne sheets", "g", 250, 0.8, "250g", CUPBOARD, n(357, 12.5, 72, 1.6, 3), { staple: true }),
  ing("egg-noodles", "Medium egg noodles", "g", 250, 0.95, "250g", CUPBOARD, n(360, 12.6, 68, 2.4, 3.5), {
    staple: true,
  }),
  ing("couscous", "Couscous", "g", 500, 0.85, "500g", CUPBOARD, n(358, 13, 70, 1.6, 4.5), { staple: true }),
  ing("red-lentils", "Red split lentils", "g", 500, 1.35, "500g", CUPBOARD, n(330, 24, 50, 1.5, 10), { staple: true }),
  ing("plain-flour", "Plain flour", "g", 1500, 0.75, "1.5kg", CUPBOARD, n(341, 10, 72, 1.4, 3.1), { staple: true }),
  ing("cornflour", "Cornflour", "g", 500, 1.0, "500g", CUPBOARD, n(354, 0.6, 88, 0.1), { staple: true }),
  ing("panko", "Panko breadcrumbs", "g", 200, 1.3, "200g", CUPBOARD, n(370, 12, 74, 2.5, 3), { staple: true }),
  ing("cornflakes", "Cornflakes", "g", 500, 0.89, "500g", CUPBOARD, n(378, 7, 84, 0.9, 3), { staple: true }),

  // Bakery
  ing("wraps", "Wholemeal tortilla wraps", "each", 8, 1.25, "8 pack", BAKERY, n(180, 5.5, 28, 3.5, 3.5), {
    each: "wholemeal wrap",
  }),
  ing("pitta", "Wholemeal pittas", "each", 6, 0.8, "6 pack", BAKERY, n(150, 6, 27, 1, 3.5), { each: "wholemeal pitta" }),
  ing("burger-buns", "Burger buns", "each", 6, 0.85, "6 pack", BAKERY, n(150, 5, 27, 2.5, 1.5), { each: "burger bun" }),
  ing("mini-naan", "Plain mini naans", "each", 4, 1.0, "4 pack", BAKERY, n(180, 5.5, 31, 3.5, 1.5), {
    each: "mini naan",
  }),
  ing("pizza-base", "Stonebaked pizza bases", "each", 2, 1.2, "2 pack", BAKERY, n(400, 12.5, 78, 4, 3.5), {
    each: "pizza base",
  }),
  ing("baguette", "Part-baked baguettes", "each", 2, 0.75, "2 pack", BAKERY, n(375, 12, 75, 2, 3.5), {
    each: "part-baked baguette",
  }),

  // Cupboard: stock, sauces, oils
  ing("chicken-stock", "Chicken stock cubes", "each", 12, 0.65, "12 pack", CUPBOARD, n(15, 0.5, 1.6, 0.6), {
    staple: true,
    each: "chicken stock cube",
  }),
  ing("veg-stock", "Vegetable stock cubes", "each", 12, 0.65, "12 pack", CUPBOARD, n(12, 0.3, 1.6, 0.5), {
    staple: true,
    each: "vegetable stock cube",
  }),
  ing("beef-stock", "Beef stock cubes", "each", 12, 0.65, "12 pack", CUPBOARD, n(15, 0.6, 1.6, 0.6), {
    staple: true,
    each: "beef stock cube",
  }),
  ing("gravy-granules", "Gravy granules", "tsp", 60, 1.0, "170g", CUPBOARD, n(14, 0.1, 1.9, 0.7), {
    staple: true,
    checkLabel: "A few gravy brands include fish-derived ingredients. Check the label.",
  }),
  ing("soy-sauce", "Light soy sauce", "tbsp", 10, 1.0, "150ml", CUPBOARD, n(8, 1.1, 0.7, 0), { staple: true }),
  ing("honey", "Clear honey", "tbsp", 16, 1.2, "340g", CUPBOARD, n(64, 0, 17, 0), { staple: true }),
  ing("sweet-chilli", "Sweet chilli sauce", "tbsp", 19, 1.1, "290ml", CUPBOARD, n(35, 0, 8.5, 0), {
    staple: true,
    checkLabel: "Some sweet chilli sauces contain fish sauce. Check the label.",
  }),
  ing("ketchup", "Reduced sugar tomato ketchup", "tbsp", 37, 1.5, "560g", CUPBOARD, n(11, 0.2, 2.3, 0), {
    staple: true,
  }),
  ing("bbq-sauce", "Smoky BBQ sauce", "tbsp", 24, 1.2, "480g", CUPBOARD, n(30, 0.2, 7, 0), {
    staple: true,
    checkLabel: "Some BBQ sauces contain Worcestershire sauce (anchovies). Check the label.",
  }),
  ing("dijon", "Dijon mustard", "tsp", 35, 0.85, "185g", CUPBOARD, n(8, 0.4, 0.3, 0.6), { staple: true }),
  ing("light-mayo", "Light mayonnaise", "tbsp", 28, 1.4, "430ml", CUPBOARD, n(40, 0.1, 1, 4), { staple: true }),
  ing("balsamic", "Balsamic vinegar", "tbsp", 16, 0.95, "250ml", CUPBOARD, n(14, 0, 3, 0), { staple: true }),
  ing("white-wine-vinegar", "White wine vinegar", "tbsp", 23, 0.5, "350ml", CUPBOARD, n(3, 0, 0.1, 0), {
    staple: true,
  }),
  ing("olive-oil", "Olive oil", "tbsp", 33, 4.5, "500ml", CUPBOARD, n(120, 0, 0, 13.5), { staple: true }),
  ing("spray-oil", "1 cal sunflower oil spray", "each", 300, 1.3, "190ml", CUPBOARD, n(1, 0, 0, 0.1), {
    staple: true,
    each: "spray of oil",
  }),

  // Cupboard: herbs and spices (per teaspoon)
  ing("curry-powder", "Medium curry powder", "tsp", 30, 0.95, "90g", CUPBOARD, n(10, 0.4, 1, 0.4), { staple: true }),
  ing("garam-masala", "Garam masala", "tsp", 20, 0.95, "50g", CUPBOARD, n(8, 0.3, 1, 0.3), { staple: true }),
  ing("cumin", "Ground cumin", "tsp", 20, 0.85, "45g", CUPBOARD, n(8, 0.4, 0.9, 0.5), { staple: true }),
  ing("ground-coriander", "Ground coriander", "tsp", 20, 0.85, "38g", CUPBOARD, n(6, 0.2, 1, 0.3), { staple: true }),
  ing("turmeric", "Ground turmeric", "tsp", 20, 0.85, "48g", CUPBOARD, n(8, 0.2, 1.4, 0.2), { staple: true }),
  ing("smoked-paprika", "Smoked paprika", "tsp", 20, 0.95, "42g", CUPBOARD, n(6, 0.3, 1.1, 0.3), { staple: true }),
  ing("chilli-powder", "Chilli powder", "tsp", 20, 0.85, "45g", CUPBOARD, n(8, 0.3, 1.4, 0.4), { staple: true }),
  ing("chilli-flakes", "Chilli flakes", "tsp", 20, 0.85, "30g", CUPBOARD, n(6, 0.2, 1, 0.3), { staple: true }),
  ing("oregano", "Dried oregano", "tsp", 30, 0.85, "14g", CUPBOARD, n(3, 0.1, 0.7, 0.1), { staple: true }),
  ing("mixed-herbs", "Dried mixed herbs", "tsp", 30, 0.85, "13g", CUPBOARD, n(3, 0.1, 0.6, 0.1), { staple: true }),
  ing("five-spice", "Chinese five spice", "tsp", 20, 0.95, "42g", CUPBOARD, n(7, 0.2, 1.4, 0.2), { staple: true }),
  ing("garlic-granules", "Garlic granules", "tsp", 25, 0.95, "48g", CUPBOARD, n(10, 0.5, 2, 0), { staple: true }),
  ing("cinnamon", "Ground cinnamon", "tsp", 20, 0.85, "38g", CUPBOARD, n(6, 0.1, 1.9, 0), { staple: true }),
];

export const INGREDIENTS: Record<string, Ingredient> = Object.fromEntries(list.map((i) => [i.id, i]));

export const INGREDIENT_LIST = list;
